import { verifyAppAuthorization, resolveClientRoot } from "../security";
import {
  writeRealFileContent,
  createRealFile,
  createRealDirectory,
  deleteRealItems,
  renameRealItem,
  copyRealItems,
  moveRealItems,
  chmodRealItem,
  auditLogOperation,
} from "../filesystem";
import { getApplicationsStore } from "@/lib/cloud-apps.server";
import { verifyAppDiskQuota } from "./quota-and-read.server";
import { syncAppFilesToContainer } from "./archives-and-sync.server";
import type {
  IFileWriteResult,
  IFileInfo,
  IChmodResult,
} from "../types";

export async function writeAppFile(
  appId: string,
  filePath: string,
  content: string,
  expectedSha256: string | undefined,
  force: boolean = false,
  userId: string
): Promise<IFileWriteResult> {
  await verifyAppAuthorization(appId, userId);
  const additionalBytes = new TextEncoder().encode(content).length;
  await verifyAppDiskQuota(appId, additionalBytes, userId);

  const clientRoot = await resolveClientRoot(appId);
  const result = await writeRealFileContent(clientRoot, filePath, content, expectedSha256, force);
  await auditLogOperation(userId, appId, "WRITE", { path: filePath, size: result.size, sha256: result.sha256 });

  // 1. Gravação direta no host e container Swarm (tempo real ~50ms)
  try {
    const store = await getApplicationsStore();
    const app = store[appId];
    if (app && app.status !== "provisioning") {
      const { writeRemoteSwarmFile } = await import("@/lib/swarm-cluster.server");
      await writeRemoteSwarmFile(app, filePath, content);
    }
  } catch (swarmErr: any) {
    console.warn("[writeAppFile Direct Swarm Warning]:", swarmErr.message);
  }

  // 2. Backup e sincronização em segundo plano
  syncAppFilesToContainer(appId).catch((err: any) => console.warn("[writeAppFile Sync Warning]:", err?.message));
  return result;
}

export async function createAppFile(
  appId: string,
  filePath: string,
  initialContent: string = "",
  userId: string
): Promise<IFileInfo> {
  await verifyAppAuthorization(appId, userId);
  const additionalBytes = new TextEncoder().encode(initialContent).length;
  await verifyAppDiskQuota(appId, additionalBytes, userId);

  const clientRoot = await resolveClientRoot(appId);
  const result = await createRealFile(clientRoot, filePath, initialContent);
  await auditLogOperation(userId, appId, "CREATE_FILE", { path: filePath });

  try {
    const store = await getApplicationsStore();
    const app = store[appId];
    if (app && app.status !== "provisioning") {
      const { writeRemoteSwarmFile } = await import("@/lib/swarm-cluster.server");
      await writeRemoteSwarmFile(app, filePath, initialContent);
    }
  } catch (swarmErr: any) {
    console.warn("[createAppFile Direct Swarm Warning]:", swarmErr.message);
  }

  syncAppFilesToContainer(appId).catch((err: any) => console.warn("[createAppFile Sync Warning]:", err?.message));
  return result;
}

export async function createAppDirectory(
  appId: string,
  dirPath: string,
  userId: string
): Promise<IFileInfo> {
  await verifyAppAuthorization(appId, userId);
  const clientRoot = await resolveClientRoot(appId);
  const result = await createRealDirectory(clientRoot, dirPath);
  await auditLogOperation(userId, appId, "CREATE_DIR", { path: dirPath });

  try {
    const store = await getApplicationsStore();
    const app = store[appId];
    if (app && app.status !== "provisioning") {
      const { createRemoteSwarmDirectory } = await import("@/lib/swarm-cluster.server");
      await createRemoteSwarmDirectory(app, dirPath);
    }
  } catch (swarmErr: any) {
    console.warn("[createAppDirectory Direct Swarm Warning]:", swarmErr.message);
  }

  syncAppFilesToContainer(appId).catch((err: any) => console.warn("[createAppDirectory Sync Warning]:", err?.message));
  return result;
}

export async function deleteAppItems(
  appId: string,
  paths: string[],
  useTrash: boolean = false,
  userId: string
): Promise<{ deleted: string[]; failed: string[] }> {
  await verifyAppAuthorization(appId, userId);
  const clientRoot = await resolveClientRoot(appId);
  const result = await deleteRealItems(clientRoot, paths, useTrash);
  await auditLogOperation(userId, appId, "DELETE", { paths, deleted: result.deleted, failed: result.failed });

  try {
    const store = await getApplicationsStore();
    const app = store[appId];
    if (app && app.status !== "provisioning" && result.deleted.length > 0) {
      const { deleteRemoteSwarmItems } = await import("@/lib/swarm-cluster.server");
      await deleteRemoteSwarmItems(app, result.deleted);
    }
  } catch (swarmErr: any) {
    console.warn("[deleteAppItems Direct Swarm Warning]:", swarmErr.message);
  }

  syncAppFilesToContainer(appId).catch((err: any) => console.warn("[deleteAppItems Sync Warning]:", err?.message));
  return result;
}

export async function renameAppItem(
  appId: string,
  oldPath: string,
  newName: string,
  userId: string
): Promise<IFileInfo> {
  await verifyAppAuthorization(appId, userId);
  const clientRoot = await resolveClientRoot(appId);
  const result = await renameRealItem(clientRoot, oldPath, newName);
  await auditLogOperation(userId, appId, "RENAME", { oldPath, newName, newPath: result.path });
  await syncAppFilesToContainer(appId).catch((err: any) => console.warn("[renameAppItem Sync Warning]:", err?.message));
  return result;
}

export async function copyAppItems(
  appId: string,
  paths: string[],
  targetDir: string,
  userId: string
): Promise<string[]> {
  await verifyAppAuthorization(appId, userId);
  const clientRoot = await resolveClientRoot(appId);
  const result = await copyRealItems(clientRoot, paths, targetDir);
  await auditLogOperation(userId, appId, "COPY", { paths, targetDir, copiedCount: result.length });
  await syncAppFilesToContainer(appId).catch((err: any) => console.warn("[copyAppItems Sync Warning]:", err?.message));
  return result;
}

export async function moveAppItems(
  appId: string,
  paths: string[],
  targetDir: string,
  userId: string
): Promise<string[]> {
  await verifyAppAuthorization(appId, userId);
  const clientRoot = await resolveClientRoot(appId);
  const result = await moveRealItems(clientRoot, paths, targetDir);
  await auditLogOperation(userId, appId, "MOVE", { paths, targetDir, movedCount: result.length });
  await syncAppFilesToContainer(appId).catch((err: any) => console.warn("[moveAppItems Sync Warning]:", err?.message));
  return result;
}

export async function chmodAppItem(
  appId: string,
  filePath: string,
  modeOctal: string,
  userId: string
): Promise<IChmodResult> {
  await verifyAppAuthorization(appId, userId);
  const clientRoot = await resolveClientRoot(appId);
  const result = await chmodRealItem(clientRoot, filePath, modeOctal);
  await auditLogOperation(userId, appId, "CHMOD", { path: filePath, permissions: modeOctal });
  return result;
}
