import { createFileRoute } from '@tanstack/react-router';
import { createClient } from '@supabase/supabase-js';
import path from 'path';
import fs from 'fs/promises';
import fsSync from 'fs';
import { resolveClientRoot, validateSafePath, verifyAppAuthorization, extractAndVerifyUser } from '@/lib/file-manager/security';
import { auditLogOperation } from '@/lib/file-manager/filesystem';
import { syncAppFilesToContainer, verifyAppDiskQuota } from '@/lib/file-manager/server';

export const Route = createFileRoute('/api/file-manager/upload')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          // 1. Validação criptográfica da sessão do usuário
          const userId = await extractAndVerifyUser(request);

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

          // Verificar permissões e cota de disco do plano
          await verifyAppAuthorization(appId, userId);
          await verifyAppDiskQuota(appId, file.size, userId);
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
          const autoExtract = formData.get('autoExtract') === 'true' || formData.get('extract') === 'true';

          if (autoExtract && (fileName.endsWith('.zip') || file.type.includes('zip'))) {
            const { uploadCloudApplicationZip } = await import('@/lib/cloud-apps.server');
            const result = await uploadCloudApplicationZip(appId, fileName, buffer.toString('base64'), true, userId);
            await auditLogOperation(userId, appId, 'UPLOAD_AND_EXTRACT', {
              fileName,
              sizeBytes: buffer.length,
              extractedCount: result.extractedCount,
            });
            return new Response(
              JSON.stringify({
                success: true,
                extracted: true,
                name: fileName,
                count: result.extractedCount,
                message: `ZIP descompactado e deploy iniciado com sucesso (${result.extractedCount} arquivos).`,
              }),
              { status: 200, headers: { 'Content-Type': 'application/json' } }
            );
          }

          await fs.writeFile(fullPath, buffer);

          const stat = await fs.stat(fullPath);

          await auditLogOperation(userId, appId, 'UPLOAD', {
            targetDir,
            fileName,
            sizeBytes: stat.size,
          });

          // Sincronização em segundo plano com o container
          syncAppFilesToContainer(appId).catch((err) => {
            console.warn('[Container Auto-Sync Warning]:', err.message);
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
          console.error('[Upload Route Error]:', error);
          const msg = error.message || 'Erro ao processar upload.';
          let status = 500;
          if (msg.includes('Não autorizado') || msg.includes('Sessão') || msg.includes('login') || msg.includes('Token') || msg.includes('token')) status = 401;
          else if (msg.includes('Acesso negado')) status = 403;
          else if (msg.includes('Cota de disco')) status = 413;
          return new Response(JSON.stringify({ error: msg }), {
            status,
            headers: { 'Content-Type': 'application/json' },
          });
        }
      },
    },
  },
});
