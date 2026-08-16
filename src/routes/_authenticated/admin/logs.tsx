import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Database, Mail, Shield, Activity, Search, Palette } from "lucide-react";
import { useState } from "react";
import { AppShell } from "@/components/app/AppShell";
import { Pagination } from "@/components/app/Pagination";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { getSystemLogs } from "@/lib/logs.functions";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export const Route = createFileRoute("/_authenticated/admin/logs")({
  head: () => ({
    meta: [
      { title: "Auditoria e logs — HostPanel" },
      { name: "description", content: "Auditoria de acessos, alterações, eventos e e-mails da HostPanel." },
      { property: "og:title", content: "Auditoria e logs — HostPanel" },
      { property: "og:description", content: "Auditoria de acessos, alterações, eventos e e-mails da HostPanel." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: LogsPage,
});

function LogsPage() {
  const [activeTab, setActiveTab] = useState<"email" | "auth" | "data" | "system" | "all">("all");
  const [page, setPage] = useState(1);
  const pageSize = 20;

  const { data, isLoading } = useQuery({
    queryKey: ["admin-logs", activeTab, page],
    queryFn: () => getSystemLogs({ data: { type: activeTab, offset: (page - 1) * pageSize, limit: pageSize } }),
  });

  const logs = data?.logs || [];
  const totalItems = data?.count || 0;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));

  return (
    <AppShell
      area="admin"
      breadcrumb={
        <>
          <span>Admin</span>
          <span>/</span>
          <span className="font-medium text-foreground">Logs do Sistema</span>
        </>
      }
    >
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Logs do Sistema</h1>
          <p className="text-sm text-muted-foreground">
             Consulte acessos, tentativas, alterações de dados, eventos do sistema e e-mails.
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={(v) => { setActiveTab(v as any); setPage(1); }} className="w-full">
          <div className="overflow-x-auto pb-2">
            <TabsList className="bg-muted/50 p-1 rounded-2xl h-12 w-max min-w-full justify-start sm:w-auto">
              <TabsTrigger value="all" className="rounded-xl flex gap-2">
                <Activity className="size-4" /> Todos
              </TabsTrigger>
              <TabsTrigger value="auth" className="rounded-xl flex gap-2">
                <Shield className="size-4" /> Autenticação
              </TabsTrigger>
              <TabsTrigger value="data" className="rounded-xl flex gap-2">
                <Database className="size-4" /> Alterações
              </TabsTrigger>
              <TabsTrigger value="system" className="rounded-xl flex gap-2">
                <Activity className="size-4" /> Sistema
              </TabsTrigger>
              <TabsTrigger value="email" className="rounded-xl flex gap-2">
                <Mail className="size-4" /> E-mails
              </TabsTrigger>
              <TabsTrigger value="branding" className="rounded-xl flex gap-2">
                <Palette className="size-4" /> Branding
              </TabsTrigger>
            </TabsList>
          </div>

          <div className="mt-6 border border-border rounded-2xl overflow-hidden bg-card">
            {isLoading ? (
              <div className="p-8">
                <Skeleton className="h-40 w-full rounded-xl" />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="whitespace-nowrap">Data/Hora</TableHead>
                      <TableHead className="hidden sm:table-cell">Categoria</TableHead>
                      <TableHead>Usuário</TableHead>
                      <TableHead>Evento</TableHead>
                      <TableHead className="hidden md:table-cell">Detalhes</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                <TableBody>
                  {logs.length > 0 ? (
                    logs.map((log) => (
                      <TableRow key={log.id}>
                        <TableCell className="text-xs">
                          {format(new Date(log.createdAt), "dd/MM/yyyy HH:mm:ss", { locale: ptBR })}
                        </TableCell>
                        <TableCell className="text-xs capitalize hidden sm:table-cell">{log.category}</TableCell>
                        <TableCell className="text-xs">
                          {log.profileName || log.actorEmail || "Sistema"}
                        </TableCell>
                        <TableCell className="text-xs font-medium">{log.action}</TableCell>
                        <TableCell className="text-sm max-w-[320px] hidden md:table-cell">
                          <p>{log.description}</p>
                          {(log.entityType || log.ipAddress) && (
                            <p className="mt-1 text-xs text-muted-foreground">
                              {[log.entityType, log.entityId, log.ipAddress].filter(Boolean).join(" · ")}
                            </p>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant={log.status === "failure" ? "destructive" : "secondary"}>
                            {log.status === "success" || log.status === "sent" ? "Sucesso" : log.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                        <div className="flex flex-col items-center gap-2">
                          <Search className="size-8 opacity-20" />
                          <p>Nenhum evento encontrado neste filtro.</p>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
                </Table>
              </div>
            )}
          </div>

          {!isLoading && logs.length > 0 && (
            <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />
          )}
        </Tabs>
      </div>
    </AppShell>
  );
}
