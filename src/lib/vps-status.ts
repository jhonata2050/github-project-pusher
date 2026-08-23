/**
 * Normalização do status de instâncias VPS.
 * A Contabo retorna valores como "running", "stopped", "provisioning",
 * "installing", "error". O sistema armazena/exibe um conjunto canônico.
 */
export type VPSStatus =
  | "active"
  | "stopped"
  | "provisioning"
  | "error"
  | "unknown";

export function normalizeVPSStatus(raw?: string | null): VPSStatus {
  const s = String(raw ?? "").trim().toLowerCase();
  if (!s) return "unknown";
  if (["running", "active", "online", "up"].includes(s)) return "active";
  if (["stopped", "shutdown", "off", "offline", "paused", "suspended"].includes(s)) return "stopped";
  if (
    ["provisioning", "installing", "pending", "rescue", "resetting", "manual_provisioning", "product_not_available", "verification_required"].includes(s)
  )
    return "provisioning";
  if (["error", "failed", "cancelled", "terminated"].includes(s)) return "error";
  return "unknown";
}

export function isVPSOnline(raw?: string | null): boolean {
  return normalizeVPSStatus(raw) === "active";
}

export function getVPSStatusLabel(raw?: string | null): string {
  switch (normalizeVPSStatus(raw)) {
    case "active":
      return "VPS em Operação";
    case "stopped":
      return "Desligada";
    case "provisioning":
      return "Provisionando";
    case "error":
      return "Com erro";
    default:
      return "Status indisponível";
  }
}
