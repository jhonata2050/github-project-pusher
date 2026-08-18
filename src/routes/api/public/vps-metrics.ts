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
          
          // Tratamento para valores que podem vir como string ou nulos do shell
          const sanitizedData = {
            vps_id: body.vps_id,
            cpu: Number(body.cpu) || 0,
            ram: Number(body.ram) || 0,
            disk: Number(body.disk) || 0,
          };

          const { vps_id, cpu, ram, disk } = metricsSchema.parse(sanitizedData);

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
          console.error('Erro no processamento de métricas:', err);
          return new Response(JSON.stringify({ error: err.message }), { status: 400 });
        }
      }
    }
  }
});
