import type { RefObject } from "react";

export interface TicketProfile {
  id?: string | undefined;
  full_name?: string | null | undefined;
  email?: string | null | undefined;
  [key: string]: any;
}

export interface TicketMessage {
  id: string;
  ticket_id: string;
  user_id?: string | null | undefined;
  message: string;
  is_staff?: boolean | null | undefined;
  created_at: string;
  attachments?: string[] | null | undefined;
  profile?: TicketProfile | null | undefined;
  [key: string]: any;
}

export interface TicketData {
  id: string;
  user_id: string;
  subject?: string | null | undefined;
  status?: "open" | "answered" | "customer-reply" | "in_progress" | "on_hold" | "closed" | string | null | undefined;
  priority?: string | null | undefined;
  created_at?: string | null | undefined;
  updated_at?: string | null | undefined;
  profile?: TicketProfile | null | undefined;
  [key: string]: any;
}

export type TicketStatusType = "open" | "answered" | "customer-reply" | "in_progress" | "on_hold" | "closed";

export interface TicketStatusInfo {
  label: string;
  color: string;
}

export interface TicketHeaderProps {
  ticket: TicketData;
  isStaff: boolean;
  statusInfo: TicketStatusInfo;
  isStatusPending: boolean;
  onUpdateStatus: (status: TicketStatusType) => void;
}

export interface TicketMessageListProps {
  messages: TicketMessage[];
  scrollRef: RefObject<HTMLDivElement | null>;
}

export interface TicketReplyFormProps {
  ticketStatus?: string | null | undefined;
  message: string;
  attachments: File[];
  uploading: boolean;
  isSubmitting: boolean;
  onMessageChange: (message: string) => void;
  onFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onRemoveAttachment: (index: number) => void;
  onSubmit: (e: React.FormEvent) => void;
  onReopen: () => void;
  fileInputRef: RefObject<HTMLInputElement | null>;
}

export interface TicketSidebarInfoProps {
  ticket: TicketData;
  statusInfo: TicketStatusInfo;
}
