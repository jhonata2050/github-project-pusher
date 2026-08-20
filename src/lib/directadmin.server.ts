import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { Buffer } from "buffer";

/**
 * DirectAdmin API integration helper.
 * Uses nodejs_compat built-ins like fetch (Web API) for requests.
 */

interface DARequestOptions {
  hostname: string;
  apiUser: string;
  apiToken: string;
  command: string;
  method?: 'GET' | 'POST';
  params?: Record<string, string>;
}

interface DAConnectionResult {
  success: true;
  hostname: string;
  apiUser: string;
  packageCount: number;
  packages: string[];
}

function generateStrongPassword(length = 32): string {
  const uppercase = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const lowercase = 'abcdefghijkmnopqrstuvwxyz';
  const numbers = '23456789';
  const symbols = '!@#$%^&*()_+-=[]{}|;:,.<>?'; // Expanded symbols set
  const allCharacters = `${uppercase}${lowercase}${numbers}${symbols}`;
  
  const randomValues = new Uint32Array(length);
  crypto.getRandomValues(randomValues);

  const password = [
    uppercase.charAt((randomValues[0] ?? 0) % uppercase.length),
    lowercase.charAt((randomValues[1] ?? 0) % lowercase.length),
    numbers.charAt((randomValues[2] ?? 0) % numbers.length),
    symbols.charAt((randomValues[3] ?? 0) % symbols.length),
  ];

  // Fill the rest with truly random characters
  for (let i = 4; i < length; i++) {
    password.push(allCharacters.charAt((randomValues[i] ?? 0) % allCharacters.length));
  }

  // Cryptographically secure shuffle
  for (let i = password.length - 1; i > 0; i--) {
    const j = (randomValues[i] ?? 0) % (i + 1);
    [password[i], password[j]] = [password[j]!, password[i]!];
  }

  return password.join('');
}


async function callDA({ hostname, apiUser, apiToken, command, method = 'GET', params = {} }: DARequestOptions) {
  // Limpa o hostname e garante o uso da porta 2222
  const cleanHostname = hostname.replace(/^https?:\/\//, '').split(':')[0];
  const url = `https://${cleanHostname}:2222/${command}`;
  
  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, val]) => searchParams.append(key, val));
  
  const authHeader = `Basic ${Buffer.from(`${apiUser.trim()}:${apiToken.trim()}`).toString('base64')}`;
  
  try {
    if (method === 'GET') searchParams.set('json', 'yes');

    const response = await fetch(url + (method === 'GET' ? `?${searchParams.toString()}` : ''), {
      method,
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json, text/plain',
        'User-Agent': 'Mozilla/5.0 (compatible; Eqsam/1.0; +https://eqsam.com)',
      },
      body: method === 'POST' ? searchParams.toString() : null,
      signal: AbortSignal.timeout(60_000), // Aumentado para 60s para maior resiliência
      redirect: 'manual',
    });

    if (response.status >= 300 && response.status < 400) {
      throw new Error(`A API redirecionou para ${response.headers.get('location') ?? 'a tela de login'}. Verifique o comando e as permissões da chave.`);
    }

    if (!response.ok) {
      const errorText = await response.text();
      // Verificação específica para Imunify360 (proteção anti-bot ou firewall)
      if (response.status === 403 && (errorText.includes('Imunify360') || errorText.includes('bot-protection') || errorText.includes('shield-root'))) {
        throw new Error(
          `O Imunify360 do servidor ${hostname} bloqueou a requisição (proteção anti-bot). ` +
            `É necessário liberar o IP do Eqsam na whitelist do Imunify360 (Firewall > White List) ou desativar a proteção anti-bot para a porta 2222.`,
        );
      }
      throw new Error(`DirectAdmin API Error (${response.status}): ${errorText}`);
    }


    const text = await response.text();
    try {
      return JSON.parse(text);
    } catch {
      if (text.trimStart().startsWith('<!DOCTYPE html') || text.includes('<html')) {
        throw new Error('O DirectAdmin retornou a tela de login em vez dos dados da API. Verifique as permissões da chave de acesso.');
      }
      return Object.fromEntries(new URLSearchParams(text));
    }
  } catch (error: unknown) {
    if (error instanceof Error && (error.name === 'AbortError' || error.name === 'TimeoutError')) {
      throw new Error(`O servidor DirectAdmin (${hostname}) demorou muito para responder (timeout). Verifique se o IP do Eqsam está liberado no firewall do servidor.`);
    }
    if (error instanceof Error && /Imunify360/i.test(error.message)) throw error;

    console.error("DirectAdmin Fetch Error:", error);
    const message = error instanceof Error ? error.message : 'Erro desconhecido';
    throw new Error(`Falha na comunicação com o DirectAdmin: ${message}. Verifique o hostname e as permissões da chave no servidor ${hostname}.`);
  }
}

