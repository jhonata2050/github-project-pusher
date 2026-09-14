import { Users, Server, Receipt, type LucideIcon } from "lucide-react";

export type Kind = "clients" | "services" | "invoices";

export interface Stats {
  clients: { created: number; updated: number; failed: number };
  services: { created: number; failed: number };
  invoices: { created: number; failed: number };
  errors: string[];
}

export const emptyStats = (): Stats => ({
  clients: { created: 0, updated: 0, failed: 0 },
  services: { created: 0, failed: 0 },
  invoices: { created: 0, failed: 0 },
  errors: [],
});

export const BATCH_SIZE = 100;

export interface ImportSlotConfig {
  key: Kind;
  title: string;
  icon: LucideIcon;
  hint: string;
}

export const SLOTS: ImportSlotConfig[] = [
  {
    key: "clients",
    title: "Tabela de Clientes",
    icon: Users,
    hint: "Ex: tblclients.csv. O sistema filtrará automaticamente os campos relevantes.",
  },
  {
    key: "services",
    title: "Tabela de Serviços / Hospedagem",
    icon: Server,
    hint: "Ex: tblhosting.csv. Vincula ao cliente pelo e-mail.",
  },
  {
    key: "invoices",
    title: "Tabela de Faturas",
    icon: Receipt,
    hint: "Ex: tblinvoices.csv. Vincula ao cliente pelo e-mail.",
  },
];

export interface ImportSlotCardProps {
  slot: ImportSlotConfig;
  file?: File | undefined;
  onFileSelect: (file: File) => void;
}

export interface ImportHistoryItem {
  id: string;
  status: string;
  created_at?: string | null;
  error_message?: string | null;
  stats?: Partial<Stats> | null;
}

export interface ImportHistoryCardProps {
  history?: ImportHistoryItem[] | undefined;
}

export interface ImportProgressDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isPending: boolean;
  isError: boolean;
  errorMessage?: string | null | undefined;
  progress: number;
  step: string;
  live: Stats;
}
