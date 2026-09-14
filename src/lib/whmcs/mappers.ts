export function pick(row: Record<string, string>, keys: string[]): string {
  // Normalize the row keys to handle case-insensitivity and spaces
  const normalizedRow: Record<string, string> = {};
  for (const [k, v] of Object.entries(row)) {
    normalizedRow[k.toLowerCase().trim().replace(/[\s_]+/g, "")] = v;
  }

  for (const k of keys) {
    // Also normalize the search keys
    const normalizedKey = k.toLowerCase().trim().replace(/[\s_]+/g, "");
    const v = normalizedRow[normalizedKey];
    if (v !== undefined && v !== null && v !== "") return v;
  }
  return "";
}

export function debugRow(row: Record<string, string>): string {
  const keys = Object.keys(row).join(", ");
  return `Campos encontrados: ${keys}`;
}

export function toDate(value: string): string | null {
  if (!value) return null;
  const v = value.trim();
  if (v === "0000-00-00" || v === "0000-00-00 00:00:00" || v === "0" || v === "") return null;
  // Handle DD/MM/YYYY
  const partsSlash = v.split("/");
  if (v.includes("/") && partsSlash[0] && partsSlash[0].length <= 2) {
    const parts = v.split("/");
    if (parts.length === 3) {
      const [day, month, year] = parts;
      const d = new Date(`${year}-${month}-${day}`);
      return Number.isNaN(d.getTime()) ? null : d.toISOString();
    }
  }
  const d = new Date(v.replace(" ", "T"));
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

export function toNumber(value: string): number {
  if (!value) return 0;
  const n = Number(value.replace(/[^\d,.-]/g, "").replace(",", "."));
  return Number.isNaN(n) ? 0 : n;
}

export const CYCLE_MAP: Record<string, string> = {
  monthly: "monthly",
  mensal: "monthly",
  quarterly: "quarterly",
  trimestral: "quarterly",
  semiannually: "semiannually",
  semestral: "semiannually",
  annually: "annually",
  anual: "annually",
  biennially: "biennially",
  bienal: "biennially",
};

export const SERVICE_STATUS_MAP: Record<string, string> = {
  active: "active",
  pending: "pending",
  suspended: "suspended",
  terminated: "terminated",
  cancelled: "cancelled",
  canceled: "cancelled",
};

export const INVOICE_STATUS_MAP: Record<string, string> = {
  paid: "paid",
  unpaid: "pending",
  cancelled: "cancelled",
  canceled: "cancelled",
  refunded: "refunded",
  draft: "pending",
  collections: "pending",
};
