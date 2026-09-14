import type { ManagedConnectionEntry } from "./types.ts";
import { sshMetrics } from "./state.ts";

/**
 * Adquire um slot no semáforo de concorrência de canais da conexão.
 */
export async function acquireChannel(
  entry: ManagedConnectionEntry,
  timeoutMs: number = 45000
): Promise<void> {
  if (entry.activeChannels < entry.maxChannels) {
    entry.activeChannels++;
    sshMetrics.sshChannelsCreated++;
    return;
  }

  return new Promise<void>((resolve, reject) => {
    const timeout = setTimeout(() => {
      const idx = entry.channelQueue.findIndex((item) => item.resolve === resolve);
      if (idx !== -1) entry.channelQueue.splice(idx, 1);
      reject(new Error(`[SSH Concurrency] Timeout aguardando canal disponível no servidor ${entry.serverKey}`));
    }, timeoutMs);

    entry.channelQueue.push({
      resolve: () => {
        clearTimeout(timeout);
        entry.activeChannels++;
        sshMetrics.sshChannelsCreated++;
        resolve();
      },
      reject: (err) => {
        clearTimeout(timeout);
        reject(err);
      },
    });
  });
}

/**
 * Libera um slot no semáforo de concorrência e desperta a próxima requisição na fila.
 */
export function releaseChannel(entry: ManagedConnectionEntry): void {
  entry.activeChannels = Math.max(0, entry.activeChannels - 1);
  sshMetrics.sshChannelsReleased++;
  if (entry.channelQueue.length > 0) {
    const next = entry.channelQueue.shift();
    if (next) next.resolve();
  }
}
