import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const getSystemLogs = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => 
    z.object({
      type: z.enum(["email", "auth", "data", "system", "branding", "all"]).default("all"),
      limit: z.number().int().min(1).max(100).default(20),
      offset: z.number().int().min(0).default(0)
    }).parse(data)
  )
  .handler(async ({ data, context }) => {
    // Verify admin (uma única chamada ao banco)
    const { data: isAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });

    if (!isAdmin) {
      throw new Error("Unauthorized");
    }


    if (data.type === "email") {
      const { data: logs, count, error } = await context.supabase
        .from("email_logs")
        .select(
          "id, created_at, template_name, status, to_email, subject, user_id, profile:profiles(full_name)",
          { count: "estimated" },
        )
        .order("created_at", { ascending: false })
        .range(data.offset, data.offset + data.limit - 1);

      if (error) throw error;
      return {
        type: "email",
        logs: (logs ?? []).map((log) => ({
          id: log.id,
          createdAt: log.created_at ?? new Date(0).toISOString(),
          category: "email",
          action: log.template_name ?? "email.sent",
          status: log.status ?? "unknown",
          actorEmail: log.to_email,
          description: log.subject,
          entityType: "email",
          entityId: log.user_id,
          ipAddress: null,
          profileName: log.profile?.full_name ?? null,
        })),
        count: count || 0,
      };
    }

    let query = context.supabase
      .from("audit_logs")
      .select("id, category, action, status, actor_email, entity_type, entity_id, description, ip_address, created_at", { count: "estimated" });

    if (data.type === "auth") query = query.eq("category", "auth");
    if (data.type === "data") query = query.eq("category", "data");
    if (data.type === "system") query = query.in("category", ["system", "security"]);
    if (data.type === "branding") query = query.eq("category", "branding");

    const { data: logs, count, error } = await query
      .order("created_at", { ascending: false })
      .range(data.offset, data.offset + data.limit - 1);

    if (error) throw error;
    return {
      type: data.type,
      logs: (logs ?? []).map((log) => ({
        id: log.id,
        createdAt: log.created_at,
        category: log.category,
        action: log.action,
        status: log.status,
        actorEmail: log.actor_email,
        description: log.description,
        entityType: log.entity_type,
        entityId: log.entity_id,
        ipAddress: typeof log.ip_address === "string" ? log.ip_address : null,
        profileName: null,
      })),
      count: count ?? 0,
    };
  });
