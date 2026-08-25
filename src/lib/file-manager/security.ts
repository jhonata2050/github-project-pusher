import path from "path";
import fs from "fs/promises";
import fsSync from "fs";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { getCoolifyApplicationsStore, type CoolifyApplicationRecord } from "@/lib/coolify.server";

/**
 * Retorna o diretório raiz canônico e isolado no filesystem para a aplicação informada.
 * Cria o diretório físico no servidor caso ainda não exista.
 */
export async function resolveClientRoot(appId: string): Promise<string> {
  const baseStorageDir = process.env.COLIFY_STORAGE_ROOT || 
    process.env.STORAGE_PATH || 
    path.resolve(process.cwd(), "storage", "apps");

  const appDir = path.resolve(baseStorageDir, appId, "public_html");

  if (!fsSync.existsSync(appDir)) {
    await fs.mkdir(appDir, { recursive: true });

    // Criar arquivos padrão de inicialização no filesystem real se vazio
    const defaultIndex = path.join(appDir, "index.html");
    if (!fsSync.existsSync(defaultIndex)) {
      await fs.writeFile(
        defaultIndex,
        `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Aplicação Ativa — Colify</title>
  <link rel="stylesheet" href="styles.css">
</head>
<body>
  <div class="container">
    <h1>🚀 Servidor Online & Pronto!</h1>
    <p>Diretório raiz <code>/var/www/html</code> provisionado com sucesso.</p>
  </div>
</body>
</html>`,
        "utf-8"
      );

      await fs.writeFile(
        path.join(appDir, "styles.css"),
        `body { font-family: system-ui, sans-serif; background: #09090b; color: #f4f4f5; display: grid; place-items: center; min-height: 100vh; margin: 0; }
.container { text-align: center; padding: 2rem; background: #18181b; border: 1px solid #27272a; border-radius: 1rem; }`,
        "utf-8"
      );

      await fs.writeFile(
        path.join(appDir, "Caddyfile"),
        `:80 {\n\troot * /var/www/html\n\tfile_server\n\tencode zstd gzip\n\ttry_files {path} /index.html\n}\n`,
        "utf-8"
      );
    }
  }

  return appDir;
}

/**
 * Validação rigorosa de Path Traversal & Chroot Sandbox.
 * Garante que o caminho requisitado fique 100% contido dentro de clientRoot.
 */
export async function validateSafePath(clientRoot: string, requestedRelativePath: string): Promise<string> {
  if (!requestedRelativePath || requestedRelativePath === "/" || requestedRelativePath === ".") {
    return clientRoot;
  }

  // Decodificação de URL traversal (%2e%2e, %2f, %5c)
  let decodedPath = requestedRelativePath;
  try {
    decodedPath = decodeURIComponent(requestedRelativePath);
    if (decodedPath.includes("%")) {
      decodedPath = decodeURIComponent(decodedPath);
    }
  } catch (e) {}

  // Bloqueio de null bytes e caracteres de controle maliciosos
  if (decodedPath.includes("\0") || /[\x00-\x1f\x7f]/.test(decodedPath)) {
    throw new Error("Acesso negado: Caracteres inválidos ou nulos detectados no caminho.");
  }

  // Normalização de barras e remoção de prefixos
  const cleanRelative = decodedPath
    .replace(/^[\/\\]+/, "")
    .replace(/\\/g, "/");

  const resolved = path.resolve(clientRoot, cleanRelative);

  // Verificação estrita de limite chroot (funciona perfeitamente em Linux e Windows)
  const relCheck = path.relative(clientRoot, resolved);
  if (relCheck.startsWith("..") || path.isAbsolute(relCheck)) {
    throw new Error(`Acesso negado: Tentativa de path traversal bloqueada (${requestedRelativePath}).`);
  }

  // Verificação de symlink escape (se o item existir)
  if (fsSync.existsSync(resolved)) {
    try {
      const real = await fs.realpath(resolved);
      if (!real.startsWith(clientRoot)) {
        throw new Error("Acesso negado: Link simbólico apontando para fora do sandbox autorizado.");
      }
    } catch (e: any) {
      if (e.code !== "ENOENT") throw e;
    }
  }

  return resolved;
}

/**
 * Sanitiza o nome de um novo arquivo ou diretório
 */
export function sanitizeFileName(name: string): string {
  const clean = name.trim().replace(/^[\/\\]+|[\/\\]+$/g, "");
  if (!clean || clean === "." || clean === "..") {
    throw new Error("Nome de arquivo ou diretório inválido.");
  }
  if (clean.includes("/") || clean.includes("\\")) {
    throw new Error("O nome do arquivo não pode conter barras. Crie a pasta correspondente primeiro.");
  }
  if (/[<>:"|?*\x00-\x1f]/.test(clean)) {
    throw new Error("O nome contém caracteres proibidos pelo sistema de arquivos.");
  }
  return clean;
}

/**
 * Verifica autenticação e posse da aplicação pelo usuário ou staff
 */
export async function verifyAppAuthorization(appId: string, userId: string): Promise<CoolifyApplicationRecord> {
  const store = await getCoolifyApplicationsStore();
  const app = store[appId];
  if (!app) {
    throw new Error("Aplicação não encontrada.");
  }

  const { data: isStaff } = await supabaseAdmin.rpc("is_staff", { _user_id: userId });
  if (!isStaff && app.user_id !== userId) {
    throw new Error("Acesso negado: você não possui permissão para gerenciar este servidor.");
  }

  return app;
}
