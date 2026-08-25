import { verifyAppAuthorization, resolveClientRoot } from "./security";
import {
  listRealDirectory,
  readRealFileContent,
  writeRealFileContent,
  createRealFile,
  createRealDirectory,
  deleteRealItems,
  renameRealItem,
  copyRealItems,
  moveRealItems,
  chmodRealItem,
  compressRealItems,
  extractRealArchive,
  searchRealFiles,
  auditLogOperation,
} from "./filesystem";
import type {
  IFileListResult,
  IFileReadResult,
  IFileWriteResult,
  IFileInfo,
  IChmodResult,
} from "./types";

export async function listAppFiles(
  appId: string,
  relativePath: string = "",
  showHidden: boolean = true,
  userId: string
): Promise<IFileListResult> {
  await verifyAppAuthorization(appId, userId);
  const clientRoot = await resolveClientRoot(appId);
  return listRealDirectory(clientRoot, relativePath, showHidden);
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

export async function writeAppFile(
  appId: string,
  filePath: string,
  content: string,
  expectedSha256: string | undefined,
  force: boolean = false,
  userId: string
): Promise<IFileWriteResult> {
  await verifyAppAuthorization(appId, userId);
  const clientRoot = await resolveClientRoot(appId);
  const result = await writeRealFileContent(clientRoot, filePath, content, expectedSha256, force);
  await auditLogOperation(userId, appId, "WRITE", { path: filePath, size: result.size, sha256: result.sha256 });
  syncAppFilesToCoolify(appId).catch(() => {});
  return result;
}

export async function createAppFile(
  appId: string,
  filePath: string,
  initialContent: string = "",
  userId: string
): Promise<IFileInfo> {
  await verifyAppAuthorization(appId, userId);
  const clientRoot = await resolveClientRoot(appId);
  const result = await createRealFile(clientRoot, filePath, initialContent);
  await auditLogOperation(userId, appId, "CREATE_FILE", { path: filePath });
  syncAppFilesToCoolify(appId).catch(() => {});
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
  syncAppFilesToCoolify(appId).catch(() => {});
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
  syncAppFilesToCoolify(appId).catch(() => {});
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
  syncAppFilesToCoolify(appId).catch(() => {});
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
  syncAppFilesToCoolify(appId).catch(() => {});
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
  syncAppFilesToCoolify(appId).catch(() => {});
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

export async function compressAppItems(
  appId: string,
  paths: string[],
  archiveName: string,
  targetDir: string,
  userId: string
): Promise<IFileInfo> {
  await verifyAppAuthorization(appId, userId);
  const clientRoot = await resolveClientRoot(appId);
  const result = await compressRealItems(clientRoot, paths, archiveName, targetDir);
  await auditLogOperation(userId, appId, "COMPRESS", { paths, archiveName, targetDir });
  return result;
}

export async function extractAppArchive(
  appId: string,
  archivePath: string,
  targetDir: string,
  userId: string
): Promise<{ extractedCount: number }> {
  await verifyAppAuthorization(appId, userId);
  const clientRoot = await resolveClientRoot(appId);
  const extractedCount = await extractRealArchive(clientRoot, archivePath, targetDir);
  await auditLogOperation(userId, appId, "EXTRACT", { archivePath, targetDir, extractedCount });
  syncAppFilesToCoolify(appId).catch(() => {});
  return { extractedCount };
}

export async function uploadAppFilesBatch(
  appId: string,
  targetDir: string,
  files: Array<{ name: string; contentBase64: string }>,
  userId: string
): Promise<{ savedCount: number; files: string[] }> {
  await verifyAppAuthorization(appId, userId);
  const clientRoot = await resolveClientRoot(appId);
  const savedFiles: string[] = [];

  for (const item of files) {
    const cleanName = item.name.replace(/^[\/\\]+/, "");
    const fullPath = await (await import("./security")).validateSafePath(clientRoot, targetDir ? `${targetDir}/${cleanName}` : cleanName);
    const parentDir = (await import("path")).dirname(fullPath);
    if (!(await import("fs")).existsSync(parentDir)) {
      await (await import("fs/promises")).mkdir(parentDir, { recursive: true });
    }
    const cleanB64 = (item.contentBase64 || "").replace(/^data:.*?;base64,/, "");
    const buffer = cleanB64 ? Buffer.from(cleanB64, "base64") : Buffer.alloc(0);
    await (await import("fs/promises")).writeFile(fullPath, buffer);
    savedFiles.push(cleanName);
  }

  await auditLogOperation(userId, appId, "UPLOAD", { targetDir, filesCount: files.length, savedFiles });
  syncAppFilesToCoolify(appId).catch(() => {});
  return { savedCount: savedFiles.length, files: savedFiles };
}

export async function syncAppFilesToCoolify(appId: string): Promise<void> {
  try {
    const { getCoolifyApplicationsStore, getActiveCoolifyServer } = await import("@/lib/coolify.server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const JSZip = (await import("jszip")).default;
    const fs = await import("fs/promises");
    const path = await import("path");

    const store = await getCoolifyApplicationsStore();
    const app = store[appId];
    const coolifyAppUuid = app?.coolify_app_uuid || "9dltqgbguyyylrazdyxaz317";

    const server = await getActiveCoolifyServer();
    if (!server?.apiToken || server.apiToken.includes("placeholder")) return;

    const clientRoot = await resolveClientRoot(appId);
    const zip = new JSZip();

    async function addRecursive(d: string, rel: string = "") {
      const entries = await fs.readdir(d, { withFileTypes: true });
      for (const ent of entries) {
        const full = path.join(d, ent.name);
        const r = rel ? `${rel}/${ent.name}` : ent.name;
        if (ent.isDirectory()) {
          await addRecursive(full, r);
        } else if (!ent.name.endsWith(".zip") && !ent.name.endsWith(".tar") && !ent.name.endsWith(".gz")) {
          const data = await fs.readFile(full);
          zip.file(r, data);
        }
      }
    }

    await addRecursive(clientRoot);
    const zipBuf = await zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE", compressionOptions: { level: 6 } });

    const bundlePath = `${appId}/site_bundle.zip`;
    await supabaseAdmin.storage.from("app-bundles").upload(bundlePath, zipBuf, {
      contentType: "application/zip",
      upsert: true,
    });

    const { data: pubUrl } = supabaseAdmin.storage.from("app-bundles").getPublicUrl(bundlePath);
    const downloadUrl = pubUrl.publicUrl;

    const isStatic = app?.build_pack === "static";
    const baseUrl = server.apiUrl.trim().replace(/\/+$/, "").replace(/\/api\/v1$/, "") + "/api/v1";

    if (isStatic) {
      const caddyfile = `:80 {\n    root * /usr/share/caddy\n    file_server\n    encode zstd gzip\n    try_files {path} {path}/ /index.html\n}\n`;
      const caddyfileB64 = Buffer.from(caddyfile).toString("base64");

      const postCmd = `(which apk >/dev/null && apk add --no-cache unzip wget curl || true) && mkdir -p /usr/share/caddy /var/www/html /srv /etc/caddy && rm -rf /usr/share/caddy/* /var/www/html/* && (wget -qO /tmp/site.zip "${downloadUrl}" || curl -sSL -o /tmp/site.zip "${downloadUrl}") && unzip -q -o /tmp/site.zip -d /usr/share/caddy && cp -r /usr/share/caddy/* /var/www/html/ 2>/dev/null || true && rm -f /tmp/site.zip && echo "${caddyfileB64}" | base64 -d > /etc/caddy/Caddyfile && (caddy reload --config /etc/caddy/Caddyfile 2>/dev/null || true)`;

      await fetch(`${baseUrl}/applications/${coolifyAppUuid}`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${server.apiToken.trim()}`,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          publish_directory: "/usr/share/caddy",
          static_image: "caddy:2-alpine",
          post_deployment_command: postCmd,
        }),
      });
    }

    await fetch(`${baseUrl}/deploy`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${server.apiToken.trim()}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({ uuid: coolifyAppUuid, force: true }),
    });
  } catch (err: any) {
    console.warn("[Coolify Live Auto-Sync Warning]:", err.message);
  }
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
