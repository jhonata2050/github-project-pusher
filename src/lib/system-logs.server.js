import { supabaseAdmin } from "@/integrations/supabase/client.server";
export async function createSystemLog({ category, level, message, metadata = {}, actorId, serviceId }) {
    try {
        const { error } = await supabaseAdmin.from("system_logs").insert({
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
    }
    catch (e) {
        console.error("[SystemLog-Critical-Failure]", e);
    }
}
