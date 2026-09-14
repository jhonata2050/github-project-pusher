import path from "path";
import fs from "fs/promises";
import fsSync from "fs";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

/**
 * REGISTRO DE AUDITORIA NO BANCO DE DADOS
 */
export async function auditLogOperation(
  userId: string,
  appId: string,
  action: string,
  details: any
): Promise<void> {
  try {
    await supabaseAdmin.from("audit_logs").insert({
      actor_id: userId,
      action: `file_manager.${action.toLowerCase()}`,
      resource_type: "application",
      resource_id: appId,
      metadata: {
        ...details,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (err) {
    console.warn("[Audit Log Warning]:", err);
  }
}

/**
 * Calcula recursivamente o tamanho total (em bytes) de um diretório no filesystem.
 */
export async function calculateDirectorySize(dirPath: string): Promise<number> {
  let totalBytes = 0;
  try {
    if (!fsSync.existsSync(dirPath)) return 0;
    const entries = await fs.readdir(dirPath, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name);
      if (entry.isDirectory()) {
        totalBytes += await calculateDirectorySize(fullPath);
      } else if (entry.isFile()) {
        try {
          const stats = await fs.stat(fullPath);
          totalBytes += stats.size;
        } catch {
          // Arquivo pode ter sido removido concorrentemente
        }
      }
    }
  } catch (err) {
    console.warn(`[Disk Usage Warning] Falha ao calcular diretório ${dirPath}:`, err);
  }
  return totalBytes;
}
