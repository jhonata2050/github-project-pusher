import path from "path";
import fs from "fs/promises";
import fsSync from "fs";
import { supabaseAdmin } from "../../../integrations/supabase/client.server";
import { getApplicationsStore } from "../store.server";
import type { AppFileItem } from "../types";

export async function getCloudApplicationFiles(appId: string, userId: string): Promise<AppFileItem[]> {
  const store = await getApplicationsStore();
  const app = store[appId];
  if (!app) throw new Error("Aplicação não encontrada");

  const { data: isStaff } = await supabaseAdmin.rpc("is_staff", { _user_id: userId });
  if (!isStaff && app.user_id !== userId) throw new Error("Acesso negado");

  const { resolveClientRoot } = await import("../../file-manager/security");
  const clientRoot = await resolveClientRoot(appId);

  async function scanFiles(currentDir: string): Promise<AppFileItem[]> {
    const entries = await fs.readdir(currentDir, { withFileTypes: true });
    const items: AppFileItem[] = [];

    for (const ent of entries) {
      if (ent.name.startsWith(".") && ent.name !== ".env" && ent.name !== ".gitignore") continue;
      const fullPath = path.join(currentDir, ent.name);
      const relPath = path.relative(clientRoot, fullPath).replace(/\\/g, "/");

      if (ent.isDirectory()) {
        const subItems = await scanFiles(fullPath);
        items.push(...subItems);
      } else {
        const stat = await fs.stat(fullPath);
        let content = "";
        if (stat.size <= 512 * 1024) {
          try {
            content = await fs.readFile(fullPath, "utf-8");
          } catch (e) {}
        }
        const sizeFormatted = stat.size > 1024 * 1024
          ? `${(stat.size / (1024 * 1024)).toFixed(1)} MB`
          : stat.size > 1024
          ? `${(stat.size / 1024).toFixed(1)} KB`
          : `${stat.size} B`;

        items.push({
          name: ent.name,
          path: relPath,
          content,
          size: sizeFormatted,
          updated_at: stat.mtime.toISOString(),
          type: "file",
        });
      }
    }
    return items;
  }

  try {
    const diskItems = await scanFiles(clientRoot);
    if (diskItems.length > 0) {
      return diskItems;
    }
  } catch (e) {
    console.warn("[AppFiles] Falha ao escanear diretório no disco:", e);
  }

  const defaultIndex = path.join(clientRoot, "index.html");
  if (!fsSync.existsSync(defaultIndex)) {
    const initialContent = `<!DOCTYPE html>\n<html lang="pt-BR">\n<head><title>App Online</title></head>\n<body><h1>Aplicação Ativa</h1></body>\n</html>`;
    await fs.writeFile(defaultIndex, initialContent, "utf-8");
    return [{
      name: "index.html",
      path: "index.html",
      content: initialContent,
      size: "120 B",
      updated_at: new Date().toISOString(),
      type: "file",
    }];
  }

  return [];
}
