import fs from "fs/promises";
import fsSync from "fs";
import { getApplicationsStore } from "../store.server";
import type { AppFileItem } from "../types";
import { getCloudApplicationFiles } from "./read.server";

export async function deleteCloudApplicationFile(
  appId: string,
  filePath: string,
  userId: string
): Promise<AppFileItem[]> {
  const { resolveClientRoot, validateSafePath } = await import("../../file-manager/security");
  const { syncAppFilesToContainer } = await import("../../file-manager/server");
  const clientRoot = await resolveClientRoot(appId);
  const fullPath = await validateSafePath(clientRoot, filePath);

  if (fsSync.existsSync(fullPath)) {
    const stat = await fs.stat(fullPath);
    if (stat.isDirectory()) {
      await fs.rm(fullPath, { recursive: true, force: true });
    } else {
      await fs.unlink(fullPath);
    }
  }

  const store = await getApplicationsStore();
  const app = store[appId];
  if (app) {
    const { deleteRemoteSwarmItems } = await import("../../swarm-cluster.server");
    await deleteRemoteSwarmItems(app, [filePath]).catch((e: any) =>
      console.warn("[delete Swarm Warning]:", e?.message)
    );
  }

  await syncAppFilesToContainer(appId, userId);
  return getCloudApplicationFiles(appId, userId);
}

export async function bulkDeleteCloudApplicationFiles(
  appId: string,
  filePaths: string[],
  userId: string
): Promise<AppFileItem[]> {
  const { resolveClientRoot, validateSafePath } = await import("../../file-manager/security");
  const { syncAppFilesToContainer } = await import("../../file-manager/server");
  const clientRoot = await resolveClientRoot(appId);

  for (const p of filePaths) {
    try {
      const fullPath = await validateSafePath(clientRoot, p);
      if (fsSync.existsSync(fullPath)) {
        const stat = await fs.lstat(fullPath);
        if (stat.isDirectory()) {
          await fs.rm(fullPath, { recursive: true, force: true });
        } else {
          await fs.unlink(fullPath);
        }
      }
    } catch (e) {}
  }

  await syncAppFilesToContainer(appId, userId);
  return getCloudApplicationFiles(appId, userId);
}
