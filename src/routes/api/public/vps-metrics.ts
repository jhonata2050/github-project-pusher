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

          // Verificar se a VPS realmente existe no sistema
          const { data: vps, error: vpsCheckErr } = await supabaseAdmin
            .from('vps_instances')
            .select('id, status')
            .eq('id', vps_id)
            .maybeSingle();

          if (vpsCheckErr || !vps) {
            return new Response(JSON.stringify({ error: 'VPS não encontrada ou inativa' }), { status: 404 });
          }

          const metricsPayload = { 
            cpu: Math.round(cpu), 
            ram: Math.round(ram), 
            disk: Math.round(disk),
            iops: (iops_read !== null || iops_write !== null) ? {
              read: iops_read ?? 0,
              write: iops_write ?? 0,
              total: (iops_read ?? 0) + (iops_write ?? 0),
            } : null,
            network: (net_in !== null || net_out !== null) ? {
              inbound: net_in ?? 0,
              outbound: net_out ?? 0,
            } : null,
            disk_used_gb,
            disk_total_gb,
            last_update: new Date().toISOString()
          };

          // 1. Persistir em system_settings (garante que nunca falhe por schema)
          try {
            await supabaseAdmin
              .from('system_settings')
              .upsert({
                key: `vps_metrics_${vps_id}`,
                value: JSON.stringify(metricsPayload)
              });
          } catch (settErr: any) {
            console.warn('[VPS-Metrics] Aviso ao gravar em system_settings:', settErr.message);
          }

          // 2. Tentar atualizar coluna last_metrics se existir
          try {
            await supabaseAdmin
              .from('vps_instances')
              .update({ last_metrics: metricsPayload } as any)
              .eq('id', vps_id);
          } catch (updateError) {
            // Fallback seguro caso a coluna não exista no Postgres
          }

          // 3. Tentar inserir no histórico se a tabela existir
          try {
            await supabaseAdmin
              .from('vps_metrics_history')
              .insert({
                vps_id,
                cpu: Math.round(cpu),
                ram: Math.round(ram),
                disk: Math.round(disk)
              });
          } catch (historyError) {
            // Fallback seguro caso a tabela de histórico não exista
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
