import { createFileRoute } from '@tanstack/react-router';
import { supabaseAdmin } from '@/integrations/supabase/client.server';
import { verifyHmacSignature } from '@/lib/webhook-utils.server';
import { z } from 'zod';

const payloadSchema = z.object({
  action: z.string().max(80),
  instanceId: z.string().trim().min(1).max(120),
  ipAddress: z.string().trim().max(64).optional().nullable(),
});

export const Route = createFileRoute('/api/public/vps/webhook')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const body = await request.text();
        const signature = request.headers.get('x-vps-signature');
        const sharedSecretHeader = request.headers.get('x-vps-webhook-secret');

        try {
          const { data: setting } = await supabaseAdmin
            .from('system_settings')
            .select('value')
            .eq('key', 'vps_webhook_secret')
            .maybeSingle();

          const secret = (setting?.value as string) || process.env['VPS_WEBHOOK_SECRET'] || '';

          // Fail closed: sem segredo configurado nada é processado
          const authorized =
            !!secret &&
            (verifyHmacSignature(body, signature, secret) || sharedSecretHeader === secret);

          if (!authorized) {
            await supabaseAdmin.from('audit_logs').insert({
              category: 'webhook',
              action: 'vps_webhook.unauthorized',
              status: 'failure',
              description: 'Webhook de VPS rejeitado por falta de assinatura/segredo válido',
              metadata: {} as any,
            });
            return new Response(JSON.stringify({ error: 'Unauthorized' }), {
              status: 401,
              headers: { 'Content-Type': 'application/json' },
            });
          }

          const payload = payloadSchema.parse(JSON.parse(body));

          if (payload.action === 'provisioning_complete') {
            const update: Record<string, unknown> = { status: 'active' };
            if (payload.ipAddress) update['ip_address'] = payload.ipAddress;

            await supabaseAdmin
              .from('vps_instances')
              .update(update as any)
              .eq('external_id', payload.instanceId);
          }

          return new Response(JSON.stringify({ received: true }), {
            headers: { 'Content-Type': 'application/json' },
          });
        } catch (err: any) {
          console.error('[VPS Webhook] Erro:', err?.message);
          return new Response(JSON.stringify({ error: 'Invalid request' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' },
          });
        }
      },
    },
  },
});
