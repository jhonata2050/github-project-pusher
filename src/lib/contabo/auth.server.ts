process.env['NODE_TLS_REJECT_UNAUTHORIZED'] = '0';

import { supabaseAdmin } from "@/integrations/supabase/client.server";

export async function getContaboToken(): Promise<string> {
  const { data: settingsData } = await supabaseAdmin
    .from("system_settings")
    .select("*");

  const settings: Record<string, string> = {};
  settingsData?.forEach((s: any) => {
    settings[s.key] = typeof s.value === "string" ? s.value.trim() : String(s.value ?? "").trim();
  });

  const clientId = settings["contabo_client_id"] || process.env["CONTABO_CLIENT_ID"];
  const clientSecret = settings["contabo_client_secret"] || process.env["CONTABO_CLIENT_SECRET"];
  const apiUser = settings["contabo_api_user"] || process.env["CONTABO_API_USER"];
  const apiPass = settings["contabo_api_password"] || process.env["CONTABO_API_PASSWORD"];

  if (!clientId || !clientSecret || !apiUser || !apiPass) {
    throw new Error("Credenciais da API Contabo não configuradas em Admin > Financeiro.");
  }

  const params = new URLSearchParams();
  params.append("grant_type", "password");
  params.append("client_id", clientId);
  params.append("client_secret", clientSecret);
  params.append("username", apiUser);
  params.append("password", apiPass);

  const res = await fetch(
    "https://auth.contabo.com/auth/realms/contabo/protocol/openid-connect/token",
    {
      method: "POST",
      body: params,
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
    }
  );

  if (!res.ok) {
    let detail = "";
    let errorBody: any = null;
    try {
      errorBody = await res.json();
      detail = errorBody.error_description || errorBody.error || "";
    } catch {
      detail = await res.text().catch(() => "");
    }

    console.error(`[Contabo] Erro na autenticação (${res.status}):`, detail);

    if (
      detail.toLowerCase().includes("invalid user credentials") ||
      (errorBody && errorBody.error === "invalid_grant")
    ) {
      throw new Error(
        "Contabo recusou as credenciais (usuário/senha da API inválidos). No Painel do Cliente Contabo, em 'API', use o E-mail da API e a Senha da API (não a senha da sua conta), e confira o Client ID/Secret."
      );
    }
    throw new Error(
      `Falha ao autenticar na Contabo (${res.status})${detail ? `: ${detail}` : ""}`
    );
  }
  const authResponse = (await res.json()) as { access_token: string };
  return authResponse.access_token;
}
