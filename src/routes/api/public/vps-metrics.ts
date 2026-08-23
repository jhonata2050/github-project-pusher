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

          // Monitoramento: Registrar recebimento de métricas
          try {
            const { logPublicAuthEvent } = await import("@/lib/audit.functions");
            await logPublicAuthEvent({
              data: {
                action: "metrics_ingestion_attempt",
                email: null,
                description: `Ingestão de métricas para VPS: ${vps_id}`
              }
            });
          } catch (e) {
            console.warn("[VPS-Metrics] Falha ao registrar log de auditoria para métricas");
          }

          // 1. Atualizar métricas atuais na instância
          const { error: updateError } = await supabaseAdmin
            .from('vps_instances')
            .update({ 
              last_metrics: { 
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
              } 
            })
            .eq('id', vps_id);

          if (updateError) {
            console.error('Erro ao atualizar métricas atuais:', updateError);
            return new Response(JSON.stringify({ error: updateError.message }), { status: 500 });
          }

          // 2. Inserir no histórico
          const { error: historyError } = await supabaseAdmin
            .from('vps_metrics_history')
            .insert({
              vps_id,
              cpu: Math.round(cpu),
              ram: Math.round(ram),
              disk: Math.round(disk)
            });

          if (historyError) {
            console.error('Erro ao salvar histórico de métricas:', historyError);
            // Não falhamos a requisição se apenas o histórico falhar, para não quebrar o agente
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
