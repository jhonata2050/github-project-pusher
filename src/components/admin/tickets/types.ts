import {
  MessageSquare,
  CheckCircle2,
  AlertCircle,
  CheckCircle,
  Hourglass,
  Loader2,
} from "lucide-react";

export const STATUS_MAP = {
  open: { label: "Aberto", color: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20", icon: AlertCircle },
  in_progress: { label: "Em Análise", color: "bg-purple-500/10 text-purple-600 border-purple-500/20", icon: Loader2 },
  on_hold: { label: "Em Verificação", color: "bg-amber-500/10 text-amber-600 border-amber-500/20", icon: Hourglass },
  answered: { label: "Respondido", color: "bg-blue-500/10 text-blue-600 border-blue-500/20", icon: CheckCircle2 },
  "customer-reply": { label: "Aguardando Cliente", color: "bg-orange-500/10 text-orange-600 border-orange-500/20", icon: MessageSquare },
  closed: { label: "Fechado", color: "bg-slate-500/10 text-slate-500 border-slate-500/20", icon: CheckCircle },
};

export const STATUS_FILTERS = [
  { id: "all", label: "Todos" },
  { id: "open", label: "Abertos" },
  { id: "in_progress", label: "Em Análise" },
  { id: "on_hold", label: "Em Verificação" },
  { id: "answered", label: "Respondidos" },
  { id: "customer-reply", label: "Aguardando Cliente" },
  { id: "closed", label: "Fechados" },
];

export type TicketStatus = "open" | "answered" | "customer-reply" | "in_progress" | "on_hold" | "closed";
