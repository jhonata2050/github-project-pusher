import { createFileRoute } from '@tanstack/react-router';
import { jobManager } from '@/lib/file-manager/jobs';

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

export const Route = createFileRoute('/api/file-manager/jobs/$jobId')({
  server: {
    handlers: {
      GET: async ({ params, request }) => {
        try {
          const { jobId } = params;
          const job = jobManager.getJob(jobId);

          if (!job) {
            return new Response(JSON.stringify({ error: 'Job não encontrado ou já expirado.' }), {
              status: 404,
              headers: { 'Content-Type': 'application/json' },
            });
          }

          return new Response(JSON.stringify({ success: true, job }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          });
        } catch (err: any) {
          return new Response(JSON.stringify({ error: err.message || 'Erro ao consultar Job.' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
          });
        }
      },
      POST: async ({ params, request }) => {
        try {
          const { jobId } = params;
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

          const decoded = decodeJwtPayload(token);
          const userId = decoded?.sub;
          if (!userId) {
            return new Response(JSON.stringify({ error: 'Não autorizado.' }), {
              status: 401,
              headers: { 'Content-Type': 'application/json' },
            });
          }

          const cancelled = jobManager.cancelJob(jobId, userId);
          return new Response(JSON.stringify({ success: cancelled }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          });
        } catch (err: any) {
          return new Response(JSON.stringify({ error: err.message || 'Erro ao cancelar Job.' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
          });
        }
      },
    },
  },
});
