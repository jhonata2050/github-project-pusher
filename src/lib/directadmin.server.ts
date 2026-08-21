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
  // Pré-validação das credenciais: Login Keys no formato interno "USUARIO|NOME_DA_CHAVE"
  const apiUserRaw = apiUser.trim();
  const apiTokenTrimmed = apiToken.trim();

  if (!apiUserRaw || !apiTokenTrimmed) {
    throw new Error(
      `Credenciais do servidor ${hostname} não configuradas. Preencha o "Usuário API" (formato admin|EqsamKey) e o "Token API" em Sistema > Servidores.`,
    );
  }

  // REGRA FUNDAMENTAL: Separar USERNAME e PASSWORD da Login Key
  let username = apiUserRaw;
  let password = apiTokenTrimmed;

  if (apiUserRaw.includes('|')) {
    const parts = apiUserRaw.split('|');
    username = parts[0]?.trim() || '';
    password = apiTokenTrimmed;
  }

  // SECURITY: Prevent credentials from leaking in logs or being misused
  // We strictly use the provided hostname and the port 2222 (standard DA API)
  // Clean hostname to avoid injection or malicious redirect attempts


  // Limpa o hostname e preserva a porta se especificada, caso contrário usa 2222
  const hostParts = hostname.replace(/^https?:\/\//, '').split(':');
  const cleanHostname = hostParts[0];
  const port = hostParts[1] || '2222';
  const url = `https://${cleanHostname}:${port}/${command}`;

  const searchParams = new URLSearchParams();
  // REGRA: Sempre solicitar JSON da API para validação estruturada
  const finalParams = { ...params, json: 'yes' };
  Object.entries(finalParams).forEach(([key, val]) => searchParams.append(key, val));
  
  const authString = `${username}:${password}`;
  const authHeader = `Basic ${Buffer.from(authString).toString('base64')}`;

  // DIAGNÓSTICO TÉCNICO: Logs para auditoria de identidade SSO
  if (command === 'CMD_API_LOGIN_KEYS') {
    const { createSystemLog } = await import("./system-logs.server");
    console.log(`[DA-SSO-Audit] Iniciando SSO para ${params['user'] || 'N/A'} via chave ${username}`);
    
    // Log persistente no banco para auditoria de administrador
    await createSystemLog({
      category: 'directadmin',
      level: 'info',
      message: `SSO Gerado: Alvo=${params['user']} | Autenticador=${username}`,
      metadata: { 
        targetUser: params['user'], 
        apiUser: username,
        endpoint: command,
        timestamp: new Date().toISOString()
      }
    }).catch(e => console.error("Erro ao logar auditoria SSO:", e));
  }
  
  try {
    // Removido searchParams.set('json', 'yes') duplicado, já definido acima

    const response = await fetch(url + (method === 'GET' ? `?${searchParams.toString()}` : ''), {
      method,
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json, text/plain',
      },
      body: method === 'POST' ? searchParams.toString() : null,
      signal: AbortSignal.timeout(60_000),
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
            `Verifique se a Login Key possui as permissões necessárias e se não está restrita por IP.`,
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
          `Certifique-se de que o "Usuário API" está no formato interno "USUARIO|NOME_DA_CHAVE" (ex: admin|EqsamKey) ` +
          `e que o "Token API" é o valor (Key Value) gerado.${ipGuidance}${extraInfo}`
        );
      }

      throw new Error(`DirectAdmin API Error (${response.status}): ${errorText}`);
    }


    const text = await response.text();
    try {
      const parsed = JSON.parse(text) as Record<string, any>;
      // REGRA: Se a resposta for JSON mas contiver 'error' como string "1" ou número 1, tratamos como erro da API
      if (parsed && (parsed['error'] === '1' || parsed['error'] === 1)) {
        const errorMsg = parsed['details'] || parsed['text'] || "Erro desconhecido na API do DirectAdmin";
        throw new Error(String(errorMsg));
      }
      return parsed;
    } catch (e) {
      if (e instanceof Error && !e.message.includes('Unexpected token')) throw e;
      
      if (text.trimStart().startsWith('<!DOCTYPE html') || text.includes('<html')) {
        throw new Error('O DirectAdmin retornou a tela de login em vez dos dados da API. Verifique as permissões da chave de acesso.');
      }
      
      // Fallback para URLSearchParams se não for JSON
      const parsed = Object.fromEntries(new URLSearchParams(text)) as Record<string, any>;
      if (parsed && (parsed['error'] === '1' || parsed['error'] === 1)) {
         throw new Error(String(parsed['details'] || parsed['text'] || "Erro na API (Fallback)"));
      }
      return parsed;
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

function normalizePackageList(result: any): string[] {
  if (Array.isArray(result)) return result.filter((item: any): item is string => typeof item === 'string');
  if (!result || typeof result !== 'object') return [];
  
  // DirectAdmin results for CMD_API_PACKAGES_USER often return a list in the root
  // or under 'list' or as numbered keys select0, select1...
  if ('list' in result && Array.isArray(result.list)) {
    return result.list.filter((item: any): item is string => typeof item === 'string');
  }
  
  const packages: string[] = [];
  Object.entries(result).forEach(([key, val]) => {
    if (key.startsWith('select') || key === 'list') {
      if (typeof val === 'string' && val.length > 0) packages.push(val);
    }
  });

  return packages;
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

export async function getDACapabilities(serverId: string) {
  const { data: server, error } = await supabaseAdmin
    .from('servers')
    .select('*')
    .eq('id', serverId)
    .single();

  if (error || !server) throw new Error('Servidor não encontrado');

  const capabilities = {
    cmd_api_login_keys: false,
    api_login_url: false,
    delegated_sso: false,
    error: null as string | null
  };

  try {
    // 1. Testar CMD_API_LOGIN_KEYS
    try {
      await callDA({
        hostname: server.hostname,
        apiUser: server.api_user ?? "",
        apiToken: server.api_token ?? "",
        command: 'CMD_API_LOGIN_KEYS',
        params: { action: 'list' }
      });
      capabilities.cmd_api_login_keys = true;
    } catch (e) {
      console.warn(`[DA-Capability] CMD_API_LOGIN_KEYS indisponível:`, e);
    }

    // 2. Testar /api/login/url
    const hostParts = server.hostname.replace(/^https?:\/\//, '').split(':');
    const cleanHost = hostParts[0];
    const daPort = hostParts[1] || '2222';
    const daUsername = server.api_user?.includes('|') ? (server.api_user.split('|')[0] ?? '').trim() : server.api_user;
    
    try {
      const response = await fetch(`https://${cleanHost}:${daPort}/api/login/url`, {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${Buffer.from(`${daUsername}:${server.api_token}`).toString('base64')}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({ user: daUsername, ttl: 10 }), // Testar consigo mesmo primeiro
        signal: AbortSignal.timeout(10_000),
      });
      
      if (response.ok) {
        capabilities.api_login_url = true;
        capabilities.delegated_sso = true; 
      }
    } catch (e) {
      console.warn(`[DA-Capability] /api/login/url indisponível:`, e);
    }

    // Salvar o resultado no banco para evitar consultas repetidas
    await supabaseAdmin
      .from('servers')
      .update({ 
        sso_supported: capabilities.delegated_sso,
        last_capability_check: new Date().toISOString()
      })
      .eq('id', serverId);

    return capabilities;
  } catch (e: any) {
    capabilities.error = e.message;
    return capabilities;
  }
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

  // REGRA WHMCS: Senha do DirectAdmin é gerada e separada da senha do cliente no sistema
  const daPassword = generateStrongPassword(24);

  const result = await callDA({
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
      passwd: daPassword,
      passwd2: daPassword,
      domain: details.domain,
      package: details.package,
      ip: server.ip_address || '',
      notify: 'no'
    }
  });

  // Retornamos a senha gerada para que o chamador possa salvar na tabela 'services'
  return { ...result, daPassword };
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

    const resObj = result as Record<string, any>;
    if (resObj && (resObj['error'] === '1' || resObj['error'] === 1)) {
      const details = String(resObj['details'] || resObj['text'] || "");
      if (details.includes("Cannot show user") || details.includes("does not exist")) {
        return false;
      }
      return false;
    }
    
    // Além de existir, verificamos se o tipo é estritamente 'user' para clientes
    // Se o resultado contiver usertype=reseller ou admin, e não for uma consulta de admin, podemos sinalizar
    if (resObj && resObj['usertype'] && resObj['usertype'] !== 'user' && !username.toLowerCase().includes('admin')) {
      console.warn(`[DA-Security-Warning] Usuário ${username} detectado com nível ${resObj['usertype']} no servidor ${server.hostname}`);
    }

    return !!(resObj && (resObj['username'] || resObj['email'] || resObj['error'] === '0'));
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

  if (error || !server) throw new Error("DA_INVALID_SERVER");

  const targetUser = username.trim();
  const timestamp = Date.now();
  
  // 5. VALIDAÇÕES PRIVILEGIADAS
  const restrictedUsernames = ["admin", "root", "superuser", "da_admin", "eqsa7232", "reseller", "support", "system", "operator", "manager"];
  if (restrictedUsernames.includes(targetUser.toLowerCase())) {
    console.error(`[Security-DA] Attempt to login via SSO to restricted user: ${targetUser}`);
    throw new Error('DA_DIRECTADMIN_BLOCKED');
  }

  const { createSystemLog } = await import("./system-logs.server");

  // 1 & 2. REMOVER FLUXO INCORRETO E USAR FLUXO OFICIAL VALIDADO
  // O fluxo POST /api/login/url com JSON foi removido conforme instrução.
  console.log(`[DA-SSO] Gerando One-Time URL para ${targetUser} via CMD_API_LOGIN_KEYS com impersonation`);

  // REGRA DE IMPERSONATION: Para que a sessão pertença ao usuário alvo, a autenticação
  // deve ser feita no formato "RESELLER|USUARIO".
  const apiUserBase = (server.api_user || '').split('|')[0] || '';
  const effectiveApiUser = `${apiUserBase}|${targetUser}`;

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
  if (apiAdmin && loginUrl.toLowerCase().includes(`user=${apiAdmin.toLowerCase()}`) && targetUser.toLowerCase() !== apiAdmin.toLowerCase()) {
     console.error(`[SSO-Security-Violation] Admin Leak Detected in URL! Target=${targetUser}, Admin=${apiAdmin}`);
     throw new Error("DA_DIRECTADMIN_BLOCKED");
  }

  return loginUrl;
}




