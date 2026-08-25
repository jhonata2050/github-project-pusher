import { createFileRoute } from '@tanstack/react-router';
import { createClient } from '@supabase/supabase-js';
import path from 'path';
import fs from 'fs/promises';
import fsSync from 'fs';
import { resolveClientRoot, validateSafePath, verifyAppAuthorization } from '@/lib/file-manager/security';
import { auditLogOperation } from '@/lib/file-manager/filesystem';
import { syncAppFilesToCoolify } from '@/lib/file-manager/server';

function decodeJwtPayload(token: string): any {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const base64Url = parts[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch {
    return null;
  }
}

export const Route = createFileRoute('/api/file-manager/upload')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          let token = '';
          const authHeader = request.headers.get('authorization');
          if (authHeader?.startsWith('Bearer ')) {
            token = authHeader.replace('Bearer ', '').trim();
          } else {
            const cookieHeader = request.headers.get('cookie') || '';
            const match = cookieHeader.match(/sb-[^=]+-auth-token=([^;]+)/);
            if (match) {
              try {
                const cookieVal = decodeURIComponent(match[1]);
                if (cookieVal.startsWith('base64-')) {
                  const json = Buffer.from(cookieVal.slice(7), 'base64').toString();
                  const parsed = JSON.parse(json);
                  token = parsed.access_token || parsed[0];
                } else {
                  const parsed = JSON.parse(cookieVal);
                  token = parsed.access_token || parsed[0];
                }
              } catch (e) {}
            }
          }

          if (!token) {
            return new Response(JSON.stringify({ error: 'Não autorizado. Faça login novamente.' }), {
              status: 401,
              headers: { 'Content-Type': 'application/json' },
            });
          }

          const decoded = decodeJwtPayload(token);
          const userId = decoded?.sub;
          if (!userId) {
            return new Response(JSON.stringify({ error: 'Token inválido.' }), {
              status: 401,
              headers: { 'Content-Type': 'application/json' },
            });
          }

          const formData = await request.formData();
          const appId = formData.get('appId') as string;
          const targetDir = (formData.get('targetDir') as string) || '';
          const file = formData.get('file') as File | null;

          if (!appId || !file) {
            return new Response(JSON.stringify({ error: 'Dados incompletos (appId e file são obrigatórios).' }), {
              status: 400,
              headers: { 'Content-Type': 'application/json' },
            });
          }

          // Verificar permissões
          await verifyAppAuthorization(appId, userId);
          const clientRoot = await resolveClientRoot(appId);

          const fileName = file.name.replace(/^[\/\\]+/, '');
          const relativeTarget = targetDir ? `${targetDir}/${fileName}` : fileName;
          const fullPath = await validateSafePath(clientRoot, relativeTarget);

          const parentDir = path.dirname(fullPath);
          if (!fsSync.existsSync(parentDir)) {
            await fs.mkdir(parentDir, { recursive: true });
          }

          const arrayBuffer = await file.arrayBuffer();
          const buffer = Buffer.from(arrayBuffer);
          await fs.writeFile(fullPath, buffer);

          const stat = await fs.stat(fullPath);

          await auditLogOperation(userId, appId, 'UPLOAD', {
            targetDir,
            fileName,
            sizeBytes: stat.size,
          });

          // Sincronização em segundo plano com o container Caddy
          syncAppFilesToCoolify(appId).catch((err) => {
            console.warn('[Coolify Auto-Sync Warning]:', err.message);
          });

          return new Response(
            JSON.stringify({
              success: true,
              name: fileName,
              path: relativeTarget,
              sizeBytes: stat.size,
            }),
            {
              status: 200,
              headers: { 'Content-Type': 'application/json' },
            }
          );
        } catch (error: any) {
          console.error('[API File Upload Error]:', error);
          return new Response(JSON.stringify({ error: error.message || 'Erro ao processar upload.' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
          });
        }
      },
    },
  },
});
