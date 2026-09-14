export const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

export const CYCLE_LABELS: Record<string, string> = {
  monthly: "mês",
  quarterly: "trimestre",
  semiannually: "semestre",
  annually: "ano",
  biennially: "2 anos",
};

export interface ProductItem {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  directadmin_package: string | null;
  disk_quota_mb: number | null;
  is_visible: boolean | null;
  sort_order: number | null;
  product_type: string;
  group_id: string | null;
  immediate_purchase?: boolean | null | undefined;
  product_groups?: { name: string } | null | undefined;
  product_prices?: Array<{ cycle: string; price: number; is_active: boolean }> | undefined;
}

export interface EditingProduct {
  id?: string | undefined;
  name: string;
  slug?: string | undefined;
  description?: string | undefined;
  product_type: string;
  group_id?: string | null | undefined;
  directadmin_package?: string | null | undefined;
  external_id?: string | null | undefined;
  is_visible: boolean;
  sort_order: number;
  disk_quota_mb?: number | null | undefined;
  immediate_purchase: boolean;
  prices: Array<{ cycle: string; price: number | string; is_active: boolean }>;
}
