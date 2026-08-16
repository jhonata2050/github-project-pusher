import { createFileRoute, Link, Outlet } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Search, Store, Users, ExternalLink, Trash2, ChevronLeft, ChevronRight } from "lucide-react";

import { useState } from "react";
import { toast } from "sonner";
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { bulkDeleteClients } from "@/lib/admin.functions";


import { AppShell } from "@/components/app/AppShell";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/admin/clients")({
  head: () => ({
    meta: [
      { title: "Clientes — HostPanel" },
      {
        name: "description",
        content: "Lista de clientes da hospedagem com contato, documento e situação da conta.",
      },
      { property: "og:title", content: "Clientes — HostPanel" },
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
        .select("id, full_name, email, company_name, tax_id, phone, status, created_at", { count: 'exact' });

      if (term) {
        query = query.or(`full_name.ilike.%${term}%,email.ilike.%${term}%,company_name.ilike.%${term}%,tax_id.ilike.%${term}%`);
      }

      const { data, count, error } = await query
        .order("created_at", { ascending: false })
        .range((page - 1) * pageSize, page * pageSize - 1);
      if (error) throw error;
      return { data, count: count || 0 };
    },
    staleTime: 1000 * 60 * 5,
  });

  const filtered = clients.data?.data ?? [];
  const totalItems = clients.data?.count ?? 0;
  const totalPages = Math.ceil(totalItems / pageSize);

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
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mt-6">
        <h1 className="text-2xl font-semibold tracking-tight">Seus clientes</h1>
        
        {selectedIds.length > 0 && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" className="rounded-xl flex gap-2 h-11">
                <Trash2 className="size-4" /> Excluir {selectedIds.length} selecionados
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent className="rounded-3xl">
              <AlertDialogHeader>
                <AlertDialogTitle>Tem certeza absoluta?</AlertDialogTitle>
                <AlertDialogDescription>
                  Esta ação excluirá permanentemente {selectedIds.length} clientes e todos os seus serviços, faturas e históricos associados. Esta ação não pode ser desfeita.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel className="rounded-xl">Cancelar</AlertDialogCancel>
                <AlertDialogAction 
                  onClick={handleDelete}
                  disabled={isDeleting}
                  className="rounded-xl bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  {isDeleting ? "Excluindo..." : "Sim, excluir tudo"}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </div>

      <div className="relative mt-6 max-w-sm">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={term}
          onChange={(e) => {
            setTerm(e.target.value);
            setPage(1);
            // Limpa a seleção ao mudar a busca para evitar excluir clientes
            // que ficaram selecionados fora do filtro atual.
            setSelectedIds([]);
          }}
          placeholder="Pesquisar por nome, e-mail ou documento"
          className="h-11 rounded-xl pl-9"
        />
      </div>


      {clients.isLoading ? (
        <Skeleton className="mt-6 h-56 rounded-2xl" />
      ) : filtered.length === 0 ? (
        <p className="py-24 text-center text-sm text-muted-foreground">Nenhum cliente encontrado</p>
      ) : (
        <div className="mt-6">
          <div className="overflow-x-auto rounded-2xl border border-border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">
                    <Checkbox 
                      checked={selectedIds.length === filtered.length && filtered.length > 0}
                      onCheckedChange={toggleSelectAll}
                      aria-label="Selecionar todos"
                    />
                  </TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead className="hidden md:table-cell">E-mail</TableHead>
                  <TableHead className="hidden sm:table-cell">Documento</TableHead>
                  <TableHead className="hidden lg:table-cell">Telefone</TableHead>
                  <TableHead>Situação</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((client) => (
                  <TableRow key={client.id} className={selectedIds.includes(client.id) ? "bg-muted/30" : ""}>
                    <TableCell>
                      <Checkbox 
                        checked={selectedIds.includes(client.id)}
                        onCheckedChange={() => toggleSelect(client.id)}
                        aria-label={`Selecionar ${client.full_name}`}
                      />
                    </TableCell>
                    <TableCell className="font-medium">
                      <div className="flex flex-col">
                        <span>{client.full_name ?? "Sem nome"}</span>
                        <span className="text-xs text-muted-foreground md:hidden">{client.email}</span>
                      </div>
                      {client.company_name && (
                        <span className="block text-xs text-muted-foreground">{client.company_name}</span>
                      )}
                    </TableCell>
                    <TableCell className="hidden text-muted-foreground md:table-cell">{client.email ?? "—"}</TableCell>
                    <TableCell className="hidden text-muted-foreground sm:table-cell">{client.tax_id ?? "—"}</TableCell>
                    <TableCell className="hidden text-muted-foreground lg:table-cell">{client.phone ?? "—"}</TableCell>
                    <TableCell>
                      <Badge variant={client.status === "active" ? "default" : "secondary"}>
                        {client.status === "active" ? "Ativo" : client.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" asChild>
                        <Link to="/admin/clients/$clientId" params={{ clientId: client.id }}>
                          <ExternalLink className="size-4" />
                        </Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <div className="mt-6 flex items-center justify-between gap-4">
            <div className="text-sm text-muted-foreground">
              Mostrando {filtered.length} de {totalItems} clientes
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="rounded-xl"
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page <= 1}
              >
                <ChevronLeft className="size-4 mr-2" /> Anterior
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="rounded-xl"
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
              >
                Próximo <ChevronRight className="size-4 ml-2" />
              </Button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
