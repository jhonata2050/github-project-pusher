import { createFileRoute } from '@tanstack/react-router';
import { executeDailyBillingCron } from '@/lib/cron.server';

export const Route = createFileRoute('/api/public/cron/maintenance')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
        let cronSecret = process.env['CRON_SECRET'];

        if (!cronSecret) {
          const { data } = await supabaseAdmin
            .from('system_settings')
            .select('value')
            .eq('key', 'cron_secret')
            .maybeSingle();
          cronSecret = (data?.value as string) || '';
        }

        const authHeader = request.headers.get('authorization');

        // Validação estrita de token de segurança do cron (Fail-Closed: sem segredo válido nada é executado)
        if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
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
