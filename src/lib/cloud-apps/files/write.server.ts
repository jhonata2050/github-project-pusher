import path from "path";
import fs from "fs/promises";
import fsSync from "fs";
import { getApplicationsStore } from "../store.server";
import type { AppFileItem } from "../types";
import { getCloudApplicationFiles } from "./read.server";

export async function saveCloudApplicationFile(
  appId: string,
  filePath: string,
  content: string,
  userId: string
): Promise<AppFileItem[]> {
  const sizeBytes = new TextEncoder().encode(content).length;
  const { verifyAppDiskQuota, syncAppFilesToContainer } = await import("../../file-manager/server");
  await verifyAppDiskQuota(appId, sizeBytes, userId);

  const { resolveClientRoot, validateSafePath } = await import("../../file-manager/security");
  const clientRoot = await resolveClientRoot(appId);
  const fullPath = await validateSafePath(clientRoot, filePath);

  const dir = path.dirname(fullPath);
  if (!fsSync.existsSync(dir)) {
    await fs.mkdir(dir, { recursive: true });
  }

  await fs.writeFile(fullPath, content, "utf-8");

  const store = await getApplicationsStore();
  const app = store[appId];
  if (app) {
    const { writeRemoteSwarmFile } = await import("../../swarm-cluster.server");
    await writeRemoteSwarmFile(app, filePath, content).catch((e: any) =>
      console.warn("[saveCloudApplicationFile Swarm Warning]:", e?.message)
    );
  }

  await syncAppFilesToContainer(appId, userId);

  return getCloudApplicationFiles(appId, userId);
}

export async function saveCloudApplicationFilesBatch(
  appId: string,
  filesToSave: Array<{ path: string; content: string }>,
  userId: string
): Promise<AppFileItem[]> {
  const totalBatchBytes = filesToSave.reduce((acc, f) => acc + new TextEncoder().encode(f.content).length, 0);
  const { verifyAppDiskQuota, syncAppFilesToContainer } = await import("../../file-manager/server");
  await verifyAppDiskQuota(appId, totalBatchBytes, userId);

  const { resolveClientRoot, validateSafePath } = await import("../../file-manager/security");
  const clientRoot = await resolveClientRoot(appId);

  const store = await getApplicationsStore();
  const app = store[appId];
  const { writeRemoteSwarmFile } = await import("../../swarm-cluster.server");

  for (const item of filesToSave) {
    const fullPath = await validateSafePath(clientRoot, item.path);
    const dir = path.dirname(fullPath);
    if (!fsSync.existsSync(dir)) {
      await fs.mkdir(dir, { recursive: true });
    }
    await fs.writeFile(fullPath, item.content, "utf-8");
    if (app) {
      await writeRemoteSwarmFile(app, item.path, item.content).catch((e: any) =>
        console.warn("[saveBatch Swarm Warning]:", e?.message)
      );
    }
  }

  await syncAppFilesToContainer(appId, userId);
  return getCloudApplicationFiles(appId, userId);
}
