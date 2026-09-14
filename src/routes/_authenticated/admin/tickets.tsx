import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { MessageSquare } from "lucide-react";
import { AppShell } from "@/components/app/AppShell";
import { getTickets, updateTicketStatus } from "@/lib/support.functions";
import {
  STATUS_MAP,
  STATUS_FILTERS,
  type TicketStatus,
  AdminTicketsHeader,
  AdminTicketsFilters,
  AdminTicketCard,
  AdminTicketsPagination,
} from "@/components/admin/tickets";

export { STATUS_MAP, STATUS_FILTERS };

export const Route = createFileRoute("/_authenticated/admin/tickets")({
  component: AdminTicketsPage,
});

function AdminTicketsPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("all");
  const pageSize = 20;

  const { data, isLoading } = useQuery({
    queryKey: ["admin-tickets", page, selectedStatus],
    queryFn: () => getTickets({ 
      data: { 
        offset: (page - 1) * pageSize, 
        limit: pageSize,
        status: selectedStatus === "all" ? undefined : selectedStatus 
      } 
    }),
  });

  const statusMutation = useMutation({
    mutationFn: (input: { ticketId: string; status: TicketStatus }) =>
      updateTicketStatus({ data: input }),
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ["admin-tickets"] });
      queryClient.invalidateQueries({ queryKey: ["ticket", vars.ticketId] });
      toast.success("Status do ticket atualizado com sucesso!");
    },
    onError: (err: any) => {
      toast.error(`Erro ao alterar status: ${err.message}`);
    }
  });

  const rawTickets = data?.tickets ?? [];
  const totalItems = data?.count ?? 0;
  const totalPages = Math.ceil(totalItems / pageSize);

  const filteredTickets = rawTickets.filter((t: any) => {
    if (!search.trim()) return true;
    const term = search.toLowerCase();
    const subject = (t.subject || "").toLowerCase();
    const id = (t.id || "").toLowerCase();
    const user = (t.user_id || "").toLowerCase();
    return subject.includes(term) || id.includes(term) || user.includes(term);
  });

  return (
    <AppShell area="admin" breadcrumb={<span>Atendimento / Tickets</span>}>
      <div className="space-y-6">
        <AdminTicketsHeader />

        <AdminTicketsFilters
          selectedStatus={selectedStatus}
          onSelectStatus={(s) => {
            setSelectedStatus(s);
            setPage(1);
          }}
          search={search}
          onSearchChange={setSearch}
        />

        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-20 rounded-3xl bg-muted animate-pulse" />
            ))}
          </div>
        ) : filteredTickets && filteredTickets.length > 0 ? (
          <div className="space-y-3">
            {filteredTickets.map((ticket: any) => (
              <AdminTicketCard
                key={ticket.id}
                ticket={ticket}
                onNavigate={(ticketId) => navigate({ to: "/tickets/$ticketId", params: { ticketId } })}
                onUpdateStatus={(ticketId, status) => statusMutation.mutate({ ticketId, status })}
              />
            ))}

            <AdminTicketsPagination
              currentCount={filteredTickets.length}
              totalItems={totalItems}
              page={page}
              totalPages={totalPages}
              onPageChange={setPage}
            />
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-16 bg-muted/30 rounded-3xl border-2 border-dashed border-muted">
            <MessageSquare className="h-10 w-10 text-muted-foreground mb-3 opacity-30" />
            <p className="text-muted-foreground font-medium text-sm">Nenhum ticket encontrado para este filtro.</p>
          </div>
        )}
      </div>
    </AppShell>
  );
}
