import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Database } from "@/integrations/supabase/types";

export const testWhatsApp = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
    if (!isAdmin) throw new Error("Unauthorized");

    const { testWhatsAppConnection } = await import("../whatsapp.server");
    return testWhatsAppConnection();
  });


export const getSystemSettings = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
    if (!isAdmin) throw new Error("Unauthorized");

    const { data, error } = await supabaseAdmin
      .from("system_settings")
      .select("*");

    if (error) throw new Error(error.message);

    const settings: Record<string, any> = {};
    data.forEach((s: any) => {
      // Garantir que valores vazios no banco não quebrem a lógica do frontend
      settings[s.key] = (s.value === "" || s.value === null) ? null : s.value;
    });

    return settings;
  });


export const updateSystemSettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.record(z.any()).parse(data))
  .handler(async ({ data: settings, context }) => {
    // Verificar se é admin
    const { data: isAdmin } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
    if (!isAdmin) throw new Error("Unauthorized");

    for (const [key, value] of Object.entries(settings)) {
      // Normalização: se o valor for apenas espaços, tratamos como vazio
      const normalizedValue = typeof value === "string" ? value.trim() : value;

      if (normalizedValue === "" || normalizedValue === null || normalizedValue === undefined) {
        // Log para auditoria
        console.log(`[SystemSettings] Deleting empty key: ${key}`);
        await supabaseAdmin
          .from("system_settings")
          .delete()
          .eq("key", key);
        continue;
      }

      const { error } = await supabaseAdmin
        .from("system_settings")
        .upsert({ key, value: normalizedValue }, { onConflict: 'key' });
      
      if (error) {
        console.error(`[SystemSettings] Error updating ${key}:`, error);
        throw new Error(`Error updating ${key}: ${error.message}`);
      }
    }

    return { success: true };
  });

