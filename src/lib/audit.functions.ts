import { getRequestHeader } from "@tanstack/react-start/server";
import { createServerFn } from "@tanstack/react-start";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { publicAuthEventSchema, sessionEventSchema } from "@/lib/audit.schemas";

export const logPublicAuthEvent = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => publicAuthEventSchema.parse(input))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const forwarded = getRequestHeader("x-forwarded-for");
    const ipAddress = forwarded?.split(",")[0]?.trim() || getRequestHeader("cf-connecting-ip") || null;
    const userAgent = getRequestHeader("user-agent")?.slice(0, 500) || null;
    const { error } = await supabaseAdmin.from("audit_logs").insert({
      category: "auth",
      action: data.action,
      status: data.action.endsWith("failed") ? "failure" : "success",
      actor_email: data.email ?? null,
      description: data.description,
      ip_address: ipAddress,
      user_agent: userAgent,
    });
    if (error) console.error("[Audit] Falha ao registrar evento público:", error.message);
    return { success: !error };
  });

export const logSessionEvent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => sessionEventSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const forwarded = getRequestHeader("x-forwarded-for");
    const ipAddress = forwarded?.split(",")[0]?.trim() || getRequestHeader("cf-connecting-ip") || null;
    const userAgent = getRequestHeader("user-agent")?.slice(0, 500) || null;
    const email = typeof context.claims.email === "string" ? context.claims.email : null;
    const { error } = await supabaseAdmin.from("audit_logs").insert({
      category: data.action.startsWith("impersonation") ? "security" : "auth",
      action: data.action,
      status: "success",
      actor_id: context.userId,
      actor_email: email,
      entity_type: data.entityType ?? null,
      entity_id: data.entityId ?? null,
      description: data.description,
      ip_address: ipAddress,
      user_agent: userAgent,
    });
    if (error) console.error("[Audit] Falha ao registrar evento de sessão:", error.message);
    return { success: !error };
  });