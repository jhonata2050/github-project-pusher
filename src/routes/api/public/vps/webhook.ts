import { createFileRoute } from '@tanstack/react-router';
import { supabaseAdmin } from '@/integrations/supabase/client.server';

export const Route = createFileRoute('/api/public/vps/webhook')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          // A Contabo pode enviar webhooks para status de provisionamento
          // Aqui implementaríamos a verificação de assinatura se disponível
          const payload = await request.json();
          
          if (payload.action === 'provisioning_complete') {
            await supabaseAdmin
              .from('vps_instances')
              .update({ 
                status: 'active',
                ip_address: payload.ipAddress 
              } as any)
              .eq('external_id', payload.instanceId);
          }

          return new Response(JSON.stringify({ received: true }), {
            headers: { 'Content-Type': 'application/json' }
          });
        } catch (err: any) {
          return new Response(JSON.stringify({ error: err.message }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
          });
        }
      }
    }
  }
});
