import type { LucideIcon } from "lucide-react";

export interface ProvisioningLog {
  id: string;
  attempt_number?: number | undefined;
  status: "success" | "failure" | "failed" | "pending" | string;
  error_code?: string | undefined;
  error_message?: string | undefined;
  message?: string | undefined;
  created_at: string;
  details?: {
    attempt_number?: number | undefined;
    error_code?: string | undefined;
    [key: string]: any;
  } | null | undefined;
  [key: string]: any;
}

export interface CriticalTicket {
  id: string;
  subject: string;
  created_at: string;
  profiles?: {
    full_name?: string | null | undefined;
    email?: string | null | undefined;
  } | null | undefined;
  [key: string]: any;
}

export interface ErrorService {
  id: string;
  domain?: string | null | undefined;
  username?: string | null | undefined;
  notes?: string | null | undefined;
  error_message?: string | null | undefined;
  suspension_reason?: string | null | undefined;
  updated_at: string;
  user_id: string;
  profiles?: {
    full_name?: string | null | undefined;
    email?: string | null | undefined;
  } | null | undefined;
  [key: string]: any;
}

export interface AdminStatsData {
  clients?: number | undefined;
  activeServices?: number | undefined;
  pendingInvoices?: number | undefined;
  totalRevenue?: number | undefined;
  monthRevenue?: number | undefined;
  errorServices?: ErrorService[] | any[] | undefined;
  criticalTickets?: CriticalTicket[] | any[] | undefined;
  pendingTicketsCount?: number | undefined;
}

export interface LeadSourceStatItem {
  name: string;
  value: number;
}

export interface StatCardItem {
  title: string;
  value: string | number;
  description: string;
  icon: LucideIcon;
  color: string;
  bg: string;
}

export interface ProvisioningAuditModalProps {
  serviceId: string | null;
  onClose: () => void;
}

export interface CriticalTicketsCardProps {
  tickets?: CriticalTicket[] | any[] | undefined;
  pendingCount?: number | undefined;
}

export interface ProvisioningAlertCardProps {
  services?: ErrorService[] | any[] | undefined;
  searchTerm: string;
  onSearchChange: (value: string) => void;
  onSelectService: (serviceId: string) => void;
}

export interface AdminStatCardsProps {
  stats?: AdminStatsData | any | undefined;
}

export interface FinancialPerformanceCardProps {
  totalRevenue?: number | undefined;
}

export interface LeadSourceChartCardProps {
  leadStats?: LeadSourceStatItem[] | any[] | undefined;
}
