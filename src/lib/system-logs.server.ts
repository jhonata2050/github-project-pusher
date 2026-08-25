import { supabaseAdmin } from "@/integrations/supabase/client.server";

export type LogLevel = 'info' | 'warning' | 'error' | 'critical';

export async function createSystemLog({
  category,
  level,
  message,
  metadata = {},
  actorId,
  serviceId
}: {
  category: string;
  level: LogLevel;
  message: string;
  metadata?: any;
  actorId?: string;
  serviceId?: string;
}) {
  try {
    const { error } = await supabaseAdmin.from("system_logs" as any).insert({
      category,
      level,
      message,
      metadata,
      actor_id: actorId,
      service_id: serviceId
    });

    if (error) {
      // Se a tabela não existir, logamos no console para não perder a informação
      console.error("[SystemLog-DB-Error]", error);
      console.warn(`[SystemLog-Fallback] ${level.toUpperCase()} [${category}]: ${message}`, metadata);
    }
  } catch (e) {
    console.error("[SystemLog-Critical-Failure]", e);
  }
}
