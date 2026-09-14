export interface ServerRow {
  id: string;
  name?: string | null | undefined;
  hostname: string;
  ip_address?: string | null | undefined;
  api_user: string;
  max_accounts?: number | null | undefined;
}

export interface SyncResult {
  packages: string[];
  syncedAt: string;
}

export type SyncResultMap = Record<string, SyncResult>;
