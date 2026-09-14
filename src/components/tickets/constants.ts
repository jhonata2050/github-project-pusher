import type { TicketStatusInfo } from "./types";

const DEFAULT_STATUS: TicketStatusInfo = {
  label: "Aberto",
  color: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
};

export const STATUS_MAP: Record<string, TicketStatusInfo> = {
  open: DEFAULT_STATUS,
  in_progress: { label: "Em Análise", color: "bg-purple-500/10 text-purple-600 border-purple-500/20" },
  on_hold: { label: "Em Verificação", color: "bg-amber-500/10 text-amber-600 border-amber-500/20" },
  answered: { label: "Respondido", color: "bg-blue-500/10 text-blue-600 border-blue-500/20" },
  "customer-reply": { label: "Aguardando Cliente", color: "bg-orange-500/10 text-orange-600 border-orange-500/20" },
  closed: { label: "Fechado", color: "bg-slate-500/10 text-slate-500 border-slate-500/20" },
};

export const getTicketStatusInfo = (status?: string | null): TicketStatusInfo => {
  if (!status) return DEFAULT_STATUS;
  return STATUS_MAP[status] ?? DEFAULT_STATUS;
};
