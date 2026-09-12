import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { Buffer } from "buffer";
import { callDA } from "./transport.server";
import type { DAConnectionResult } from "./types";

/**
 * Package listing and capability testing operations for DirectAdmin servers.
 */

export function normalizePackageList(result: any): string[] {
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

    // Salvar o resultado em system_settings para evitar consultas repetidas e erros de schema
    try {
      await supabaseAdmin
        .from('system_settings')
        .upsert({ 
          key: `server_caps_${serverId}`,
          value: JSON.stringify({
            sso_supported: capabilities.delegated_sso,
            last_capability_check: new Date().toISOString(),
            capabilities
          })
        });
    } catch {}

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
