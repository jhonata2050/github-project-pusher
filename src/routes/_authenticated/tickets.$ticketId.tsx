import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/app/AppShell";
import { Card } from "@/components/ui/card";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getTicketDetails, replyTicket, updateTicketStatus } from "@/lib/support.functions";
import { useIsStaff } from "@/hooks/use-auth";
import { useState, useEffect, useRef } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  TicketHeader,
  TicketMessageList,
  TicketReplyForm,
  TicketSidebarInfo,
  getTicketStatusInfo,
  type TicketStatusType,
} from "@/components/tickets";

export const Route = createFileRoute("/_authenticated/tickets/$ticketId")({
  component: TicketDetailsPage,
});

function TicketDetailsPage() {
  const { isStaff } = useIsStaff();
  const { ticketId } = Route.useParams();
  const [message, setMessage] = useState("");
  const [attachments, setAttachments] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();
  const scrollRef = useRef<HTMLDivElement>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["ticket", ticketId],
    queryFn: () => getTicketDetails({ data: ticketId }),
  });

  const replyMutation = useMutation({
    mutationFn: async ({ text, attachmentUrls }: { text: string; attachmentUrls: string[] }) => {
      return replyTicket({ data: { ticketId, message: text, attachments: attachmentUrls } });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ticket", ticketId] });
      queryClient.invalidateQueries({ queryKey: ["admin-tickets"] });
      queryClient.invalidateQueries({ queryKey: ["client-tickets"] });
      setMessage("");
      setAttachments([]);
      toast.success("Resposta enviada!");
    },
    onError: (err: any) => {
      toast.error("Erro ao responder: " + err.message);
    },
  });

  const statusMutation = useMutation({
    mutationFn: (status: TicketStatusType) =>
      updateTicketStatus({ data: { ticketId, status } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ticket", ticketId] });
      queryClient.invalidateQueries({ queryKey: ["admin-tickets"] });
      queryClient.invalidateQueries({ queryKey: ["client-tickets"] });
      toast.success("Status do ticket atualizado!");
    },
    onError: (err: any) => {
      toast.error("Erro ao atualizar status: " + err.message);
    },
  });

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      setAttachments(prev => [...prev, ...newFiles]);
    }
  };

  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const uploadFiles = async () => {
    const urls: string[] = [];
    for (const file of attachments) {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random().toString(36).substring(2)}_${Date.now()}.${fileExt}`;
      const filePath = `${ticketId}/${fileName}`;

      const { data, error } = await supabase.storage
        .from('ticket-attachments')
        .upload(filePath, file);

      if (error) {
        console.error('Error uploading file:', error);
        throw new Error(`Erro ao fazer upload de ${file.name}`);
      }

      if (data) {
        const { data: { publicUrl } } = supabase.storage
          .from('ticket-attachments')
          .getPublicUrl(filePath);
        urls.push(publicUrl);
      }
    }
    return urls;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() && attachments.length === 0) return;

    setUploading(true);
    try {
      const attachmentUrls = await uploadFiles();
      replyMutation.mutate({ text: message, attachmentUrls });
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setUploading(false);
    }
  };

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [data?.messages]);

  if (isLoading) return <div className="h-96 flex items-center justify-center">Carregando ticket...</div>;
  if (!data) return <div>Ticket não encontrado</div>;

  const { ticket, messages } = data;
  const statusInfo = getTicketStatusInfo(ticket.status);

  return (
    <AppShell 
      area={isStaff ? "admin" : "client"} 
      breadcrumb={
        <>
          <Link to={isStaff ? "/admin/tickets" : "/tickets"} className="hover:text-brand transition-colors">Tickets</Link>
          <span>/</span>
          <span className="font-medium text-foreground truncate max-w-[200px]">{ticket.subject}</span>
        </>
      }
    >
      <div className="max-w-5xl mx-auto space-y-6">
        <TicketHeader
          ticket={ticket}
          isStaff={isStaff}
          statusInfo={statusInfo}
          isStatusPending={statusMutation.isPending}
          onUpdateStatus={(status) => statusMutation.mutate(status)}
        />

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className="lg:col-span-3 space-y-4">
            <Card className="rounded-3xl border-none shadow-sm overflow-hidden flex flex-col h-[600px] bg-card">
              <TicketMessageList
                messages={messages}
                scrollRef={scrollRef}
              />

              <TicketReplyForm
                ticketStatus={ticket.status}
                message={message}
                attachments={attachments}
                uploading={uploading}
                isSubmitting={replyMutation.isPending}
                onMessageChange={setMessage}
                onFileUpload={handleFileUpload}
                onRemoveAttachment={removeAttachment}
                onSubmit={handleSubmit}
                onReopen={() => statusMutation.mutate("open")}
                fileInputRef={fileInputRef}
              />
            </Card>
          </div>

          <TicketSidebarInfo
            ticket={ticket}
            statusInfo={statusInfo}
          />
        </div>
      </div>
    </AppShell>
  );
}
