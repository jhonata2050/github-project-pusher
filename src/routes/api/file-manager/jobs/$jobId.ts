import { createFileRoute } from '@tanstack/react-router';
import { jobManager } from '@/lib/file-manager/jobs';
import { extractAndVerifyUser } from '@/lib/file-manager/security';

export const Route = createFileRoute('/api/file-manager/jobs/$jobId')({
  server: {
    handlers: {
      GET: async ({ params, request }) => {
        try {
          const { jobId } = params;
          if (!jobId) {
            return new Response(JSON.stringify({ error: 'jobId é obrigatório.' }), {
              status: 400,
              headers: { 'Content-Type': 'application/json' },
            });
          }

          const userId = await extractAndVerifyUser(request);
          const job = jobManager.getJob(jobId);

          if (!job) {
            return new Response(JSON.stringify({ error: 'Job não encontrado ou já expirado.' }), {
              status: 404,
              headers: { 'Content-Type': 'application/json' },
            });
          }

          // Garantir que apenas o dono do job possa consultar seu status
          if (job.userId !== userId) {
            return new Response(JSON.stringify({ error: 'Acesso negado a este Job.' }), {
              status: 403,
              headers: { 'Content-Type': 'application/json' },
            });
          }

          return new Response(JSON.stringify({ success: true, job }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          });
        } catch (err: any) {
          const msg = err.message || 'Erro ao consultar Job.';
          const status = msg.includes('Não autorizado') || msg.includes('Sessão') ? 401 : 500;
          return new Response(JSON.stringify({ error: msg }), {
            status,
            headers: { 'Content-Type': 'application/json' },
          });
        }
      },
      POST: async ({ params, request }) => {
        try {
          const { jobId } = params;
          if (!jobId) {
            return new Response(JSON.stringify({ error: 'jobId é obrigatório.' }), {
              status: 400,
              headers: { 'Content-Type': 'application/json' },
            });
          }

          const userId = await extractAndVerifyUser(request);
          const cancelled = jobManager.cancelJob(jobId, userId);

          return new Response(JSON.stringify({ success: cancelled }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          });
        } catch (err: any) {
          const msg = err.message || 'Erro ao cancelar Job.';
          const status = msg.includes('Não autorizado') || msg.includes('Sessão') ? 401 : 500;
          return new Response(JSON.stringify({ error: msg }), {
            status,
            headers: { 'Content-Type': 'application/json' },
          });
        }
      },
    },
  },
});
