export interface CycleDetails {
  name: string;
  period: string;
  badge: string;
}

export function getCycleDetails(cycle?: string): CycleDetails {
  switch (cycle) {
    case "monthly":
      return { name: "Mensal", period: "Cobrado a cada mês", badge: "Mensal" };
    case "quarterly":
      return { name: "Trimestral", period: "Cobrado a cada 3 meses", badge: "Trimestral" };
    case "semiannually":
      return { name: "Semestral", period: "Cobrado a cada 6 meses", badge: "Semestral" };
    case "annually":
      return { name: "Anual", period: "Cobrado anualmente (-15% desc.)", badge: "Anual" };
    case "biennially":
      return { name: "Bienal", period: "Cobrado a cada 2 anos", badge: "Bienal" };
    case "triennially":
      return { name: "Trienal", period: "Cobrado a cada 3 anos", badge: "Trienal" };
    case "one_time":
      return { name: "Pagamento Único", period: "Taxa única de ativação", badge: "Único" };
    default:
      return { name: cycle || "Mensal", period: "Cobrado periodicamente", badge: cycle || "Mensal" };
  }
}

export interface PricingDetails {
  cycle: string;
  actualPrice: number;
  originalPrice: number;
  hasDiscount: boolean;
  savingsAmount: number;
  savingsPercent: number;
}

export interface VPSConfigState {
  hostname: string;
  os: string;
  location: string;
}

export type ServiceKey = "containers" | "directadmin" | "vps";

export function normalizeServiceKey(raw?: string): ServiceKey | null {
  if (!raw) return null;
  const s = raw.toLowerCase().trim();
  if (["containers", "container", "paas", "apps", "app", "bot", "bots"].includes(s)) {
    return "containers";
  }
  if (["directadmin", "hospedagem", "hosting", "web", "sites", "site", "cpanel"].includes(s)) {
    return "directadmin";
  }
  if (["vps", "cloud", "servidores-cloud", "servidor-cloud", "dedicado"].includes(s)) {
    return "vps";
  }
  return null;
}

export const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

export type CheckoutIndexSearchParams = {
  service?: string;
  tab?: string;
  cycle?: "monthly" | "annually";
};
