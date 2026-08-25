import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { AppShell } from "@/components/app/AppShell";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { 
  Globe, 
  Search, 
  Server, 
  Clock, 
  ExternalLink, 
  Plus, 
  ShieldCheck, 
  ChevronRight, 
  Lock 
} from "lucide-react";
import { cn } from "@/lib/utils";
import { getMyDomains } from "@/lib/domains.functions";

export const Route = createFileRoute("/_authenticated/domains/")({
  head: () => ({
    meta: [{ title: "Meus Domínios — Eqsam" }],
  }),
  component: ClientDomainsPage,
});

function ClientDomainsPage() {
  const navigate = useNavigate();
  const { data: domains, isLoading } = useQuery({
    queryKey: ["client-my-domains"],
    queryFn: () => getMyDomains(),
  });

  return (
    <AppShell
      area="client"
      breadcrumb={
        <>
          <span className="flex items-center gap-2 text-foreground font-medium">
            <Globe className="size-4 text-primary" /> Meus Domínios
          </span>
        </>
      }
    >
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">Meus Domínios</h1>
            <p className="text-muted-foreground mt-1">
              Gerencie seus servidores DNS (Nameservers), travas de segurança e renovação.
            </p>
          </div>
          <div className="flex gap-2">
            <Button 
              asChild
              className="rounded-2xl gap-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white shadow-sm"
            >
              <Link to="/domains/search">
                <Search className="size-4" /> Registrar Novo Domínio
              </Link>
            </Button>
          </div>
        </div>

        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-24 bg-card rounded-3xl animate-pulse" />
            ))}
          </div>
        ) : domains && domains.length > 0 ? (
          <div className="space-y-3">
            {domains.map((domain: any) => (
              <div 
                key={domain.id}
                onClick={() => navigate({ to: "/domains/$domainId", params: { domainId: domain.id } })}
                className="block group cursor-pointer"
              >
                <Card className="rounded-3xl border-none shadow-sm hover:shadow-md transition-all overflow-hidden bg-card hover:bg-secondary/20">
                  <CardContent className="p-0">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between p-5 sm:p-6 gap-4">
                      <div className="flex items-center gap-4">
                        <div className="h-12 w-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                          <Globe className="size-6" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-bold text-lg text-foreground group-hover:text-primary transition-colors">
                              {domain.domain_name}
                            </h3>
                            <Badge className={cn(
                              "rounded-full text-[10px] uppercase font-bold px-2.5",
                              domain.status === "active" 
                                ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" 
                                : "bg-warning/10 text-warning"
                            )}>
                              {domain.status === "active" ? "Ativo" : domain.status}
                            </Badge>
                            {domain.auto_renew && (
                              <Badge variant="outline" className="text-[10px] rounded-full hidden sm:inline-flex">
                                Auto-Renovação
                              </Badge>
                            )}
                          </div>
                          <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Clock className="size-3.5" />
                              Expira em: {domain.expiry_date ? new Date(domain.expiry_date).toLocaleDateString("pt-BR") : "---"}
                            </span>
                            <span className="flex items-center gap-1 font-mono text-[11px]">
                              <Server className="size-3.5" />
                              {domain.nameservers && domain.nameservers.length > 0 ? domain.nameservers[0] : "DNS Padrão"}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 self-end sm:self-center">
                        <Button variant="outline" size="sm" className="rounded-xl gap-1.5 text-xs">
                          Gerenciar DNS <ChevronRight className="size-3.5" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-20 bg-card rounded-3xl border-2 border-dashed border-border text-center p-6">
            <Globe className="h-16 w-16 text-muted-foreground mb-4 opacity-30" />
            <h3 className="text-lg font-bold text-foreground">Você ainda não possui domínios registrados</h3>
            <p className="text-sm text-muted-foreground max-w-md mt-1 mb-6">
              Registre domínios nacionais (.com.br) ou internacionais (.com, .net, etc.) com ativação imediata e gerenciador de DNS integrado.
            </p>
            <Button asChild className="rounded-2xl gap-2 bg-primary text-primary-foreground">
              <Link to="/domains/search">
                <Search className="size-4" /> Buscar e Registrar Domínio
              </Link>
            </Button>
          </div>
        )}
      </div>
    </AppShell>
  );
}
