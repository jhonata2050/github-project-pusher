import { supabaseAdmin } from "@/integrations/supabase/client.server";

async function getContaboToken() {
  const { data: settingsData } = await supabaseAdmin
      .from("system_settings")
      .select("*");
  
  const settings: Record<string, string> = {};
  settingsData?.forEach(s => {
    settings[s.key] = typeof s.value === 'string' ? s.value.trim() : String(s.value ?? '').trim();
  });
  
  const clientId = settings['contabo_client_id'] || process.env['CONTABO_CLIENT_ID'];
  const clientSecret = settings['contabo_client_secret'] || process.env['CONTABO_CLIENT_SECRET'];
  const apiUser = settings['contabo_api_user'] || process.env['CONTABO_API_USER'];
  const apiPass = settings['contabo_api_password'] || process.env['CONTABO_API_PASSWORD'];

  if (!clientId || !clientSecret || !apiUser || !apiPass) {
    throw new Error("Credenciais da API Contabo não configuradas em Admin > Financeiro.");
  }

  const params = new URLSearchParams();
  params.append('grant_type', 'password');
  params.append('client_id', clientId);
  params.append('client_secret', clientSecret);
  params.append('username', apiUser);
  params.append('password', apiPass);

  console.log("[Contabo] Tentando obter token para o usuário:", apiUser);

  const res = await fetch('https://auth.contabo.com/auth/realms/contabo/protocol/openid-connect/token', {
    method: 'POST',
    body: params,
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
  });

  if (!res.ok) {
    let detail = '';
    let errorBody: any = null;
    try {
      errorBody = await res.json();
      detail = errorBody.error_description || errorBody.error || '';
    } catch {
      detail = await res.text().catch(() => '');
    }
    
    console.error(`[Contabo] Erro na autenticação (${res.status}):`, detail);
    
    if (detail.toLowerCase().includes('invalid user credentials') || (errorBody && errorBody.error === 'invalid_grant')) {
      throw new Error(
        "Contabo recusou as credenciais (usuário/senha da API inválidos). No Painel do Cliente Contabo, em 'API', use o E-mail da API e a Senha da API (não a senha da sua conta), e confira o Client ID/Secret."
      );
    }
    throw new Error(`Falha ao autenticar na Contabo (${res.status})${detail ? `: ${detail}` : ''}`);
  }
  const authResponse = await res.json() as { access_token: string };
  return authResponse.access_token;
}

export async function getContaboInstances() {
  const token = await getContaboToken();
  const res = await fetch('https://api.contabo.com/v1/compute/instances', {
    headers: { 
      'Authorization': `Bearer ${token}`,
      'x-request-id': crypto.randomUUID()
    }
  });
  
  if (!res.ok) {
    const errorText = await res.text().catch(() => 'Unknown error');
    console.error(`[Contabo] Erro ao buscar instâncias (${res.status}):`, errorText);
    throw new Error(`Falha ao buscar instâncias na Contabo (${res.status})`);
  }
  return res.json();
}

export async function performContaboAction(instanceId: string, action: string, userId: string) {
  const { data: vpsData, error } = await supabaseAdmin
    .from('vps_instances')
    .select('external_id, service:services(user_id)')
    .eq('id', instanceId)
    .single();

  if (error || !vpsData) {
    throw new Error("Instance not found or unauthorized");
  }

  const vps = vpsData as any;
  if (vps.service.user_id !== userId) {
    throw new Error("Unauthorized access to instance");
  }

  const token = await getContaboToken();
  const contaboAction = action === 'restart' ? 'reboot' : action;
  
  const res = await fetch(`https://api.contabo.com/v1/compute/instances/${vps.external_id}/actions/${contaboAction}`, {
    method: 'POST',
    headers: { 
      'Authorization': `Bearer ${token}`,
      'x-request-id': crypto.randomUUID()
    }
  });

  if (!res.ok) {
    const errorText = await res.text().catch(() => 'Unknown error');
    console.error(`[Contabo] Erro na ação ${action} (${res.status}):`, errorText);
    throw new Error(`Falha ao executar ${action} na Contabo (${res.status})`);
  }
  return { success: true };
}

export async function getContaboProductTypes() {
  try {
    const token = await getContaboToken();
    console.log("[Contabo] Buscando catálogo de produtos via /v1/products...");
    
    // O endpoint /v1/compute/instances/products está retornando 400 (instanceId missing)
    // na API atual da Contabo. Usaremos o endpoint global /v1/products que funciona.
    const res = await fetch('https://api.contabo.com/v1/products?size=100', {
      headers: { 
        'Authorization': `Bearer ${token}`,
        'x-request-id': crypto.randomUUID()
      }
    });
    
    if (!res.ok) {
      const errorText = await res.text().catch(() => 'Unknown error');
      console.error(`[Contabo] Erro ao buscar produtos (${res.status}):`, errorText);
      throw new Error(`Falha ao buscar tipos de produtos na Contabo (${res.status}): ${errorText}`);
    }
    
    const response = await res.json();
    const allProducts = response.data || [];
    
    // Mapear para o formato esperado pela UI (productId, name, etc)
    // A API /v1/products retorna itens dentro de priceItem
    const formattedProducts = allProducts.map((p: any) => {
      const priceItem = p.priceItem || {};
      const specs = priceItem.specs || [];
      
      // Encontrar especificações nos títulos dos itens de specs
      const cpuSpec = specs.find((s: any) => s.type === 'cpu' || s.title?.toLowerCase().includes('cpu'));
      const ramSpec = specs.find((s: any) => s.type === 'ram' || s.title?.toLowerCase().includes('ram'));
      const diskSpec = specs.find((s: any) => s.type === 'storage' || s.title?.toLowerCase().includes('ssd') || s.title?.toLowerCase().includes('nvme') || s.title?.toLowerCase().includes('disk'));
      
      // Tentar extrair apenas o número da RAM para compatibilidade com o parser antigo se necessário,
      // mas aqui vamos manter a string do título para maior clareza já que a UI agora formata.
      const ramTitle = ramSpec?.title || '';
      const ramMbMatch = ramTitle.match(/(\d+)\s*GB/i);
      const ramMb = ramMbMatch ? parseInt(ramMbMatch[1]) * 1024 : 0;

      return {
        productId: priceItem.itemId || priceItem.key,
        name: priceItem.name,
        vCpu: cpuSpec?.title || 'N/A',
        ramMb: ramMb,
        ramTitle: ramTitle || 'N/A',
        diskGb: diskSpec?.title || 'N/A'
      };
    }).filter((p: any) => p.productId && p.name);

    console.log(`[Contabo] ${formattedProducts.length} produtos formatados.`);
    return formattedProducts;
  } catch (err: any) {
    console.error("[Contabo] Exceção em getContaboProductTypes:", err.message);
    throw err;
  }
}

export async function provisionContaboVPS(serviceId: string, config: any) {
  console.log("Provisioning Contabo VPS for service:", serviceId);
}
