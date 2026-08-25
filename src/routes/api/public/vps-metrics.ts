import { createFileRoute } from '@tanstack/react-router';
import { supabaseAdmin } from '@/integrations/supabase/client.server';
import { z } from 'zod';

const metricsSchema = z.object({
  vps_id: z.string().uuid(),
  cpu: z.number(),
  ram: z.number(),
  disk: z.number(),
  iops_read: z.number().nullable(),
  iops_write: z.number().nullable(),
  net_in: z.number().nullable(),
  net_out: z.number().nullable(),
  disk_used_gb: z.number().nullable(),
  disk_total_gb: z.number().nullable(),
});

export const Route = createFileRoute('/api/public/vps-metrics')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const body = await request.json();
          
          // Tratamento para valores que podem vir como string ou nulos do shell
          const num = (v: any) => (v === undefined || v === null || v === '' || isNaN(Number(v)) ? null : Number(v));
          const sanitizedData = {
            vps_id: body.vps_id,
            cpu: Number(body.cpu) || 0,
            ram: Number(body.ram) || 0,
            disk: Number(body.disk) || 0,
            iops_read: num(body.iops_read),
            iops_write: num(body.iops_write),
            net_in: num(body.net_in),
            net_out: num(body.net_out),
            disk_used_gb: num(body.disk_used_gb),
            disk_total_gb: num(body.disk_total_gb),
          };

          const { vps_id, cpu, ram, disk, iops_read, iops_write, net_in, net_out, disk_used_gb, disk_total_gb } = metricsSchema.parse(sanitizedData);

          // Salvar métricas no motor de métricas local
          const { saveVPSMetrics } = await import('@/lib/vps-metrics.server');
          const savedMetrics = saveVPSMetrics({
            vps_id,
            cpu,
            ram,
            disk,
            iops_read,
            iops_write,
            net_in,
            net_out,
            disk_used_gb,
            disk_total_gb,
          });

          return new Response(JSON.stringify({ success: true, metrics: savedMetrics }), { 
            status: 200,
            headers: { 'Content-Type': 'application/json' }
          });
        } catch (err: any) {
          console.error('[VPS-Metrics] Erro ao processar requisição:', err.message);
          return new Response(JSON.stringify({ error: err.message }), { 
            status: 400,
            headers: { 'Content-Type': 'application/json' }
          });
        }
      },
    },
  },
});
