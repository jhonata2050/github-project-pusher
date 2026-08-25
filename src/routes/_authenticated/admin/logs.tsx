import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { 
  ShieldAlert, 
  Search, 
  Filter, 
  Clock, 
  User, 
  Server, 
  AlertTriangle,
  Info,
  ChevronRight,
  Database
} from "lucide-react";
import { useState } from "react";
import { AppShell } from "@/components/app/AppShell";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/admin/logs")({
  component: SystemLogsPage,
});

function SystemLogsPage() {
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [levelFilter, setLevelFilter] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");

  const { data: logs, isLoading } = useQuery({
    queryKey: ["admin-system-logs", categoryFilter, levelFilter],
    queryFn: async () => {
      const { getSystemLogs } = await import("@/lib/system-logs.functions");
      return getSystemLogs({ 
        data: { 
          category: categoryFilter === "all" ? undefined : categoryFilter,
          level: levelFilter === "all" ? undefined : levelFilter,
          limit: 100
        } 
      });
    },
    refetchInterval: 15000,
  });

  const getLevelBadge = (level: string) => {
    switch (level) {
      case 'critical': return <Badge className="bg-red-600 text-white border-none font-black text-[9px]">CRÍTICO</Badge>;
      case 'error': return <Badge variant="destructive" className="font-black text-[9px]">ERRO</Badge>;
      case 'warning': return <Badge className="bg-orange-500 text-white border-none font-black text-[9px]">ALERTA</Badge>;
      default: return <Badge variant="secondary" className="font-black text-[9px]">INFO</Badge>;
    }
  };

  const getLevelIcon = (level: string) => {
    switch (level) {
      case 'critical': return <AlertTriangle className="size-4 text-red-600" />;
      case 'error': return <ShieldAlert className="size-4 text-red-500" />;
      case 'warning': return <AlertTriangle className="size-4 text-orange-500" />;
      default: return <Info className="size-4 text-blue-500" />;
    }
  };

  const filteredLogs = logs?.filter((log: any) => {
    const search = searchTerm.toLowerCase();
    return (
      log.message.toLowerCase().includes(search) ||
      log.category.toLowerCase().includes(search) ||
      log.profiles?.full_name?.toLowerCase().includes(search) ||
      log.services?.domain?.toLowerCase().includes(search)
    );
  }) || [];

  return (
    <AppShell
      area="admin"
      breadcrumb={
        <>
          <span>Admin</span>
          <span>/</span>
          <span className="font-medium text-foreground flex items-center gap-2">
            <Database className="size-4" /> Logs do Sistema
          </span>
        </>
      }
    >
      <div className="flex flex-col gap-6 mt-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Logs de Auditoria</h1>
            <p className="text-muted-foreground text-sm">
              Monitore conflitos, falhas de provisionamento e ações críticas.
            </p>
          </div>
          <Badge variant="outline" className="bg-background/50 border-border/50 py-1 px-3 flex items-center gap-2 rounded-full text-[10px] text-muted-foreground font-medium w-fit">
            <Clock className="size-3" />
            AO VIVO
          </Badge>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input 
              placeholder="Buscar em logs..." 
              className="pl-9 rounded-xl"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="rounded-xl">
              <div className="flex items-center gap-2">
                <Filter className="size-4 text-muted-foreground" />
                <SelectValue placeholder="Categoria" />
              </div>
            </SelectTrigger>
            <SelectContent className="rounded-xl">
              <SelectItem value="all">Todas Categorias</SelectItem>
              <SelectItem value="directadmin">DirectAdmin</SelectItem>
              <SelectItem value="provisioning">Provisionamento</SelectItem>
              <SelectItem value="security">Segurança</SelectItem>
              <SelectItem value="finance">Financeiro</SelectItem>
            </SelectContent>
          </Select>

          <Select value={levelFilter} onValueChange={setLevelFilter}>
            <SelectTrigger className="rounded-xl">
              <div className="flex items-center gap-2">
                <ShieldAlert className="size-4 text-muted-foreground" />
                <SelectValue placeholder="Nível" />
              </div>
            </SelectTrigger>
            <SelectContent className="rounded-xl">
              <SelectItem value="all">Todos Níveis</SelectItem>
              <SelectItem value="critical">Crítico</SelectItem>
              <SelectItem value="error">Erro</SelectItem>
              <SelectItem value="warning">Alerta</SelectItem>
              <SelectItem value="info">Info</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Card className="rounded-3xl border-border/50 shadow-sm border overflow-hidden">
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-8 space-y-4">
                {[1, 2, 3, 4, 5].map(i => <div key={i} className="h-16 bg-muted/50 animate-pulse rounded-2xl" />)}
              </div>
            ) : filteredLogs.length > 0 ? (
              <div className="divide-y divide-border/50">
                {filteredLogs.map((log: any) => (
                  <div key={log.id} className={cn(
                    "p-4 hover:bg-muted/5 transition-colors flex flex-col gap-2",
                    log.level === 'critical' && "bg-red-500/[0.02] border-l-4 border-l-red-600"
                  )}>
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-center gap-2">
                        {getLevelIcon(log.level)}
                        <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                          {log.category}
                        </span>
                        {getLevelBadge(log.level)}
                      </div>
                      <span className="text-[10px] text-muted-foreground font-medium">
                        {format(new Date(log.created_at), "dd/MM/yyyy HH:mm:ss", { locale: ptBR })}
                      </span>
                    </div>

                    <p className="text-sm font-medium leading-relaxed">
                      {log.message}
                    </p>

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1">
                      {log.profiles && (
                        <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground bg-secondary/40 px-2 py-0.5 rounded-full">
                          <User className="size-3" />
                          <span className="font-bold">{log.profiles.full_name}</span>
                        </div>
                      )}
                      {log.services && (
                        <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground bg-secondary/40 px-2 py-0.5 rounded-full">
                          <Server className="size-3" />
                          <span className="font-bold">{log.services.domain}</span>
                        </div>
                      )}
                      {log.metadata && Object.keys(log.metadata).length > 0 && (
                        <div className="text-[10px] text-muted-foreground italic truncate max-w-md">
                          Meta: {JSON.stringify(log.metadata).slice(0, 100)}...
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-20 text-center flex flex-col items-center gap-3">
                <Database className="size-12 text-muted-foreground/20" />
                <p className="text-muted-foreground font-medium">Nenhum log encontrado com estes filtros.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
