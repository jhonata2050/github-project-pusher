import path from "path";
import fs from "fs/promises";
import fsSync from "fs";
import { supabaseAdmin } from "../../integrations/supabase/client.server";
import { getApplicationsStore, saveApplicationsStore } from "./store.server";
import { APP_TEMPLATES } from "../templates.data";
import { sanitizeAndEnsureSecureEnvs, isSecretKey, isThirdPartyApiKey } from "../secret-generator";
import type { AppEnvVar } from "./types";

export async function getCloudApplicationEnvs(appId: string, userId: string): Promise<AppEnvVar[]> {
  const store = await getApplicationsStore();
  const app = store[appId];
  if (!app) throw new Error("Aplicação não encontrada");

  const { data: isStaff } = await supabaseAdmin.rpc("is_staff", { _user_id: userId });
  if (!isStaff && app.user_id !== userId) throw new Error("Acesso negado");

  // Mapa com todas as variáveis acumuladas: chave -> AppEnvVar
  const envMap = new Map<string, AppEnvVar>();

  // 1. Template base default_envs (se houver template)
  if (app.template_id) {
    const tmpl = APP_TEMPLATES.find((t) => t.id === app.template_id);
    if (tmpl?.default_envs && tmpl.default_envs.length > 0) {
      for (const de of tmpl.default_envs) {
        envMap.set(de.key, { key: de.key, value: de.value, is_build_time: Boolean(de.is_build_time) });
      }
    }
  }

  // Se não houver template ou se estiver vazio, garantir variáveis padrão de ambiente web
  if (!envMap.has("PORT")) envMap.set("PORT", { key: "PORT", value: "3000" });
  if (!envMap.has("NODE_ENV")) envMap.set("NODE_ENV", { key: "NODE_ENV", value: "production" });

  // 2. Tentar ler .env do sistema de arquivos / container se existir
  try {
    const { resolveClientRoot } = await import("../file-manager/security");
    const clientRoot = await resolveClientRoot(appId);
    const envPath = path.join(clientRoot, ".env");
    if (fsSync.existsSync(envPath)) {
      const fileContent = await fs.readFile(envPath, "utf-8");
      const lines = fileContent.split(/\r?\n/);
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith("#")) continue;
        const eqIdx = trimmed.indexOf("=");
        if (eqIdx > 0) {
          const k = trimmed.slice(0, eqIdx).trim();
          let v = trimmed.slice(eqIdx + 1).trim();
          if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
            v = v.slice(1, -1);
          }
          if (k) envMap.set(k, { key: k, value: v });
        }
      }
    }
  } catch (fsErr) {}

  // 3. Mesclar com app.env_vars do store
  if (Array.isArray(app.env_vars)) {
    for (const e of app.env_vars) {
      if (e.key) envMap.set(e.key, { key: e.key, value: e.value, is_build_time: Boolean(e.is_build_time) });
    }
  }

  // 4. Mesclar com configurações salvas em app_envs_${appId} e swarm_envs_${appId}
  try {
    const { data: primary } = await supabaseAdmin
      .from("system_settings")
      .select("value")
      .eq("key", `app_envs_${appId}`)
      .maybeSingle();

    if (primary?.value) {
      const parsed = typeof primary.value === "string" ? JSON.parse(primary.value) : primary.value;
      if (Array.isArray(parsed)) {
        for (const e of parsed) {
          if (e.key) envMap.set(e.key, { key: e.key, value: e.value, is_build_time: e.is_build_time });
        }
      }
    }

    const { data: swarm } = await supabaseAdmin
      .from("system_settings")
      .select("value")
      .eq("key", `swarm_envs_${appId}`)
      .maybeSingle();

    if (swarm?.value) {
      const parsed = typeof swarm.value === "string" ? JSON.parse(swarm.value) : swarm.value;
      if (Array.isArray(parsed)) {
        for (const e of parsed) {
          if (e.key && !envMap.has(e.key)) {
            envMap.set(e.key, { key: e.key, value: e.value, is_build_time: e.is_build_time });
          }
        }
      }
    }
  } catch (e) {}

  // 5. Ajustar URLs dinâmicas para hosts reais da aplicação
  if (app.template_id?.includes("openstatus")) {
    const cleanId = (app.id || "").replace(/[^a-zA-Z0-9]/g, "").slice(0, 12);
    const adminUrl = `https://admin-openstatus-${cleanId}.dk1.eqsam.com`;
    const nextAuthUrl = envMap.get("NEXTAUTH_URL");
    if (!nextAuthUrl || nextAuthUrl.value.includes("admin-openstatus.dk1")) {
      envMap.set("NEXTAUTH_URL", { key: "NEXTAUTH_URL", value: adminUrl });
    }
    const nextPublicUrl = envMap.get("NEXT_PUBLIC_URL");
    if (!nextPublicUrl || nextPublicUrl.value.includes("admin-openstatus.dk1")) {
      envMap.set("NEXT_PUBLIC_URL", { key: "NEXT_PUBLIC_URL", value: adminUrl });
    }
  }

  const rawList = Array.from(envMap.values());
  const { envs: secureEnvs, hasChanges } = sanitizeAndEnsureSecureEnvs(rawList);

  // Se senhas ou segredos estavam ausentes ou eram placeholders inseguros, persiste os hashes criptográficos
  if (hasChanges) {
    try {
      app.env_vars = secureEnvs;
      store[appId] = app;
      const nowIso = new Date().toISOString();
      await Promise.all([
        supabaseAdmin.from("system_settings").upsert(
          {
            key: `app_envs_${appId}`,
            value: secureEnvs as any,
            updated_at: nowIso,
          },
          { onConflict: "key" }
        ),
        saveApplicationsStore(store),
      ]);
    } catch (saveErr: any) {
      console.warn("[getCloudApplicationEnvs] Aviso ao salvar envs criptograficamente seguros:", saveErr?.message);
    }
  }

  return secureEnvs;
}

export async function saveCloudApplicationEnvs(appId: string, envs: AppEnvVar[], userId: string) {
  const store = await getApplicationsStore();
  const app = store[appId];
  if (!app) throw new Error("Aplicação não encontrada");

  const { data: isStaff } = await supabaseAdmin.rpc("is_staff", { _user_id: userId });
  if (!isStaff && app.user_id !== userId) throw new Error("Acesso negado");

  const now = new Date().toISOString();
  app.env_vars = envs;
  app.updated_at = now;
  store[appId] = app;

  await Promise.all([
    supabaseAdmin.from("system_settings").upsert({
      key: `app_envs_${appId}`,
      value: envs as any,
      updated_at: now,
    }, { onConflict: "key" }),
    supabaseAdmin.from("system_settings").upsert({
      key: `swarm_envs_${appId}`,
      value: envs as any,
      updated_at: now,
    }, { onConflict: "key" }),
    saveApplicationsStore(store),
  ]);

  try {
    const { resolveClientRoot } = await import("../file-manager/security");
    const clientRoot = await resolveClientRoot(appId);
    const envLines = envs
      .filter((e) => e.key && e.key.trim().length > 0)
      .map((e) => `${e.key.trim()}=${e.value || ""}`)
      .join("\n");
    await fs.writeFile(path.join(clientRoot, ".env"), envLines, "utf-8");
  } catch (fsErr: any) {
    console.warn("[AppConfig] Aviso ao gravar .env em disco:", fsErr.message);
  }

  return { success: true, count: envs.length };
}

