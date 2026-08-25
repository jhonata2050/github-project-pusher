import { createFileRoute } from '@tanstack/react-router';
import { executeDailyBillingCron } from '@/lib/cron.server';

export const Route = createFileRoute('/api/public/cron/maintenance')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const authHeader = request.headers.get('Authorization');
        const cronSecret = process.env['CRON_SECRET'] || 'cron_secret_eqsam';

        // Validação de token de segurança opcional
        if (process.env['CRON_SECRET'] && authHeader !== `Bearer ${cronSecret}`) {
          return new Response(JSON.stringify({ error: 'Unauthorized' }), {
            status: 401,
            headers: { 'Content-Type': 'application/json' },
          });
        }

        const result = await executeDailyBillingCron();

        return new Response(
          JSON.stringify({
            success: true,
            timestamp: new Date().toISOString(),
            ...result,
          }),
          {
            headers: { 'Content-Type': 'application/json' },
          }
        );
      },
    },
  },
});
