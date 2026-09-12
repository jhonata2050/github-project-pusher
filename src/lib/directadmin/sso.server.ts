import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { callDA } from "./transport.server";

/**
 * DirectAdmin SSO (Single Sign-On) and One-Time Login Key generation.
 */

export function isValidDirectAdminLoginUrl(value: unknown): value is string {
  if (typeof value !== "string") return false;
  
  // Basic heuristic: check if it contains the typical DA login markers
  const containsMarker = value.includes("key=") || value.includes("hash=") || value.includes("token=");
  const containsPath = value.includes("/api/login/url") || value.includes("/CMD_LOGIN_URL");
  
  if (containsMarker && containsPath) return true;

  try {
    const url = new URL(value);
    return (
      (url.protocol === "https:" || url.protocol === "http:") &&
      url.hostname.length > 0 &&
      (containsMarker || containsPath)
    );
  } catch {
    return containsMarker || containsPath;
  }
}

export function parseDirectAdminLoginUrl(response: any, serverHostname: string): string {
  const cleanHostname = serverHostname.replace(/^https?:\/\//, '').split(':')[0];
  const baseUrl = `https://${cleanHostname}:2222`;

  console.log("Parsing DirectAdmin Response:", JSON.stringify(response));

  // DirectAdmin often returns text/plain that looks like "error=0&text=URL%20Created&details=https%3A%2F%2F..."
  // Our callDA already tries to parse this into an object.

  // 1. If response is a direct string starting with URL: or just the URL
  if (typeof response === "string") {
    let value = response.trim();
    if (value.startsWith("URL:")) {
      value = value.substring(4).trim();
    }
    
    if (isValidDirectAdminLoginUrl(value)) {
      if (value.startsWith('http')) return value;
      return `${baseUrl}${value.startsWith('/') ? '' : '/'}${value}`;
    }
  }

  // 2. If response is an object (common when callDA uses URLSearchParams parser)
  if (typeof response === "object" && response !== null) {
    // Check for explicit 'result', 'details', 'url', 'URL', or 'login_url'
    const possibleUrl = response.result || response.details || response.url || response.URL || response.login_url;
    
    if (possibleUrl && typeof possibleUrl === "string") {
      // Decode if it's URL encoded (common in DA responses)
      let decodedUrl = possibleUrl;
      try {
        if (possibleUrl.includes('%')) {
          decodedUrl = decodeURIComponent(possibleUrl);
        }
      } catch (e) {}

      if (isValidDirectAdminLoginUrl(decodedUrl)) {
        if (decodedUrl.startsWith('http')) return decodedUrl;
        return `${baseUrl}${decodedUrl.startsWith('/') ? '' : '/'}${decodedUrl}`;
      }
    }

    // Check for key/hash in the object
    const token = response.key || response.hash;
    if (token && typeof token === "string" && token.length > 20) {
      return `${baseUrl}/CMD_LOGIN_URL?hash=${token}`;
    }
  }

  throw new Error(`O DirectAdmin não retornou uma URL válida. Resposta recebida: ${JSON.stringify(response)}`);
}

export async function getDASession(serverId: string, username: string, redirectUrl?: string) {
  const { data: server, error } = await supabaseAdmin
    .from("servers")
    .select("*")
    .eq("id", serverId)
    .single();

  if (error || !server) throw new Error("DA_INVALID_SERVER");

  const targetUser = username.trim();
  const timestamp = Date.now();
  
  // 5. VALIDAÇÕES PRIVILEGIADAS
  const restrictedUsernames = ["admin", "root", "superuser", "da_admin", "eqsa7232", "reseller", "support", "system", "operator", "manager"];
  if (restrictedUsernames.includes(targetUser.toLowerCase())) {
    console.error(`[Security-DA] Attempt to login via SSO to restricted user: ${targetUser}`);
    throw new Error('DA_DIRECTADMIN_BLOCKED');
  }

  const { createSystemLog } = await import("../system-logs.server");

  // 1 & 2. REMOVER FLUXO INCORRETO E USAR FLUXO OFICIAL VALIDADO
  // O fluxo POST /api/login/url com JSON foi removido conforme instrução.
  console.log(`[DA-SSO] Gerando One-Time URL para ${targetUser} via CMD_API_LOGIN_KEYS com impersonation`);

  // REGRA DE IMPERSONATION: Para que a sessão pertença ao usuário alvo, a autenticação
  // deve ser feita no formato "RESELLER|USUARIO|NOME_CHAVE".
  // Buscamos o reseller e o nome da chave das configurações do servidor.
  const apiUserParts = (server.api_user || '').split('|');
  const reseller = apiUserParts[0] || '';
  const keyName = apiUserParts[apiUserParts.length - 1] || '';
  
  // Montamos a identidade com 3 partes para callDA processar: RESELLER|TARGET|KEYNAME
  const effectiveApiUser = `${reseller}|${targetUser}|${keyName}`;

  let result: any;
  try {
    result = await callDA({
      hostname: server.hostname,
      apiUser: effectiveApiUser,
      apiToken: server.api_token ?? "",
      command: 'CMD_API_LOGIN_KEYS',
      method: 'POST',
      params: {
        action: 'create',
        type: 'one_time_url',
        user: targetUser,
        keyname: `sso_${timestamp}`,
        never_expires: 'no',
        expiry: '10m',
        max_uses: '1',
        clear_key: 'yes',
        json: 'yes'
      },
    });
  } catch (e: any) {
    const errorMsg = e.message || '';
    if (errorMsg.includes('401')) throw new Error('DA_AUTHENTICATION_ERROR');
    if (errorMsg.includes('IP') || errorMsg.includes('whitelist')) throw new Error('DA_LOGIN_KEY_IP_NOT_ALLOWED');
    if (errorMsg.includes('permission') || errorMsg.includes('perm')) throw new Error('DA_PERMISSION_ERROR');
    throw new Error('DA_LOGIN_URL_CREATION_ERROR');
  }

  // 6 & 7. RESPOSTA ESPERADA E VALIDAÇÃO DA URL
  if (!result || typeof result !== 'object') {
    throw new Error('DA_INVALID_RESPONSE');
  }

  const loginUrl = result.result;
  
  if (!loginUrl || typeof loginUrl !== 'string') {
    throw new Error('DA_INVALID_LOGIN_URL');
  }

  // Validação da URL gerada
  try {
    const parsedUrl = new URL(loginUrl);
    if (parsedUrl.protocol !== 'https:') throw new Error('DA_INVALID_LOGIN_URL');
    if (!parsedUrl.searchParams.has('key')) throw new Error('DA_INVALID_LOGIN_URL');
    
    // Validar hostname (opcionalmente)
    const hostParts = server.hostname.replace(/^https?:\/\//, '').split(':');
    const cleanServerHost = hostParts[0];
    if (!parsedUrl.hostname.includes(cleanServerHost!)) {
      throw new Error('DA_INVALID_LOGIN_URL');
    }
  } catch (e) {
    throw new Error('DA_INVALID_LOGIN_URL');
  }

  // 8. LOGS SEGUROS (Sem registrar o key)
  await createSystemLog({
    category: 'directadmin',
    level: 'info',
    message: `SSO gerado para '${targetUser}'`,
    metadata: { 
      targetUser, 
      serverId, 
      timestamp: new Date().toISOString(),
      success: true
    }
  }).catch(e => console.error(e));

  // 12. BLOQUEIO PROATIVO DE IDENTIDADE ADMINISTRATIVA (REFORÇADO)
  const apiAdmin = (server.api_user || '').split('|')[0] || '';
  // Se a URL contiver o nome do reseller no parâmetro user=, e o targetUser for diferente, bloqueamos.
  // Note: O DA costuma colocar user=TARGET na URL de one-time se o impersonation funcionou.
  if (apiAdmin && loginUrl.toLowerCase().includes(`user=${apiAdmin.toLowerCase()}`) && targetUser.toLowerCase() !== apiAdmin.toLowerCase()) {
     console.error(`[SSO-Security-Violation] Admin Identity Leak in URL! Target=${targetUser}, Leak=${apiAdmin}`);
     throw new Error("DA_DIRECTADMIN_BLOCKED");
  }

  return loginUrl;
}
