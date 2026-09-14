export interface ServiceServerDetails {
  id: string;
  user_id: string;
  status: string;
  domain?: string | null;
  username?: string | null;
  server_id?: string | null;
  billing_cycle?: string | null;
  next_due_date?: string | null;
  created_at: string;
  updated_at?: string | null;
  suspension_reason?: string | null;
  block_directadmin?: boolean | null;
  notes?: string | null;
  servers?: {
    id: string;
    name: string;
    ip_address?: string | null;
    hostname?: string | null;
    sso_supported?: boolean | null;
  } | null;
  products?: {
    id: string;
    name: string;
    product_type?: string | null;
    directadmin_package?: string | null;
    disk_quota_mb?: number | null;
  } | null;
  vps_instances?: any[] | null;
}

export interface UpgradePackage {
  id: string;
  name: string;
  description?: string | null;
  directadminPackage?: string | null;
  cpuCores?: number | null;
  ramGb?: number | null;
  prorataAmount: number;
  targetPrice: number;
}
