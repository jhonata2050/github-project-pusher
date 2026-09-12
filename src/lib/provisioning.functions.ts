import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

export const getProvisioningLogs = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: any) => 
    z.object({ 
      serviceId: z.string().optional(), 
      clientId: z.string().optional() 
    }).parse(data)
  )
  .handler(async ({ data, context }) => {
    let query = context.supabase
      .from("audit_logs")
      .select("id, action, entity_type, entity_id, description, metadata, created_at, user_id")
      .order("created_at", { ascending: false });

    if (data.serviceId) {
      query = query.or(`entity_id.eq.${data.serviceId},metadata->>serviceId.eq.${data.serviceId}`);
    } else if (data.clientId) {
      query = query.eq("user_id", data.clientId);
    } else {
      query = query.or("action.ilike.%provision%,entity_type.eq.service");
    }

    const { data: logs, error } = await query.limit(50);
    if (error) {
      console.warn("[getProvisioningLogs] fallback:", error.message);
      return [];
    }

    return (logs || []).map((l: any) => ({
      id: l.id,
      service_id: l.entity_id,
      user_id: l.user_id,
      action: l.action,
      status: l.metadata?.status || (l.action.includes("failed") ? "failed" : "success"),
      message: l.description,
      details: l.metadata,
      created_at: l.created_at,
      services: {
        id: l.entity_id,
        domain: l.metadata?.domain || "Serviço",
        products: { name: l.metadata?.productName || "Hospedagem / VPS" }
      }
    }));
  });

export const getClientProvisioningAudit = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: any) => z.object({ clientId: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    const { getClientProvisioningAudit: getAudit } = await import("./provisioning.server");
    return getAudit(context.supabase, context.userId, data.clientId);
  });

