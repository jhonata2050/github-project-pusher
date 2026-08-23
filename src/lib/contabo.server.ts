import { supabaseAdmin } from "@/integrations/supabase/client.server";

async function getContaboToken() {
  const { data: settingsData } = await supabaseAdmin
      .from("system_settings")
      .select("*");
  
  const settings: Record<string, string> = {};
  settingsData?.forEach((s: any) => {
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

  return performContaboActionByExternalId(vps.external_id, action);
}

export async function performContaboActionByExternalId(externalId: string, action: string) {
  const token = await getContaboToken();
  const contaboAction = action === 'restart' ? 'reboot' : action;

  const res = await fetch(`https://api.contabo.com/v1/compute/instances/${externalId}/actions/${contaboAction}`, {
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
    
    // Mapear e categorizar produtos
    const categorized: Record<string, any[]> = {};

    allProducts.forEach((p: any) => {
      const priceItem = p.priceItem || {};
      const specs = priceItem.specs || [];
      
      const cpuSpec = specs.find((s: any) => s.type === 'cpu' || s.title?.toLowerCase().includes('cpu'));
      const ramSpec = specs.find((s: any) => s.type === 'ram' || s.title?.toLowerCase().includes('ram'));
      const diskSpec = specs.find((s: any) => s.type === 'storage' || s.title?.toLowerCase().includes('ssd') || s.title?.toLowerCase().includes('nvme') || s.title?.toLowerCase().includes('disk'));
      
      const ramTitle = ramSpec?.title || '';
      const ramMbMatch = ramTitle.match(/(\d+)\s*GB/i);
      const ramMb = ramMbMatch ? parseInt(ramMbMatch[1]) * 1024 : 0;

      const product = {
        productId: priceItem.itemId || priceItem.key,
        name: priceItem.name,
        vCpu: cpuSpec?.title || 'N/A',
        ramMb: ramMb,
        ramTitle: ramTitle || 'N/A',
        diskGb: diskSpec?.title || 'N/A'
      };

      if (!product.productId || !product.name) return;

      // Determinar categoria pelo nome
      let category = "Outros";
      const name = product.name.toLowerCase();
      if (name.includes("vds")) category = "VDS (Dedicated Servers)";
      else if (name.includes("vps") && name.includes("storage")) category = "Storage VPS";
      else if (name.includes("vps")) category = "Cloud VPS";

      if (!categorized[category]) categorized[category] = [];
      categorized[category]?.push(product);
    });

    // Converter para array ordenado por categoria
    const result = Object.entries(categorized).map(([category, items]) => ({
      category,
      items: items.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }))
    })).sort((a, b) => a.category.localeCompare(b.category));

    console.log(`[Contabo] ${allProducts.length} produtos processados em ${result.length} categorias.`);
    return result;
  } catch (err: any) {
    console.error("[Contabo] Exceção em getContaboProductTypes:", err.message);
    throw err;
  }
}

