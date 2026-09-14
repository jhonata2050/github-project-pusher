import { Globe, CheckCircle2, Shield } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { ClientDomain } from "./types";

interface DomainsListTabProps {
  clientDomains: ClientDomain[] | undefined;
  isLoadingDomains: boolean;
  defaultRegistrar: string | undefined;
}

export function DomainsListTab({
  clientDomains,
  isLoadingDomains,
  defaultRegistrar,
}: DomainsListTabProps) {
  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="rounded-2xl border-none shadow-sm bg-card p-5">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-emerald-500/10 text-emerald-600 rounded-xl">
              <Globe className="size-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-medium uppercase">Total de Domínios</p>
              <p className="text-xl font-bold text-foreground">{clientDomains?.length || 0}</p>
            </div>
          </div>
        </Card>
        <Card className="rounded-2xl border-none shadow-sm bg-card p-5">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-500/10 text-blue-600 rounded-xl">
              <CheckCircle2 className="size-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-medium uppercase">Domínios Ativos</p>
              <p className="text-xl font-bold text-foreground">
                {clientDomains?.filter((d) => d.status === "active").length || 0}
              </p>
            </div>
          </div>
        </Card>
        <Card className="rounded-2xl border-none shadow-sm bg-card p-5">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-purple-500/10 text-purple-600 rounded-xl">
              <Shield className="size-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-medium uppercase">Registrar Ativo</p>
              <p className="text-sm font-bold text-foreground uppercase">{defaultRegistrar || "Openprovider"}</p>
            </div>
          </div>
        </Card>
      </div>

      {isLoadingDomains ? (
        <div className="h-48 bg-muted/40 rounded-3xl animate-pulse" />
      ) : clientDomains && clientDomains.length > 0 ? (
        <div className="rounded-2xl border border-border bg-card overflow-hidden">
          <table className="w-full text-left text-sm">
            <thead className="bg-secondary/30 text-xs font-semibold text-muted-foreground uppercase">
              <tr>
                <th className="px-5 py-3.5">Domínio</th>
                <th className="px-5 py-3.5">Cliente</th>
                <th className="px-5 py-3.5">Status</th>
                <th className="px-5 py-3.5">Registrador</th>
                <th className="px-5 py-3.5">Expiração</th>
                <th className="px-5 py-3.5 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {clientDomains.map((d) => (
                <tr key={d.id} className="hover:bg-secondary/10">
                  <td className="px-5 py-4 font-bold text-foreground">
                    {d.domain_name || d.domain}
                  </td>
                  <td className="px-5 py-4 text-xs text-muted-foreground">
                    {d.profiles?.full_name || d.user_id}
                  </td>
                  <td className="px-5 py-4">
                    <Badge className={cn(
                      "rounded-full text-[10px] uppercase font-bold",
                      d.status === "active" ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" : "bg-warning/10 text-warning"
                    )}>
                      {d.status === "active" ? "Ativo" : d.status}
                    </Badge>
                  </td>
                  <td className="px-5 py-4 text-xs capitalize text-muted-foreground font-mono">
                    {d.registrar || "Openprovider"}
                  </td>
                  <td className="px-5 py-4 text-xs text-muted-foreground">
                    {d.expiry_date ? new Date(d.expiry_date).toLocaleDateString("pt-BR") : "---"}
                  </td>
                  <td className="px-5 py-4 text-right">
                    <Button variant="outline" size="sm" className="rounded-xl text-xs">
                      Gerenciar
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-16 bg-muted/20 rounded-3xl border-2 border-dashed border-muted">
          <Globe className="h-10 w-10 text-muted-foreground mb-3 opacity-30" />
          <p className="text-sm font-medium text-muted-foreground">Nenhum domínio cadastrado sob gestão no momento.</p>
        </div>
      )}
    </div>
  );
}
