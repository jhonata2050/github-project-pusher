import crypto from "crypto";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export interface ApiTokenInfo {
  id: string;
  user_id: string;
  name: string;
  token_prefix: string;
  created_at: string;
  last_used_at: string | null;
  expires_at: string | null;
}

/**
 * Gera um novo Developer API Token no formato eqsam_live_<48 chars>
 */
export async function createApiToken(
  userId: string,
  name: string,
  expiresInDays?: number
): Promise<{ token: string; info: ApiTokenInfo }> {
  if (!name || name.trim().length === 0) {
    throw new Error("O nome do token é obrigatório (ex: 'VS Code Extension', 'GitHub Actions')");
  }

  const randomPart = crypto.randomBytes(24).toString("hex");
  const rawToken = `eqsam_live_${randomPart}`;
  const tokenPrefix = `eqsam_live_${randomPart.slice(0, 8)}...`;
  const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");

  const expiresAt = expiresInDays && expiresInDays > 0 
    ? new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000).toISOString()
    : null;

  const { data, error } = await supabaseAdmin
    .from("user_api_tokens")
    .insert({
      user_id: userId,
      name: name.trim(),
      token_prefix: tokenPrefix,
      token_hash: tokenHash,
      expires_at: expiresAt,
    })
    .select("id, user_id, name, token_prefix, created_at, last_used_at, expires_at")
    .single();

  if (error) {
    console.error("[API Tokens] Erro ao salvar token no banco:", error.message);
    throw new Error("Falha ao registrar token. Verifique se a tabela 'user_api_tokens' foi criada no Supabase.");
  }

  return {
    token: rawToken,
    info: data as ApiTokenInfo,
  };
}

/**
 * Valida se um token raw (Bearer ou api-token header) é válido e ativo
 */
export async function verifyApiToken(rawToken: string): Promise<{ userId: string; tokenId: string; tokenName: string } | null> {
  if (!rawToken || !rawToken.startsWith("eqsam_live_")) {
    return null;
  }

  const tokenHash = crypto.createHash("sha256").update(rawToken.trim()).digest("hex");

  try {
    const { data, error } = await supabaseAdmin
      .from("user_api_tokens")
      .select("id, user_id, name, expires_at")
      .eq("token_hash", tokenHash)
      .maybeSingle();

    if (error || !data) {
      return null;
    }

    if (data.expires_at && new Date(data.expires_at).getTime() < Date.now()) {
      return null; // Token expirado
    }

    // Atualiza last_used_at de forma assíncrona sem bloquear
    supabaseAdmin
      .from("user_api_tokens")
      .update({ last_used_at: new Date().toISOString() })
      .eq("id", data.id)
      .then(() => {})
      .catch(() => {});

    return {
      userId: data.user_id,
      tokenId: data.id,
      tokenName: data.name,
    };
  } catch (err: any) {
    console.warn("[API Tokens] Falha ao consultar tabela de tokens:", err.message);
    return null;
  }
}

/**
 * Lista os tokens ativos do usuário (sem expor o token raw)
 */
export async function listUserApiTokens(userId: string): Promise<ApiTokenInfo[]> {
  const { data, error } = await supabaseAdmin
    .from("user_api_tokens")
    .select("id, user_id, name, token_prefix, created_at, last_used_at, expires_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    console.warn("[API Tokens] Erro ao listar tokens:", error.message);
    return [];
  }

  return (data || []) as ApiTokenInfo[];
}

/**
 * Revoga / deleta um token de API
 */
export async function revokeApiToken(userId: string, tokenId: string): Promise<boolean> {
  const { error } = await supabaseAdmin
    .from("user_api_tokens")
    .delete()
    .eq("id", tokenId)
    .eq("user_id", userId);

  return !error;
}
