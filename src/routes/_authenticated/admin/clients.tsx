import { createFileRoute, Outlet } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Store, Users } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { bulkDeleteClients } from "@/lib/admin.functions";
import { AppShell } from "@/components/app/AppShell";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import {
  ClientsHeader,
  ClientsSearchBar,
  ClientsTable,
  ClientsPagination,
} from "@/components/admin/clients/list/index";

export const Route = createFileRoute("/_authenticated/admin/clients")({
  head: () => ({
    meta: [
      { title: "Clientes — Eqsam" },
      {
        name: "description",
        content: "Lista de clientes da hospedagem com contato, documento e situação da conta.",
      },
      { property: "og:title", content: "Clientes — Eqsam" },
      { property: "og:description", content: "Lista de clientes com contato, documento e situação." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ClientsLayout,
});

function ClientsLayout() {
  return (
    <div className="w-full">
      <Outlet />
    </div>
  );
}

export function ClientsPage() {
  const [term, setTerm] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isDeleting, setIsDeleting] = useState(false);
  const [page, setPage] = useState(1);
  const pageSize = 20;
  const queryClient = useQueryClient();

  const clients = useQuery({
    queryKey: ["admin-clients", page, term],
    queryFn: async () => {
      let query = supabase
        .from("profiles")
        .select("id, full_name, email, company_name, tax_id, phone, status, created_at, whmcs_id", { count: "exact" });

      if (term) {
        query = query.or(`full_name.ilike.%${term}%,email.ilike.%${term}%,company_name.ilike.%${term}%,tax_id.ilike.%${term}%`);
      }

      const { data, count, error } = await query
        .order("created_at", { ascending: false });

      if (error) throw error;
      return { data: data || [], count: count || 0 };
    },
    staleTime: 0,
  });

  const filtered = clients.data?.data ?? [];
  const totalItems = clients.data?.count ?? 0;

  const paginatedData = filtered.slice((page - 1) * pageSize, page * pageSize);
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));

  const toggleSelect = (id: string) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === filtered.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filtered.map(c => c.id));
    }
  };

  const handleDelete = async () => {
    if (selectedIds.length === 0) return;

    setIsDeleting(true);
    try {
      const result = await bulkDeleteClients({ data: { clientIds: selectedIds } });
      toast.success(`${result.deletedCount} clientes excluídos com sucesso.`);
      if (result.failuresCount > 0) {
        toast.error(`Falha ao excluir ${result.failuresCount} clientes.`);
      }
      setSelectedIds([]);
      queryClient.invalidateQueries({ queryKey: ["admin-clients"] });
    } catch (err: any) {
      toast.error(err.message || "Erro ao excluir clientes");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <AppShell
      area="admin"
      breadcrumb={
        <>
          <span className="flex items-center gap-2">
            <Store className="size-4" />
            Sua Loja
          </span>
          <span>/</span>
          <span className="flex items-center gap-2 font-medium text-foreground">
            <Users className="size-4" />
            Clientes
          </span>
        </>
      }
    >
      <ClientsHeader
        selectedCount={selectedIds.length}
        isDeleting={isDeleting}
        onDelete={handleDelete}
      />

      <ClientsSearchBar
        term={term}
        onSearchChange={(value) => {
          setTerm(value);
          setPage(1);
          setSelectedIds([]);
        }}
      />

      {clients.isLoading ? (
        <Skeleton className="mt-6 h-56 rounded-2xl" />
      ) : totalItems === 0 ? (
        <div className="py-24 text-center">
          <p className="text-sm text-muted-foreground">Nenhum cliente encontrado ({totalItems})</p>
          <Button variant="outline" className="mt-4" onClick={() => queryClient.invalidateQueries()}>
            Atualizar Lista
          </Button>
        </div>
      ) : (
        <div className="mt-6">
          <ClientsTable
            paginatedData={paginatedData}
            filtered={filtered}
            selectedIds={selectedIds}
            onToggleSelect={toggleSelect}
            onToggleSelectAll={toggleSelectAll}
          />
          <ClientsPagination
            page={page}
            totalPages={totalPages}
            filteredCount={filtered.length}
            totalItems={totalItems}
            onPageChange={setPage}
          />
        </div>
      )}
    </AppShell>
  );
}