export async function provisionContaboVPS(serviceId: string, config: any) {
  if (!config?.productId) throw new Error("O plano VPS não possui um produto externo vinculado");
  if (!config?.hostname || !config?.imageId || !config?.region) {
    throw new Error("Configuração de hostname, sistema operacional ou região incompleta");
  }

  const periodByCycle: Record<string, number> = {
    monthly: 1,
    quarterly: 3,
    semiannually: 6,
    annually: 12,
    biennially: 12,
  };
  const regionAliases: Record<string, string> = {
    "eu-ger": "EU",
    "us-east": "US-east",
    "us-west": "US-west",
    "br-sp": "BR",
  };

  const token = await getContaboToken();
  const res = await fetch('https://api.contabo.com/v1/compute/instances', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      'x-request-id': crypto.randomUUID(),
    },
    body: JSON.stringify({
      productId: config.productId,
      imageId: config.imageId,
      region: regionAliases[config.region] || config.region,
      period: periodByCycle[config.billingCycle] || 1,
      displayName: config.hostname,
    }),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    console.error(`[Contabo] Falha ao criar VPS (${res.status}):`, detail);
    throw new Error(`O provedor recusou o provisionamento da VPS (${res.status})`);
  }

  const response = await res.json() as { data?: Array<Record<string, any>> | Record<string, any> };
  const created = Array.isArray(response.data) ? response.data[0] : response.data;
  const externalId = created?.instanceId ?? created?.id;
  if (!externalId) throw new Error("O provedor não retornou o identificador da nova VPS");

  const ipAddress = created?.ipAddress ?? created?.addOnIps?.[0]?.ip ?? null;
  const status = String(created?.status || 'provisioning').toLowerCase();
  const { data: instance, error } = await supabaseAdmin
    .from('vps_instances')
    .upsert({
      service_id: serviceId,
      external_id: String(externalId),
      provider_id: String(externalId),
      ip_address: ipAddress,
      status,
      region: regionAliases[config.region] || config.region,
      os_template: config.imageId,
    }, { onConflict: 'service_id' })
    .select('id, external_id, status')
    .single();

  if (error || !instance) throw new Error("A VPS foi criada, mas não foi possível vinculá-la ao serviço");

  await supabaseAdmin.from('services').update({
    status: status === 'active' || status === 'running' ? 'active' : 'pending',
    notes: 'Provisionamento automático da VPS iniciado.',
    error_message: null,
  }).eq('id', serviceId);

  return { externalId: instance.external_id, status: instance.status };
}

export async function getContaboInstanceDetails(externalId: string) {
  const token = await getContaboToken();
  const res = await fetch(`https://api.contabo.com/v1/compute/instances/${externalId}`, {
    headers: { 
      'Authorization': `Bearer ${token}`,
      'x-request-id': crypto.randomUUID()
    }
  });

  if (!res.ok) {
    const errorText = await res.text().catch(() => 'Unknown error');
    console.error(`[Contabo] Erro ao buscar detalhes da instância ${externalId} (${res.status}):`, errorText);
    throw new Error(`Falha ao buscar detalhes na Contabo (${res.status})`);
  }
  
  const response = await res.json();
  const instance = response.data?.[0];
  
  if (!instance) return null;

  // Enriquecer com dados de imagem se disponíveis no catálogo
  return {
    ...instance,
    ipAddress: instance.ipAddress || (instance.addOnIps?.[0]?.ip) || 'N/A',
    displayName: instance.displayName || instance.name || `VPS ${instance.instanceId}`,
    regionName: instance.region || 'Desconhecida',
    createdDate: instance.createdDate,
    productName: instance.productName || instance.productId,
  };
}

export async function getContaboInstanceStats(externalId: string) {
  try {
    const token = await getContaboToken();
    
    // Tentar buscar métricas do endpoint de monitoramento
    const res = await fetch(`https://api.contabo.com/v1/compute/instances/${externalId}/monitoring`, {
      headers: { 
        'Authorization': `Bearer ${token}`,
        'x-request-id': crypto.randomUUID()
      }
    });

    if (res.ok) {
      const monitoringData = await res.json();
      if (monitoringData.data && monitoringData.data.length > 0) {
        const latest = monitoringData.data[0];
        return {
          cpu: { usage: Math.round(latest.cpuUsage || 0) },
          ram: { usage: Math.round(latest.ramUsage || 0) },
          disk: { usage: Math.round(latest.diskUsage || 0) },
          network: {
            inbound: (latest.netIn || 0).toFixed(2),
            outbound: (latest.netOut || 0).toFixed(2)
          },
          realData: true,
          lastUpdate: new Date().toISOString()
        };
      }
    } else if (res.status === 404 || res.status === 403) {
      console.warn(`[Contabo] Endpoint de monitoramento não disponível para a instância ${externalId} (Status: ${res.status}).`);
    }
  } catch (e: any) {
    console.warn("[Contabo] Erro ao buscar métricas reais:", e.message);
  }

  // Se não conseguirmos dados reais, retornamos null para as métricas dinâmicas
  // O frontend decidirá se mostra um estado "Indisponível" ou dados baseados em status estático.
  return {
    cpu: null,
    ram: null,
    disk: null,
    network: null,
    realData: false,
    agentRequired: true,
    lastUpdate: new Date().toISOString()
  };
}
