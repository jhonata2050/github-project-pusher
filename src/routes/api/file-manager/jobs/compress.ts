import { createFileRoute } from '@tanstack/react-router';
import { jobManager } from '@/lib/file-manager/jobs';
import { verifyAppAuthorization, extractAndVerifyUser } from '@/lib/file-manager/security';

export const Route = createFileRoute('/api/file-manager/jobs/compress')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const userId = await extractAndVerifyUser(request);

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
          const msg = err.message || 'Erro ao iniciar compressão.';
          let status = 500;
          if (msg.includes('Não autorizado') || msg.includes('Sessão') || msg.includes('login')) status = 401;
          else if (msg.includes('Acesso negado')) status = 403;
          return new Response(JSON.stringify({ error: msg }), {
            status,
            headers: { 'Content-Type': 'application/json' },
          });
        }
      },
    },
  },
});
