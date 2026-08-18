import { createFileRoute } from '@tanstack/react-router';
import { supabaseAdmin } from '@/integrations/supabase/client.server';
import { z } from 'zod';

const metricsSchema = z.object({
  vps_id: z.string().uuid(),
  cpu: z.number(),
  ram: z.number(),
  disk: z.number(),
});

export const Route = createFileRoute('/api/public/vps-metrics')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const body = await request.json();
          const { vps_id, cpu, ram, disk } = metricsSchema.parse(body);

          // Atualizar ou inserir métricas na tabela vps_instances
          // Assumindo que temos campos para métricas em tempo real ou uma tabela separada.
          // Por agora, vamos apenas logar ou atualizar um campo JSON se existir.
          
          const { error } = await supabaseAdmin
            .from('vps_instances')
            .update({ 
              last_metrics: { 
                cpu: Math.round(cpu), 
                ram: Math.round(ram), 
                disk: Math.round(disk),
                last_update: new Date().toISOString()
              } 
            })
            .eq('id', vps_id);

          if (error) {
            console.error('Erro ao atualizar métricas:', error);
            return new Response(JSON.stringify({ error: error.message }), { status: 500 });
          }

          return new Response(JSON.stringify({ success: true }), { status: 200 });
        } catch (err: any) {
          return new Response(JSON.stringify({ error: err.message }), { status: 400 });
        }
      }
    }
  }
});
