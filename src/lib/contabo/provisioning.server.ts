import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { getContaboToken } from "./auth.server";

export async function provisionContaboVPS(
  serviceId: string,
  config: {
    imageId: string;
    productId: string;
    region: string;
    displayName?: string;
  }
) {
  const { data: service } = await supabaseAdmin
    .from("services")
    .select("id, user_id, domain")
    .eq("id", serviceId)
    .single();

  if (!service) throw new Error("Serviço não encontrado");

  const token = await getContaboToken();
  const regionAliases: Record<string, string> = {
    "US-east": "US-east",
    "EU-central": "EU-central",
    BR: "US-east",
  };

  const payload = {
    imageId: config.imageId,
    productId: config.productId,
    region: regionAliases[config.region] || config.region,
    displayName: config.displayName || service.domain || `VPS-${service.id.slice(0, 8)}`,
  };

  const res = await fetch("https://api.contabo.com/v1/compute/instances", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "x-request-id": crypto.randomUUID(),
      "x-trace-id": crypto.randomUUID(),
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const errorText = await res.text().catch(() => "Unknown");
    console.error(`[Contabo] Provisioning error (${res.status}):`, errorText);
    throw new Error(`O provedor recusou o provisionamento da VPS (${res.status})`);
  }

  const response = (await res.json()) as {
    data?: Array<Record<string, any>> | Record<string, any>;
  };
  const created = Array.isArray(response.data) ? response.data[0] : response.data;
  const externalId = created?.instanceId ?? created?.id;
  if (!externalId) throw new Error("O provedor não retornou o identificador da nova VPS");

  const ipAddress = created?.ipAddress ?? created?.addOnIps?.[0]?.ip ?? null;
  const status = String(created?.status || "provisioning").toLowerCase();

  const vpsPayload = {
    user_id: service.user_id,
    external_id: String(externalId),
    name: payload.displayName,
    ip_address: ipAddress,
    status: status === "running" || status === "active" ? "active" : "provisioning",
    region: regionAliases[config.region] || config.region,
    os_template: config.imageId,
  };

  const { data: existingVps } = await supabaseAdmin
    .from("vps_instances")
    .select("id")
    .eq("external_id", String(externalId))
    .maybeSingle();

  if (existingVps) {
    await supabaseAdmin.from("vps_instances").update(vpsPayload).eq("id", existingVps.id);
  } else {
    await supabaseAdmin.from("vps_instances").insert(vpsPayload);
  }

  await supabaseAdmin
    .from("services")
    .update({
      status: status === "active" || status === "running" ? "active" : "pending",
      vps_hostname: payload.displayName,
      domain: service.domain || payload.displayName,
      notes: "Provisionamento automático da VPS iniciado na Contabo.",
    })
    .eq("id", serviceId);

  return { externalId: String(externalId), status };
}
