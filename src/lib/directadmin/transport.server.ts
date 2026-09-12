import { Buffer } from "buffer";
import type { DARequestOptions } from "./types";

/**
 * DirectAdmin API HTTP transport layer.
 * Formats authentication headers, handles impersonation, and translates responses.
 */
export async function callDA({ hostname, apiUser, apiToken, command, method = 'GET', params = {} }: DARequestOptions) {
  // Pré-validação das credenciais: Login Keys no formato interno "USUARIO|NOME_DA_CHAVE"
  const apiUserRaw = apiUser.trim();
  const apiTokenTrimmed = apiToken.trim();

  if (!apiUserRaw || !apiTokenTrimmed) {
    throw new Error(
      `Credenciais do servidor ${hostname} não configuradas. Preencha o "Usuário API" (formato admin|EqsamKey) e o "Token API" em Sistema > Servidores.`,
    );
  }

  // REGRA FUNDAMENTAL: Separar USERNAME e PASSWORD da Login Key.
  // Suporte a impersonation no formato "RESELLER|USUARIO|NOME_CHAVE" ou "RESELLER|NOME_CHAVE"
  let username = apiUserRaw;
  let password = apiTokenTrimmed;

  if (apiUserRaw.includes('|')) {
    const parts = apiUserRaw.split('|');
    if (parts.length >= 3) {
      // Formato com impersonation: reseller|target|keyname
      // O DirectAdmin exige "reseller|target" como usuário na autenticação básica
      username = `${parts[0]}|${parts[1]}`;
    } else {
      // Formato padrão: reseller|keyname
      username = parts[0]?.trim() || '';
    }
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
    const { createSystemLog } = await import("../system-logs.server");
    const isImpersonated = username.includes('|');
    console.log(`[DA-SSO-Audit] SSO para ${params['user'] || 'N/A'} | Auth=${username} | Impersonated=${isImpersonated}`);
    
    // Log persistente no banco para auditoria de administrador
    await createSystemLog({
      category: 'directadmin',
      level: 'info',
      message: `Requisição SSO: Alvo=${params['user']} | Autenticador=${username}`,
      metadata: { 
        targetUser: params['user'], 
        apiUser: username,
        isImpersonated,
        endpoint: command,
        timestamp: new Date().toISOString()
      }
    }).catch(e => console.error("Erro ao logar auditoria SSO:", e));
  }
  
  try {
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