function normalizePackageList(result: unknown): string[] {
  if (Array.isArray(result)) return result.filter((item): item is string => typeof item === 'string');
  if (!result || typeof result !== 'object' || !('list' in result)) return [];
  const list = result.list;
  if (Array.isArray(list)) return list.filter((item): item is string => typeof item === 'string');
  return typeof list === 'string' ? [list] : [];
}

export async function getDAPackages(serverId: string) {
  const { data: server, error } = await supabaseAdmin
    .from("servers")
    .select("*")
    .eq("id", serverId)
    .single();

  if (error || !server) throw new Error("Servidor não encontrado");

  const result = await callDA({
    hostname: server.hostname,
    apiUser: server.api_user ?? "",
    apiToken: server.api_token ?? "",
    command: 'CMD_API_PACKAGES_USER',
  });

  const packages = normalizePackageList(result);
  if (packages.length === 0) throw new Error('A conexão foi aceita, mas nenhum pacote de usuário foi retornado pelo DirectAdmin.');
  return packages;
}

export async function testDAConnectionDetails(serverId: string): Promise<DAConnectionResult> {
  const { data: server, error } = await supabaseAdmin
    .from('servers')
    .select('hostname, api_user')
    .eq('id', serverId)
    .single();

  if (error || !server) throw new Error('Servidor não encontrado');
  const packages = await getDAPackages(serverId);
  return {
    success: true,
    hostname: server.hostname,
    apiUser: server.api_user ?? "",
    packageCount: packages.length,
    packages,
  };
}

export async function createDAAccount(serverId: string, details: {
  username: string;
  email: string;
  domain: string;
  package: string;
}) {
  const { data: server, error } = await supabaseAdmin
    .from("servers")
    .select("*")
    .eq("id", serverId)
    .single();

  if (error || !server) throw new Error("Servidor não encontrado");

  const password = generateStrongPassword(24); // Reduzido de 128 para 24 para compatibilidade com DA

  return await callDA({
    hostname: server.hostname,
    apiUser: server.api_user ?? "",
    apiToken: server.api_token ?? "",
    command: 'CMD_API_ACCOUNT_USER',
    method: 'POST',

    params: {
      action: 'create',
      add: 'Submit',
      username: details.username,
      email: details.email,
      passwd: password,
      passwd2: password,
      domain: details.domain,
      package: details.package,
      ip: server.ip_address || '',
      notify: 'no'
    }
  });
}

export async function suspendDAAccount(serverId: string, username: string) {
  const { data: server, error } = await supabaseAdmin
    .from("servers")
    .select("*")
    .eq("id", serverId)
    .single();

  if (error || !server) throw new Error("Servidor não encontrado");

  return await callDA({
    hostname: server.hostname,
    apiUser: server.api_user ?? "",
    apiToken: server.api_token ?? "",
    command: 'CMD_API_SELECT_USERS',
    method: 'POST',
    params: {
      location: 'users',
      suspend: 'Suspend',
      select0: username
    }
  });
}
export async function deleteDAAccount(serverId: string, username: string) {
  const { data: server, error } = await supabaseAdmin
    .from("servers")
    .select("*")
    .eq("id", serverId)
    .single();

  if (error || !server) throw new Error("Servidor não encontrado");

  return await callDA({
    hostname: server.hostname,
    apiUser: server.api_user ?? "",
    apiToken: server.api_token ?? "",
    command: 'CMD_API_SELECT_USERS',
    method: 'POST',
    params: {
      location: 'users',
      delete: 'Delete',
      select0: username
    }
  });
}

