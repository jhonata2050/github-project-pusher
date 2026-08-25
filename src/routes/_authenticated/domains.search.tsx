import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/app/AppShell";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useMutation } from "@tanstack/react-query";
import { 
  Globe, 
  Search, 
  CheckCircle2, 
  XCircle, 
  ShoppingCart, 
  Sparkles, 
  ArrowLeft, 
  Zap, 
  ShieldCheck 
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { checkDomainWhois, requestDomainOrder } from "@/lib/domains.functions";

export const Route = createFileRoute("/_authenticated/domains/search")({
  head: () => ({
    meta: [{ title: "Buscar e Registrar Domínio — Eqsam" }],
  }),
  component: DomainSearchPage,
});

const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

function DomainSearchPage() {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState<any>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [orderingDomain, setOrderingDomain] = useState<string | null>(null);

  const searchMutation = useMutation({
    mutationFn: (query: string) => checkDomainWhois({ data: { query } }),
    onMutate: () => setIsSearching(true),
    onSuccess: (data) => {
      setSearchResults(data);
      setIsSearching(false);
    },
    onError: (err: any) => {
      setIsSearching(false);
      toast.error(`Erro ao consultar domínio: ${err.message}`);
    }
  });

  const orderMutation = useMutation({
    mutationFn: (domainName: string) => 
      requestDomainOrder({ data: { domainName, periodYears: 1 } }),
    onMutate: (domainName) => setOrderingDomain(domainName),
    onSuccess: (res) => {
      toast.success(`Fatura para registro de ${res.domainName} gerada com sucesso!`);
      navigate({ to: "/invoices/$invoiceId", params: { invoiceId: res.invoiceId } });
    },
    onError: (err: any) => {
      setOrderingDomain(null);
      toast.error(`Erro ao gerar pedido: ${err.message}`);
    }
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchTerm.trim()) return;
    searchMutation.mutate(searchTerm);
  };

  return (
    <AppShell
      area="client"
      breadcrumb={
        <>
          <Link to="/domains" className="flex items-center gap-1.5 hover:text-foreground">
            <Globe className="size-4 text-primary" /> Meus Domínios
          </Link>
          <span>/</span>
          <span className="font-semibold text-foreground">Registrar Domínio</span>
        </>
      }
    >
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="text-center space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold">
            <Sparkles className="size-3.5" /> Verificador WHOIS & RDAP em Tempo Real
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground">
            Encontre o domínio perfeito para o seu projeto
          </h1>
          <p className="text-sm text-muted-foreground max-w-lg mx-auto">
            Consulte a disponibilidade de domínios nacionais (.com.br) e internacionais (.com, .net, .store) com ativação imediata.
          </p>
        </div>

        {/* Barra de Busca de Domínio */}
        <Card className="rounded-3xl border-2 border-primary/20 shadow-lg bg-card p-3 sm:p-4">
          <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Globe className="absolute left-4 top-1/2 -translate-y-1/2 size-5 text-muted-foreground" />
              <Input 
                placeholder="Exemplo: minhaempresa.com.br ou meuprojeto" 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-12 rounded-2xl h-14 text-base sm:text-lg border-none bg-muted/40 font-medium"
              />
            </div>
            <Button 
              type="submit" 
              disabled={isSearching || !searchTerm.trim()}
              className="h-14 px-8 rounded-2xl text-base font-bold bg-primary text-primary-foreground hover:bg-primary/90 shadow-md gap-2"
            >
              <Search className="size-5" />
              {isSearching ? "Consultando..." : "Pesquisar"}
            </Button>
          </form>
        </Card>

        {/* Resultados da Busca */}
        {isSearching && (
          <div className="space-y-4">
            <Skeleton className="h-28 w-full rounded-3xl" />
            <Skeleton className="h-20 w-full rounded-2xl" />
            <Skeleton className="h-20 w-full rounded-2xl" />
          </div>
        )}

        {!isSearching && searchResults?.primary && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-3 duration-300">
            {/* Resultado Principal */}
            <Card className={cn(
              "rounded-3xl border-2 p-6 transition-all shadow-md",
              searchResults.primary.available 
                ? "border-emerald-500/40 bg-emerald-500/5" 
                : "border-border bg-card"
            )}>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-start sm:items-center gap-4">
                  <div className={cn(
                    "p-3 rounded-2xl shrink-0 mt-1 sm:mt-0",
                    searchResults.primary.available ? "bg-emerald-500/20 text-emerald-600" : "bg-muted text-muted-foreground"
                  )}>
                    {searchResults.primary.available ? (
                      <CheckCircle2 className="size-8 text-emerald-600" />
                    ) : (
                      <XCircle className="size-8 text-destructive" />
                    )}
                  </div>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-xl sm:text-2xl font-black text-foreground">
                        {searchResults.primary.domain}
                      </h2>
                      <Badge className={cn(
                        "rounded-full text-[10px] font-bold uppercase px-3 py-0.5",
                        searchResults.primary.available 
                          ? "bg-emerald-500 text-white" 
                          : "bg-destructive text-destructive-foreground"
                      )}>
                        {searchResults.primary.available ? "Disponível!" : "Indisponível"}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {searchResults.primary.available 
                        ? "Parabéns! Este domínio está livre para ser registrado agora."
                        : `Este domínio já foi registrado.${searchResults.primary.expiresAt ? ` Expira em: ${new Date(searchResults.primary.expiresAt).toLocaleDateString('pt-BR')}` : ''}`}
                    </p>
                  </div>
                </div>

                {searchResults.primary.available ? (
                  <div className="flex flex-col sm:items-end gap-2 shrink-0">
                    <div className="text-2xl font-extrabold text-primary">
                      {brl.format(searchResults.primary.price)}
                      <span className="text-xs font-normal text-muted-foreground">/ano</span>
                    </div>
                    <Button 
                      disabled={orderingDomain === searchResults.primary.domain}
                      onClick={() => orderMutation.mutate(searchResults.primary.domain)}
                      className="rounded-2xl h-11 px-6 font-bold bg-primary text-primary-foreground gap-2 shadow-sm"
                    >
                      <ShoppingCart className="size-4" />
                      {orderingDomain === searchResults.primary.domain ? "Gerando Fatura..." : "Registrar Agora"}
                    </Button>
                  </div>
                ) : (
                  <Button variant="outline" disabled className="rounded-2xl text-xs">
                    Já Registrado
                  </Button>
                )}
              </div>
            </Card>

            {/* Extensões Sugeridas */}
            {searchResults.suggestions && searchResults.suggestions.length > 0 && (
              <div className="space-y-3 pt-4">
                <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
                  Outras extensões disponíveis
                </h3>

                <div className="grid gap-3 sm:grid-cols-2">
                  {searchResults.suggestions.map((sug: any) => (
                    <Card 
                      key={sug.domain}
                      className={cn(
                        "rounded-2xl border p-4 transition-all bg-card flex items-center justify-between gap-3",
                        sug.available ? "hover:border-primary/50 shadow-sm" : "opacity-60 bg-muted/20"
                      )}
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm text-foreground truncate">{sug.domain}</span>
                          <Badge variant="outline" className={cn(
                            "text-[9px] uppercase px-1.5 py-0 rounded-md font-bold",
                            sug.available ? "text-emerald-600 border-emerald-500/30" : "text-muted-foreground"
                          )}>
                            {sug.available ? "Disponível" : "Ocupado"}
                          </Badge>
                        </div>
                        <span className="text-xs font-semibold text-primary mt-1 block">
                          {brl.format(sug.price)}/ano
                        </span>
                      </div>

                      {sug.available && (
                        <Button 
                          size="sm"
                          disabled={orderingDomain === sug.domain}
                          onClick={() => orderMutation.mutate(sug.domain)}
                          className="rounded-xl text-xs gap-1.5 shrink-0 bg-primary text-primary-foreground"
                        >
                          <ShoppingCart className="size-3.5" />
                          {orderingDomain === sug.domain ? "..." : "Registrar"}
                        </Button>
                      )}
                    </Card>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </AppShell>
  );
}
