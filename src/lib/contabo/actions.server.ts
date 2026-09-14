import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { getContaboToken } from "./auth.server";

export async function performContaboAction(
  instanceId: string,
  action: string,
  userId: string
) {
  const { data: vps, error } = await supabaseAdmin
    .from("vps_instances")
    .select("id, user_id, external_id")
    .eq("id", instanceId)
    .single();

  if (error || !vps) {
    throw new Error("Instância VPS não encontrada");
  }

  const { data: isStaff } = await supabaseAdmin.rpc("is_staff", { _user_id: userId });
  if (!isStaff && vps.user_id !== userId) {
    throw new Error("Acesso negado à instância VPS");
  }

  return performContaboActionByExternalId(vps.external_id, action);
}

export async function performContaboActionByExternalId(
  externalId: string,
  action: string
) {
  const token = await getContaboToken();
  const contaboAction = action === "restart" ? "reboot" : action;

  const res = await fetch(
    `https://api.contabo.com/v1/compute/instances/${externalId}/actions/${contaboAction}`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "x-request-id": crypto.randomUUID(),
      },
    }
  );

  if (!res.ok) {
    const errorText = await res.text().catch(() => "Unknown error");
    console.error(`[Contabo] Erro na ação ${action} (${res.status}):`, errorText);
    throw new Error(`Falha ao executar ${action} na Contabo (${res.status})`);
  }
  return { success: true };
}
