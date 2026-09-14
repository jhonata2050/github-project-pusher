export interface VPSInstanceDetails {
  id: string;
  user_id?: string | null;
  service_id?: string | null;
  server_id?: string | null;
  contabo_vps_id?: string | null;
  status: string;
  ip_address?: string | null;
  ipv6_address?: string | null;
  region?: string | null;
  os_template?: string | null;
  cpu_cores?: number | null;
  ram_gb?: number | null;
  disk_gb?: number | null;
  ssh_host?: string | null;
  ssh_port?: number | null;
  ssh_user?: string | null;
  ssh_password?: string | null;
  created_at: string;
  updated_at?: string | null;
  externalDetails?: any;
  stats?: any;
  last_metrics?: any;
  [key: string]: any;
}
