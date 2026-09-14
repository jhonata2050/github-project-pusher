import { verifyAppAuthorization, resolveClientRoot } from "../security";
import {
  listRealDirectory,
  readRealFileContent,
  searchRealFiles,
  auditLogOperation,
  calculateDirectorySize,
} from "../filesystem";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { getApplicationsStore } from "@/lib/cloud-apps.server";
import type {
  IFileListResult,
  IFileReadResult,
  IFileInfo,
} from "../types";

/**
 * Valida se a adição de novos bytes respeita a cota de disco do plano do cliente.
 */
export async function verifyAppDiskQuota(
  appId: string,
  additionalBytes: number,
  userId: string
): Promise<{ allowed: boolean; usedBytes: number; quotaBytes: number; planName: string }> {
  const store = await getApplicationsStore();
  const app = store[appId];
  if (!app) throw new Error("Aplicação não encontrada");

  let diskQuotaMb = (app as any).disk_limit_mb;
  let planName = "Plano Cloud";

  if (app.service_id) {
    const { data: service } = await supabaseAdmin
      .from("services")
      .select("id, products(id, name, disk_quota_mb)")
      .eq("id", app.service_id)
      .maybeSingle();

    if (service?.products?.disk_quota_mb) {
      diskQuotaMb = service.products.disk_quota_mb;
    }
    if (service?.products?.name) {
      planName = service.products.name;
    }
  }

  // Fallback padrão se não configurado: 2.048 MB (2 GB)
  if (!diskQuotaMb || diskQuotaMb <= 0) {
    diskQuotaMb = 2048;
  }

  const quotaBytes = diskQuotaMb * 1024 * 1024;
  const clientRoot = await resolveClientRoot(appId);
  const currentUsedBytes = await calculateDirectorySize(clientRoot);

  if (currentUsedBytes + additionalBytes > quotaBytes) {
    const quotaFormatted = diskQuotaMb >= 1024 
      ? `${(diskQuotaMb / 1024).toFixed(1)} GB` 
      : `${diskQuotaMb} MB`;
    const usedFormatted = `${(currentUsedBytes / (1024 * 1024)).toFixed(1)} MB`;
    const attemptedFormatted = `${(additionalBytes / (1024 * 1024)).toFixed(1)} MB`;

    throw new Error(
      `Espaço em disco insuficiente. Seu plano (${planName}) permite até ${quotaFormatted}. ` +
      `Uso atual: ${usedFormatted}, tentativa de gravação: ${attemptedFormatted}. ` +
      `Faça um upgrade de plano para aumentar seu armazenamento.`
    );
  }

  return {
    allowed: true,
    usedBytes: currentUsedBytes,
    quotaBytes,
    planName,
  };
}

export async function listAppFiles(
  appId: string,
  relativePath: string = "",
  showHidden: boolean = true,
  userId: string
): Promise<IFileListResult> {
  const app = await verifyAppAuthorization(appId, userId);
  const clientRoot = await resolveClientRoot(appId);
  const { getTemplateContainerRoot } = await import("../template-definitions");
  const documentRoot = getTemplateContainerRoot(app.template_id, app.build_pack);
  return listRealDirectory(clientRoot, relativePath, showHidden, documentRoot);
}

export async function readAppFile(
  appId: string,
  filePath: string,
  userId: string
): Promise<IFileReadResult> {
  await verifyAppAuthorization(appId, userId);
  const clientRoot = await resolveClientRoot(appId);
  const result = await readRealFileContent(clientRoot, filePath);
  await auditLogOperation(userId, appId, "READ", { path: filePath, size: result.size });
  return result;
}

export async function searchAppFiles(
  appId: string,
  query: string,
  startDir: string = "",
  userId: string
): Promise<IFileInfo[]> {
  await verifyAppAuthorization(appId, userId);
  const clientRoot = await resolveClientRoot(appId);
  return searchRealFiles(clientRoot, query, startDir);
}
