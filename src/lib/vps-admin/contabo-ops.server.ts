import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { normalizeVPSStatus } from "@/lib/vps-status";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const syncContaboInstancesFn = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
    if (!isAdmin) throw new Error("Unauthorized");

    try {
      const [{ getContaboInstances, mapContaboSpecs }, { supabaseAdmin }] = await Promise.all([
        import("../contabo.server"),
        import("@/integrations/supabase/client.server"),
      ]);
      const response = await getContaboInstances();
      const externalInstances = Array.isArray(response.data) ? response.data : [];

      for (const instance of externalInstances) {
        const externalId = instance?.instanceId ?? instance?.id;
        if (!externalId) continue;
        const ipAddress = instance.ipConfig?.v4?.ip ?? instance.ipAddress ?? instance.addOnIps?.[0]?.ip ?? null;
        const specs = mapContaboSpecs(instance);
        const payload: any = {
          user_id: context.userId,
          external_id: String(externalId),
          name: instance.displayName || instance.name || `VPS #${externalId}`,
          ip_address: ipAddress,
          status: normalizeVPSStatus(instance.status),
          region: instance.regionName ?? instance.region ?? null,
          os_template: instance.imageName ?? instance.osType ?? instance.osTemplate ?? instance.imageId ?? null,
        };

        const { data: existing } = await supabaseAdmin
          .from('vps_instances')
          .select('id')
          .eq('external_id', String(externalId))
          .maybeSingle();

        if (existing) {
          await supabaseAdmin.from('vps_instances').update(payload).eq('id', existing.id);
        } else {
          await supabaseAdmin.from('vps_instances').insert(payload);
        }
      }

      return externalInstances.map((instance: any) => {
        const ipAddress = instance.ipConfig?.v4?.ip ?? instance.ipAddress ?? instance.addOnIps?.[0]?.ip ?? 'N/A';
        return {
          ...instance,
          instanceId: instance.instanceId ?? instance.id,
          displayName: instance.displayName || instance.name || `VPS #${instance.instanceId}`,
          ipAddress: ipAddress,
        };
      });
    } catch (err: any) {
      console.error("Erro ao sincronizar instâncias Contabo:", err.message);
      if (err.message.includes("401") || err.message.includes("auth")) {
        throw new Error("Contabo recusou as credenciais (usuário/senha da API inválidos). Verifique em Admin > Financeiro.");
      }
      throw err;
    }
  });

export const performAdminVPSAction = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({
    instanceId: z.string(),
    action: z.enum(['start', 'stop', 'restart', 'reinstall'])
  }).parse(data))
  .handler(async ({ data, context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
    if (!isAdmin) throw new Error("Unauthorized");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: instance, error } = await supabaseAdmin
      .from('vps_instances')
      .select('external_id')
      .eq('id', data.instanceId)
      .maybeSingle();
    if (error || !instance?.external_id) throw new Error("Instância VPS não encontrada");

    const { performContaboActionByExternalId } = await import("../contabo.server");
    return performContaboActionByExternalId(instance.external_id, data.action);
  });

export const getContaboPlansFn = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
    if (!isAdmin) throw new Error("Unauthorized");

    try {
      const { getContaboProductTypes } = await import("../contabo.server");
      const plans = await getContaboProductTypes();
      return plans ?? [];
    } catch (e) {
      console.warn("[VPS-Admin] Planos do provedor indisponíveis:", (e as Error).message);
      return [];
    }
  });
