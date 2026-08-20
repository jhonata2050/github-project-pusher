import { createFileRoute } from '@tanstack/react-router';
import { supabaseAdmin } from '@/integrations/supabase/client.server';

export const Route = createFileRoute('/api/public/webhook')({
  server: {
    handlers: {
      GET: async () => {
        // Endpoint para verificação de saúde/registro de alguns gateways
        return new Response('Webhook endpoint is active. Use POST for notifications.', { status: 200 });
      },
      POST: async ({ request }) => {
        try {
          // Este é um endpoint genérico que pode ser usado por gateways que não têm rotas específicas
          // ou para logs de debug de payloads desconhecidos.
          const body = await request.text();
          const headers = Object.fromEntries(request.headers.entries());
          
          console.log('[Generic Webhook] Payload recebido:', body);
          
          await supabaseAdmin.from('audit_logs').insert({
            category: 'webhook',
            action: 'generic_webhook.received',
            status: 'info',
            description: 'Notificação recebida no endpoint genérico',
            metadata: { body, headers } as any
          });

          return new Response('OK', { status: 200 });
        } catch (err: any) {
          console.error('[Generic Webhook] Erro:', err.message);
          return new Response('Internal Error', { status: 500 });
        }
      }
    }
  }
});
