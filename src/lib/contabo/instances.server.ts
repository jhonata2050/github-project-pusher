import { getContaboToken } from "./auth.server";

export async function getContaboInstances() {
  const token = await getContaboToken();
  const res = await fetch("https://api.contabo.com/v1/compute/instances", {
    headers: {
      Authorization: `Bearer ${token}`,
      "x-request-id": crypto.randomUUID(),
    },
  });

  if (!res.ok) {
    const errorText = await res.text().catch(() => "Unknown error");
    console.error(`[Contabo] Erro ao buscar instâncias (${res.status}):`, errorText);
    throw new Error(`Falha ao buscar instâncias na Contabo (${res.status})`);
  }
  return res.json();
}

export function mapContaboSpecs(instance: any) {
  if (!instance) return { cpu_cores: null, ram_gb: null, disk_gb: null };
  const cpu = Number(instance.cpuCores ?? instance.cpu ?? 0);
  const ramMb = Number(instance.ramMb ?? instance.ram ?? 0);
  const diskMb = Number(instance.diskMb ?? instance.disk ?? 0);
  return {
    cpu_cores: cpu > 0 ? Math.round(cpu) : null,
    ram_gb: ramMb > 0 ? Math.round(ramMb / 1024) : null,
    disk_gb: diskMb > 0 ? Math.round(diskMb / 1024) : null,
  };
}

export async function getContaboInstanceDetails(externalId: string) {
  const token = await getContaboToken();
  const res = await fetch(
    `https://api.contabo.com/v1/compute/instances/${externalId}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        "x-request-id": crypto.randomUUID(),
      },
    }
  );

  if (!res.ok) {
    const errorText = await res.text().catch(() => "Unknown error");
    console.error(
      `[Contabo] Erro ao buscar detalhes da instância ${externalId} (${res.status}):`,
      errorText
    );
    throw new Error(`Falha ao buscar detalhes na Contabo (${res.status})`);
  }

  const response = await res.json();
  const instance = response.data?.[0];

  if (!instance) return null;

  const specs = mapContaboSpecs(instance);

  return {
    ...instance,
    ipAddress: instance.ipAddress || instance.addOnIps?.[0]?.ip || "N/A",
    displayName:
      instance.displayName || instance.name || `VPS ${instance.instanceId}`,
    regionName: instance.regionName || instance.region || "Desconhecida",
    osTemplate:
      instance.imageName ||
      instance.osType ||
      instance.osTemplate ||
      instance.imageId ||
      null,
    createdDate: instance.createdDate,
    productName: instance.productName || instance.productId,
    specs,
  };
}

export async function getContaboInstanceStats(externalId: string) {
  try {
    const token = await getContaboToken();

    // Tentar buscar métricas do endpoint de monitoramento
    const res = await fetch(
      `https://api.contabo.com/v1/compute/instances/${externalId}/monitoring`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "x-request-id": crypto.randomUUID(),
        },
      }
    );

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
            outbound: (latest.netOut || 0).toFixed(2),
          },
          realData: true,
          lastUpdate: new Date().toISOString(),
        };
      }
    } else if (res.status === 404 || res.status === 403) {
      console.warn(
        `[Contabo] Endpoint de monitoramento não disponível para a instância ${externalId} (Status: ${res.status}).`
      );
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
    lastUpdate: new Date().toISOString(),
  };
}