function isValidDirectAdminLoginUrl(value: unknown): value is string {
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

function parseDirectAdminLoginUrl(response: any, serverHostname: string): string {
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

export async function checkDAUserExists(serverId: string, username: string): Promise<boolean> {
  const { data: server, error } = await supabaseAdmin
    .from("servers")
    .select("*")
    .eq("id", serverId)
    .single();

  if (error || !server) return false;

  try {
    const result = await callDA({
      hostname: server.hostname,
      apiUser: server.api_user ?? "",
      apiToken: server.api_token ?? "",
      command: 'CMD_API_SHOW_USER_CONFIG',
      params: { user: username.trim() }
    });

    // Se o DA retornar um erro 500 ou objeto de erro, o callDA já lança exceção ou retorna o erro.
    // O DA retorna "error=0" em sucesso.
    if (result && (result.error === '1' || result.error === 1)) return false;
    
    return !!(result && (result.username || result.email || result.error === '0'));
  } catch (e) {
    // Se o erro for 500 com "You don't have control over that user", significa que o usuário não existe para este token
    const errorStr = String(e);
    if (errorStr.includes("You don't have control over that user") || errorStr.includes("Cannot show user")) {
      return false;
    }
    console.error(`[DA-Security] Erro ao verificar existência do usuário ${username}:`, e);
    return false;
  }
}

export async function getDASession(serverId: string, username: string, redirectUrl?: string) {
  const { data: server, error } = await supabaseAdmin
    .from("servers")
    .select("*")
    .eq("id", serverId)
    .single();

  if (error || !server) throw new Error("Servidor não encontrado");

  const targetUser = username.trim();
  
  // SECURITY: Hard-restrict system usernames to prevent accidental admin escalation
  const restrictedUsernames = ["admin", "root", "superuser", "da_admin", "eqsa7232", "reseller"];
  if (restrictedUsernames.includes(targetUser.toLowerCase())) {
    console.error(`[Security-DA] Attempt to login via SSO to restricted user: ${targetUser}`);
    throw new Error('Acesso negado: Não é permitido login via SSO em contas administrativas do sistema.');
  }

  if (!targetUser || targetUser.length < 3 || targetUser.includes('|') || targetUser.includes(':') || targetUser.includes(' ')) {
    throw new Error('Usuário do serviço inválido para acesso ao DirectAdmin.');
  }

  // CRITICAL: Pre-verify user existence on the remote server
  const exists = await checkDAUserExists(serverId, targetUser);
  if (!exists) {
    console.error(`[Security-Alert] SSO failed: User ${targetUser} does not exist on server ${server.hostname}`);
    throw new Error(`Falha de provisionamento: O usuário ${targetUser} não foi encontrado no servidor. Por favor, entre em contato com o suporte.`);
  }

  const delegatedApiUser = server.api_user;
  console.log(`[DA-SSO] Generating delegated session for ${targetUser} on ${server.hostname}`);

  const params: Record<string, string> = {
    action: 'create',
    type: 'one_time_url',
    user: targetUser,
    expiry: '10m',
    login_keys_notify_on_creation: '0'
  };

  if (redirectUrl && redirectUrl !== '/') {
    params['redirect-url'] = redirectUrl.startsWith('/') ? redirectUrl : `/${redirectUrl}`;
  }

  const result = await callDA({
    hostname: server.hostname,
    apiUser: delegatedApiUser,
    apiToken: server.api_token ?? "",
    command: 'CMD_API_LOGIN_KEYS',
    method: 'POST',
    params
  });

  if (result && (result.error === '1' || result.error === 1)) {
    const errorMsg = result.details || result.text || "Erro desconhecido na API do DirectAdmin";
    throw new Error(`Erro ao gerar acesso SSO: ${errorMsg}`);
  }

  console.log("DirectAdmin SSO API call completed.");
  return parseDirectAdminLoginUrl(result, server.hostname);
}



