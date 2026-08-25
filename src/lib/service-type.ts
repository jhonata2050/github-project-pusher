/**
 * Identificação canônica de serviços VPS.
 * A única fonte de verdade é o tipo do produto ('vps') ou a existência de uma
 * instância VPS vinculada ao serviço. Heurísticas por domínio/username foram
 * removidas por classificarem hospedagem web incorretamente.
 */
export function isVPSService(service: any): boolean {
  if (!service) return false;
  if (service.products?.product_type === "vps") return true;
  if (service.product_type === "vps") return true;
  const instances = service.vps_instances;
  if (Array.isArray(instances) ? instances.length > 0 : Boolean(instances)) return true;
  return false;
}

export function getVPSInstance(service: any): any | null {
  const instances = service?.vps_instances;
  if (!instances) return null;
  return Array.isArray(instances) ? (instances[0] ?? null) : instances;
}
