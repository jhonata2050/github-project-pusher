import { Activity, CheckCircle2, Globe, Pencil, RefreshCw, Server, Shield, Trash2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { ServerRow, SyncResult } from "./types";

export interface ServerCardProps {
  server: any;
  syncResult?: SyncResult | undefined;
  onTest: (id: string) => void;
  isTesting: boolean;
  onSync: (id: string) => void;
  isSyncing: boolean;
  onEdit: (server: ServerRow) => void;
  onDelete: (id: string) => void;
  isDeleting: boolean;
}

export function ServerCard({
  server,
  syncResult,
  onTest,
  isTesting,
  onSync,
  isSyncing,
  onEdit,
  onDelete,
  isDeleting,
}: ServerCardProps) {
  const hasUserPipe = server.api_user?.includes("|");

  return (
    <Card className="rounded-3xl border-none shadow-sm hover:shadow-md transition-shadow overflow-hidden group">
      <CardHeader className="bg-brand/5 border-b border-brand/10 p-6">
        <div className="flex items-center justify-between">
          <div className="h-10 w-10 rounded-2xl bg-brand/20 flex items-center justify-center">
            <Server className="h-5 w-5 text-brand" />
          </div>
          <div className="flex flex-col items-end gap-1">
            <div className="flex items-center gap-2 text-xs font-semibold text-brand px-2 py-1 rounded-full bg-brand/10">
              <Activity className="h-3 w-3" /> Configurado
            </div>
            {!hasUserPipe && (
              <Badge variant="destructive" className="text-[9px] rounded-full uppercase px-2 py-0 animate-pulse">
                Usuário Inválido (Falta |)
              </Badge>
            )}
          </div>
        </div>
        <CardTitle className="mt-4 text-xl font-bold">{server.hostname}</CardTitle>
        <CardDescription className="flex items-center gap-1 mt-1">
          <Globe className="h-3 w-3" /> {server.hostname}
        </CardDescription>
      </CardHeader>
      <CardContent className="p-6 space-y-4">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground flex items-center gap-2">
            <Shield className="h-4 w-4" /> IP: {server.ip_address || "N/A"}
          </span>
          <span className="font-medium">0 / {server.max_accounts ?? 100} contas</span>
        </div>
        <div className="w-full bg-muted rounded-full h-2">
          <div className="bg-brand h-2 rounded-full w-[2%]" />
        </div>

        {syncResult && (
          <div className="rounded-2xl border border-brand/20 bg-brand/5 p-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <CheckCircle2 className="h-4 w-4 text-brand" />
              {syncResult.packages.length} pacotes sincronizados
            </div>
            <p className="mt-2 text-xs text-muted-foreground break-words">
              {syncResult.packages.join(", ")}
            </p>
          </div>
        )}

        <div className="grid grid-cols-2 gap-2 pt-2">
          <Button
            variant="outline"
            className="rounded-2xl border-brand/20 text-brand hover:bg-brand/5 cursor-pointer"
            onClick={() => onTest(server.id)}
            disabled={isTesting}
          >
            {isTesting ? "Testando..." : "Testar Conexão"}
          </Button>
          <Button
            className="rounded-2xl bg-brand text-brand-foreground hover:bg-brand/90 cursor-pointer"
            onClick={() => onSync(server.id)}
            disabled={isSyncing}
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${isSyncing ? "animate-spin" : ""}`} />
            {isSyncing ? "Sincronizando..." : "Sincronizar pacotes"}
          </Button>
          <Button
            variant="outline"
            className="rounded-2xl cursor-pointer"
            onClick={() =>
              onEdit({
                id: server.id,
                name: server.hostname,
                hostname: server.hostname,
                ip_address: server.ip_address || "",
                api_user: server.api_user || "",
                max_accounts: server.max_accounts || 100,
              })
            }
          >
            <Pencil className="mr-2 h-4 w-4" /> Editar
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="rounded-xl text-destructive hover:bg-destructive/5 cursor-pointer"
            onClick={() => {
              if (confirm(`Remover o servidor ${server.hostname}?`)) {
                onDelete(server.id);
              }
            }}
            disabled={isDeleting}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
