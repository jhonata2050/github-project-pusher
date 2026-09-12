import type { ClusterServerConfig } from "../cloud-apps.server";
import { getActiveClusterServer } from "../cloud-apps.server";
import { execSshCommand, getSshConnection } from "./swarm-transport.server";
import { getOrCompute } from "../swarm-cache.server";

export interface SwarmContainerStat {
  name: string;
  containerId: string;
  cpuPercent: number;
  usedMemMb: number;
  totalMemMb: number;
  memPercent: number;
  netInKb: number;
  netOutKb: number;
  pids: number;
}

let cachedSwarmStats: Record<string, SwarmContainerStat> = {};

/**
 * Coleta estatísticas 100% reais de CPU, Memória, Rede e PIDs de todos os containers ativos no Docker Swarm.
 * Possui cache compartilhado por servidor de 15 segundos com deduplicação de chamadas concorrentes (thundering herd prevention).
 */
export async function getSwarmClusterDockerStats(serverParam?: ClusterServerConfig): Promise<Record<string, SwarmContainerStat>> {
  try {
    const server = serverParam || (await getActiveClusterServer());
    const hasSsh = Boolean(
      (server as any).sshPort ||
      (server as any).hasSwarm ||
      (server as any).sshPassword ||
      server.serverIp === "45.159.172.137"
    );

    if (!hasSsh) return cachedSwarmStats;

    const cacheKey = `swarm:stats:${server.id || server.serverIp || "default"}`;

    return await getOrCompute(cacheKey, 15000, async () => {
      const conn = await getSshConnection(server);
      try {
        const { out } = await execSshCommand(conn, 'docker stats --no-stream --format "{{json .}}"', 18000);

        const lines = out.trim().split("\n");
        const freshStats: Record<string, SwarmContainerStat> = {};

        const parseBytes = (s: string) => {
          const t = s.trim();
          if (t.includes("GiB") || t.includes("GB")) return parseFloat(t) * 1024 * 1024 * 1024;
          if (t.includes("MiB") || t.includes("MB")) return parseFloat(t) * 1024 * 1024;
          if (t.includes("KiB") || t.includes("kB") || t.includes("KB")) return parseFloat(t) * 1024;
          return parseFloat(t) || 0;
        };

        for (const line of lines) {
          try {
            const item = JSON.parse(line);
            if (!item.Name) continue;

            const cpuStr = (item.CPUPerc || "0%").replace("%", "").trim();
            const cpuPercent = parseFloat(cpuStr) || 0;

            const memParts = (item.MemUsage || "").split("/");
            const usedMemBytes = parseBytes(memParts[0] || "0");
            const totalMemBytes = parseBytes(memParts[1] || "0");

            const usedMemMb = Math.round((usedMemBytes / (1024 * 1024)) * 10) / 10;
            const totalMemMb = Math.round(totalMemBytes / (1024 * 1024));

            const memPercStr = (item.MemPerc || "0%").replace("%", "").trim();
            const memPercent = parseFloat(memPercStr) || (totalMemMb > 0 ? Math.round((usedMemMb / totalMemMb) * 100) : 0);

            const netParts = (item.NetIO || "").split("/");
            const netInBytes = parseBytes(netParts[0] || "0");
            const netOutBytes = parseBytes(netParts[1] || "0");

            freshStats[item.Name.toLowerCase()] = {
              name: item.Name,
              containerId: item.ID,
              cpuPercent,
              usedMemMb,
              totalMemMb,
              memPercent,
              netInKb: Math.round(netInBytes / 1024),
              netOutKb: Math.round(netOutBytes / 1024),
              pids: parseInt(item.PIDs, 10) || 0,
            };
          } catch {}
        }

        if (Object.keys(freshStats).length > 0) {
          cachedSwarmStats = freshStats;
        }

        return cachedSwarmStats;
      } catch (sshErr: any) {
        console.warn("[getSwarmClusterDockerStats Warning]:", sshErr.message);
        return cachedSwarmStats;
      }
    });
  } catch (e: any) {
    console.warn("[getSwarmClusterDockerStats Warning]:", e.message);
    return cachedSwarmStats;
  }
}
