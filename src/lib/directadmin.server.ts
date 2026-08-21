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

type DAConnectionResult =
  | {
      success: true;
      hostname: string;
      apiUser: string;
      packageCount: number;
      packages: string[];
    }
  | {
      success: false;
      hostname: string;
      error: string;
    };

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


export async function callDA({ hostname, apiUser, apiToken, command, method = 'GET', params = {} }: DARequestOptions) {
  // Pré-validação das credenciais: Login Keys exigem "USUARIO|NOME_DA_CHAVE"
  if (!apiUser.trim() || !apiToken.trim()) {
    throw new Error(
      `Credenciais do servidor ${hostname} não configuradas. Preencha o "Usuário API" (formato admin|NOME_DA_CHAVE) e o "Token API" em Sistema > Servidores.`,
    );
  }
  if (!apiUser.includes('|')) {
    throw new Error(
      `Credenciais inválidas no servidor ${hostname}: o "Usuário API" está como "${apiUser.trim()}", mas o DirectAdmin exige o formato "USUARIO|NOME_DA_CHAVE" (ex: admin|${apiUser.trim()}). ` +
        `Corrija em Sistema > Servidores usando o usuário dono da Login Key seguido de "|" e o nome da chave; o "Token API" deve ser o Key Value gerado.`,
    );
  }

  // Limpa o hostname e preserva a porta se especificada, caso contrário usa 2222
  const hostParts = hostname.replace(/^https?:\/\//, '').split(':');
  const cleanHostname = hostParts[0];
  const port = hostParts[1] || '2222';
  const url = `https://${cleanHostname}:${port}/${command}`;

  
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
      if (response.status === 403 && /not allowed|Access Denied/i.test(errorText)) {
        throw new Error(
          `A chave de API do DirectAdmin não tem permissão para o comando "${command}". ` +
            `No DirectAdmin, edite a Login Key/Token usada (usuário ${apiUser}) e libere TODOS os comandos a seguir: ` +
            `CMD_API_PACKAGES_USER, CMD_API_ACCOUNT_USER, CMD_API_SHOW_USER_CONFIG, CMD_API_SELECT_USERS, CMD_API_LOGIN_KEYS e CMD_API_USER_DOMAIN_LIST ` +
            `(ou marque "All commands"). Verifique também se a chave não está restrita por IP.`,
        );
      }
      if (response.status === 401) {
        const reportedClientIp = errorText.match(/"client_ip"\s*:\s*"([^"]+)"/)?.[1] || 
                               errorText.match(/client_ip=([^&]+)/)?.[1];
        
        console.log(`[DirectAdmin-401] Host: ${hostname}, API User: ${apiUser}, IP: ${reportedClientIp}, Body: ${errorText}`);

        const ipGuidance = reportedClientIp === '127.0.0.1'
          ? ` O servidor informou client_ip 127.0.0.1. Isso ocorre quando o DirectAdmin está atrás de proxy: remova a restrição de IP da Login Key ou inclua 127.0.0.1 nos IPs permitidos.`
          : reportedClientIp
            ? ` O DirectAdmin identificou o IP ${reportedClientIp}; ele PRECISA estar permitido na Login Key (Whitelist de IP).`
            : ` Certifique-se de que o IP 34.91.200.163 está permitido na Login Key.`;
        
        let extraInfo = "";
        if (errorText.includes("Invalid login") || errorText.includes("Authentication failed")) {
          extraInfo = " O DirectAdmin rejeitou o par Usuário|Chave e Token. Verifique se não há espaços extras e se a chave não expirou.";
        }

        throw new Error(
          `Falha na autenticação (401): O DirectAdmin não reconheceu as credenciais. ` +
          `Certifique-se de que o "Usuário API" está no formato "USUARIO|NOME_DA_CHAVE" (ex: admin|EqsamKey) ` +
          `e que o "Token API" é o valor (Key Value) gerado.${ipGuidance}${extraInfo}`
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
  try {
    const packages = await getDAPackages(serverId);
    return {
      success: true,
      hostname: server.hostname,
      apiUser: server.api_user ?? "",
      packageCount: packages.length,
      packages,
    };
  } catch (error: unknown) {
    return {
      success: false,
      hostname: server.hostname,
      error: error instanceof Error ? error.message : 'Não foi possível validar a conexão.',
    };
  }
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

export async function checkDAUserExists(serverId: string, username: string, serviceId?: string): Promise<boolean> {
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

    if (result && (result.error === '1' || result.error === 1)) {
      const details = String(result.details || result.text || "");
      if (details.includes("Cannot show user") || details.includes("does not exist")) {
        return false;
      }
      return false;
    }
    
    // Além de existir, verificamos se o tipo é estritamente 'user' para clientes
    // Se o resultado contiver usertype=reseller ou admin, e não for uma consulta de admin, podemos sinalizar
    if (result && result.usertype && result.usertype !== 'user' && !username.toLowerCase().includes('admin')) {
      console.warn(`[DA-Security-Warning] Usuário ${username} detectado com nível ${result.usertype} no servidor ${server.hostname}`);
    }

    return !!(result && (result.username || result.email || result.error === '0'));
  } catch (e) {
    const errorStr = String(e);
    
    // Conflitos ou falta de permissão
    if (errorStr.includes("You don't have control over that user") || errorStr.includes("Cannot show user")) {
      // Se caímos aqui, o usuário existe mas não pertence a este token API (CONFLITO DE DOMÍNIO/USUÁRIO)
      if (serviceId) {
        console.error(`[DA-Security-Conflict] Usuário ${username} já existe em outro revendedor no servidor ${server.hostname}`);
        
        const { createSystemLog } = await import("./system-logs.server");
        const { data: service } = await supabaseAdmin.from("services").select("user_id").eq("id", serviceId).single();
        
        await createSystemLog({
          category: 'directadmin',
          level: 'critical',
          message: `CONFLITO DE DOMÍNIO: O usuário/domínio ${username} já existe no servidor ${server.hostname} sob outro controle.`,
          serviceId,
          actorId: service?.user_id,
          metadata: { serverId, username, serverHostname: server.hostname, error: errorStr }
        });

        // Bloqueio imediato do serviço
        await supabaseAdmin.from("services").update({
          block_directadmin: true,
          status: 'suspended',
          notes: "BLOQUEIO DE SEGURANÇA: Conflito de domínio detectado no servidor. Por favor, contate o suporte para resolução.",
          updated_at: new Date().toISOString()
        } as any).eq("id", serviceId);
        
        // Notificar via WhatsApp sobre o conflito
        const { notifyAdminWhatsApp } = await import("./whatsapp.server");
        await notifyAdminWhatsApp(
          `⚠️ *CONFLITO DE SEGURANÇA (DA)*\n\n*Domínio:* ${username}\n*Servidor:* ${server.hostname}\n*Ação:* Serviço suspenso automaticamente para evitar acesso indevido.\n\nVerifique o painel de auditoria.`,
          "security_conflict"
        );
      }
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
  const exists = await checkDAUserExists(serverId, targetUser, undefined); // No serviceId context here usually
  if (!exists) {
    console.error(`[Security-Alert] SSO failed: User ${targetUser} does not exist on server ${server.hostname}`);
    throw new Error(`Acesso Negado: O usuário ${targetUser} não foi encontrado no servidor. Se este problema persistir após o pagamento, entre em contato com o suporte.`);
  }

  const delegatedApiUser = server.api_user;
  console.log(`[DA-SSO] Generating delegated session for ${targetUser} on ${server.hostname}`);

  const params: Record<string, string> = {
    action: 'create',
    type: 'one_time_url',
    user: targetUser,
    expiry: '10m',
    login_keys_notify_on_creation: '0',
    // Segurança adicional: restringir explicitamente o nível de acesso da chave
    // O DirectAdmin permite restringir comandos, mas para SSO delegamos ao usuário alvo.
    // Garante que a chave seja destruída após o primeiro uso
    uses: '1'
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



