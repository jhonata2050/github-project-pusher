export type ImportStats = {
  clients: { created: number; updated: number; failed: number };
  services: { created: number; failed: number };
  invoices: { created: number; failed: number };
  errors: string[];
};

export function emptyStats(): ImportStats {
  return {
    clients: { created: 0, updated: 0, failed: 0 },
    services: { created: 0, failed: 0 },
    invoices: { created: 0, failed: 0 },
    errors: [],
  };
}
