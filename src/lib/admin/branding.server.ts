import { getRequestHeader } from "@tanstack/react-start/server";
import type { Json } from "@/integrations/supabase/types";
import type { BrandingSettings, AdminContext } from "./types";

export const DEFAULT_BRANDING: BrandingSettings = {
  logo_url: "/images/logo-branco.webp",
  app_name: "Eqsam",
  primary_color: "oklch(0.88 0.19 128)",
  brand_color: "oklch(0.72 0.19 148)",
  favicon_url: "/images/logo.png",
};

export async function getBrandingImplementation(): Promise<BrandingSettings> {
  const supabaseUrl = process.env["SUPABASE_URL"];
  const supabaseKey = process.env["SUPABASE_PUBLISHABLE_KEY"];

  if (!supabaseUrl || !supabaseKey) {
    console.warn("[Branding] Supabase environment variables are missing");
    return DEFAULT_BRANDING;
  }

  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("system_settings")
      .select("value")
      .eq("key", "branding")
      .maybeSingle();

    if (error) {
      console.error("[Branding] Erro ao buscar configurações:", error);
      return DEFAULT_BRANDING;
    }

    if (!data) return DEFAULT_BRANDING;

    // Garantir que os dados lidos do banco preencham os campos faltantes com o padrão
    const value = (data.value as unknown as BrandingSettings) || {};
    return {
      ...DEFAULT_BRANDING,
      ...value,
      // Garante que o logo_url do banco seja preservado se existir
      logo_url: value.logo_url !== undefined ? value.logo_url : DEFAULT_BRANDING.logo_url,
    };
  } catch (err) {
    console.error("[Branding] Falha ao importar supabaseAdmin:", err);
    return DEFAULT_BRANDING;
  }
}

export async function updateBrandingImplementation(
  data: any,
  context: AdminContext
): Promise<{ success: boolean }> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  const { data: isAdmin, error: roleError } = await context.supabase.rpc("has_role", {
    _user_id: context.userId,
    _role: "admin",
  });

  if (roleError) {
    console.error("[Branding] Erro ao verificar permissões:", roleError);
    throw new Error(`Erro de permissão: ${roleError.message}`);
  }

  if (!isAdmin) {
    console.warn(`[Security-Violation] Acesso negado para usuário ${context.userId} tentando atualizar branding`);
    throw new Error("Acesso restrito a administradores.");
  }

  const { error } = await supabaseAdmin.from("system_settings").upsert({
    key: "branding",
    value: data as unknown as Json,
    updated_at: new Date().toISOString(),
  });

  if (error) throw error;

  try {
    const forwarded = getRequestHeader("x-forwarded-for");
    const ipAddress = forwarded?.split(",")[0]?.trim() || getRequestHeader("cf-connecting-ip") || null;
    const userAgent = getRequestHeader("user-agent")?.slice(0, 500) || null;
    const email = typeof context.claims?.email === "string" ? context.claims.email : null;

    await supabaseAdmin.from("audit_logs").insert({
      category: "branding",
      action: "branding.update",
      status: "success",
      actor_id: context.userId,
      actor_email: email,
      description: `Branding atualizado: ${data.app_name}`,
      ip_address: ipAddress as string | null,
      user_agent: userAgent,
      metadata: { branding: data } as any,
    });
  } catch (e) {
    console.error("Erro ao logar alteração de branding:", e);
  }

  return { success: true };
}
