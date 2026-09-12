import { createFileRoute } from '@tanstack/react-router';
import { jobManager, ConflictPolicy } from '@/lib/file-manager/jobs';
import { verifyAppAuthorization, extractAndVerifyUser } from '@/lib/file-manager/security';

export const Route = createFileRoute('/api/file-manager/jobs/extract')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const userId = await extractAndVerifyUser(request);

          const body = await request.json();
          const { appId, archivePath, targetDir = '', conflictPolicy = 'overwrite' } = body;

          if (!appId || !archivePath) {
            return new Response(JSON.stringify({ error: 'appId e archivePath são obrigatórios.' }), {
              status: 400,
              headers: { 'Content-Type': 'application/json' },
            });
          }

          await verifyAppAuthorization(appId, userId);

          const job = await jobManager.startExtractJob({
            appId,
            userId,
            archivePath,
            targetDir,
            conflictPolicy: conflictPolicy as ConflictPolicy,
          });

          return new Response(JSON.stringify({ success: true, job }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          });
        } catch (err: any) {
          console.error('[API Extract Job Error]:', err);
          const msg = err.message || 'Erro ao iniciar extração.';
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
