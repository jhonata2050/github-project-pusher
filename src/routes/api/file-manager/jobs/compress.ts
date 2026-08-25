import { createFileRoute } from '@tanstack/react-router';
import { jobManager } from '@/lib/file-manager/jobs';
import { verifyAppAuthorization } from '@/lib/file-manager/security';

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

export const Route = createFileRoute('/api/file-manager/jobs/compress')({
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

          const body = await request.json();
          const { appId, paths, archiveName, targetDir = '' } = body;

          if (!appId || !paths || !Array.isArray(paths) || paths.length === 0 || !archiveName) {
            return new Response(JSON.stringify({ error: 'appId, paths e archiveName são obrigatórios.' }), {
              status: 400,
              headers: { 'Content-Type': 'application/json' },
            });
          }

          await verifyAppAuthorization(appId, userId);

          const job = await jobManager.startCompressJob({
            appId,
            userId,
            paths,
            archiveName,
            targetDir,
          });

          return new Response(JSON.stringify({ success: true, job }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          });
        } catch (err: any) {
          console.error('[API Compress Job Error]:', err);
          return new Response(JSON.stringify({ error: err.message || 'Erro ao iniciar compressão.' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
          });
        }
      },
    },
  },
});
