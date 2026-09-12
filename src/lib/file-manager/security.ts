import path from "path";
import fs from "fs/promises";
import fsSync from "fs";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { getApplicationsStore, type ApplicationRecord } from "@/lib/cloud-apps.server";

/**
 * Retorna o diretório raiz canônico e isolado no filesystem para a aplicação informada.
 * Cria o diretório físico no servidor caso ainda não exista.
 */
export async function resolveClientRoot(appId: string, forceSync: boolean = false): Promise<string> {
  const baseStorageDir = process.env['EQSAM_STORAGE_ROOT'] ||
    process.env['STORAGE_PATH'] || 
    path.resolve(process.cwd(), "storage", "apps");

  const appBaseDir = path.resolve(baseStorageDir, appId);
  const appDir = path.resolve(appBaseDir, "public_html");
  const syncMarker = path.resolve(appBaseDir, ".swarm_synced");

  if (!fsSync.existsSync(appDir)) {
    await fs.mkdir(appDir, { recursive: true });
  }

  // Verificar se a aplicação está provisionada no Swarm e puxar arquivos reais se necessário
  try {
    const isSynced = fsSync.existsSync(syncMarker);
    if (!isSynced || forceSync) {
      const store = await getApplicationsStore();
      const app = store[appId];
      if (app && app.status !== "provisioning") {
        const { pullRealFilesFromSwarm } = await import("@/lib/swarm-cluster.server");
        const pulled = await pullRealFilesFromSwarm(app, appDir);
        if (pulled) {
          return appDir;
        }
      }
    }
  } catch (syncErr: any) {
    console.warn(`[FileManager] Aviso ao sincronizar arquivos do Swarm para ${appId}:`, syncErr.message);
  }

  // Fallback: se ainda estiver vazio, inicializar com a árvore correta do template
  try {
    const entries = await fs.readdir(appDir);
    if (entries.length === 0) {
      const store = await getApplicationsStore();
      const app = store[appId];
      const templateId = app?.template_id || (app?.build_pack === "static" ? "static-html-landing" : "bot-starter");
      const { scaffoldTemplateFiles } = await import("./template-definitions");
      await scaffoldTemplateFiles(appDir, templateId, app?.name || "Minha Aplicação");
    }
  } catch (err: any) {
    console.warn(`[FileManager] Aviso ao inicializar arquivos do template para ${appId}:`, err.message);
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
export async function verifyAppAuthorization(appId: string, userId: string): Promise<ApplicationRecord> {
  const store = await getApplicationsStore();
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

/**
 * Extrai o token da requisição (header Authorization Bearer ou cookie sb-*-auth-token)
 * e valida criptograficamente sua integridade e autenticidade diretamente no Supabase Auth.
 * Retorna o ID seguro e verificado do usuário.
 */
export async function extractAndVerifyUser(request: Request): Promise<string> {
  // 1. Suporte a Developer API Token estilo Discloud CLI (header "api-token" ou Bearer "eqsam_live_...")
  const apiTokenHeader = request.headers.get("api-token")?.trim();
  const authHeader = request.headers.get("authorization")?.trim();

  let candidateApiToken = "";
  if (apiTokenHeader && apiTokenHeader.startsWith("eqsam_live_")) {
    candidateApiToken = apiTokenHeader;
  } else if (authHeader?.startsWith("Bearer eqsam_live_")) {
    candidateApiToken = authHeader.replace("Bearer ", "").trim();
  }

  if (candidateApiToken) {
    const { verifyApiToken } = await import("@/lib/api-tokens.server");
    const verified = await verifyApiToken(candidateApiToken);
    if (verified?.userId) {
      return verified.userId;
    }
    throw new Error("Token de API inválido ou revogado.");
  }

  // 2. Autenticação via Sessão do Supabase (Bearer JWT ou Cookies)
  let token = "";
  if (authHeader?.startsWith("Bearer ")) {
    token = authHeader.replace("Bearer ", "").trim();
  } else {
    const cookieHeader = request.headers.get("cookie") || "";
    // Cookie único
    const match = cookieHeader.match(/sb-[^=]+-auth-token=([^;]+)/);
    if (match && match[1]) {
      try {
        const cookieVal = decodeURIComponent(match[1]);
        if (cookieVal.startsWith("base64-")) {
          const json = Buffer.from(cookieVal.slice(7), "base64").toString();
          const parsed = JSON.parse(json);
          token = parsed.access_token || parsed[0];
        } else {
          const parsed = JSON.parse(cookieVal);
          token = parsed.access_token || parsed[0];
        }
      } catch (e) {}
    } else {
      // Cookies divididos em partes (chunks: sb-*-auth-token.0, sb-*-auth-token.1)
      const chunkRegex = /sb-[^=]+-auth-token\.(\d+)=([^;]+)/g;
      const chunks: { [index: number]: string } = {};
      let m;
      while ((m = chunkRegex.exec(cookieHeader)) !== null) {
        if (m[1] && m[2]) {
          chunks[parseInt(m[1], 10)] = m[2];
        }
      }
      const sortedKeys = Object.keys(chunks).map(Number).sort((a, b) => a - b);
      if (sortedKeys.length > 0) {
        try {
          const combined = sortedKeys.map((k) => chunks[k]).join("");
          const cookieVal = decodeURIComponent(combined);
          if (cookieVal.startsWith("base64-")) {
            const json = Buffer.from(cookieVal.slice(7), "base64").toString();
            const parsed = JSON.parse(json);
            token = parsed.access_token || parsed[0];
          } else {
            const parsed = JSON.parse(cookieVal);
            token = parsed.access_token || parsed[0];
          }
        } catch (e) {}
      }
    }
  }

  if (!token) {
    throw new Error("Não autorizado. Faça login novamente.");
  }

  const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);

  if (error || !user?.id) {
    throw new Error("Sessão inválida ou expirada. Faça login novamente.");
  }

  return user.id;
}
