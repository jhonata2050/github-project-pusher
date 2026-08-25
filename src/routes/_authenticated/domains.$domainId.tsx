import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/app/AppShell";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  Globe, 
  ArrowLeft, 
  Server, 
  Lock, 
  Unlock, 
  Key, 
  Clock, 
  ShieldCheck, 
  Save, 
  Copy, 
  Check, 
  RotateCw,
  Zap,
  Info
} from "lucide-react";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { 
  getDomainDetails, 
  updateDomainNameservers, 
  toggleDomainLock, 
  getDomainAuthCode, 
  toggleDomainAutoRenew 
} from "@/lib/domains.functions";

export const Route = createFileRoute("/_authenticated/domains/$domainId")({
  head: () => ({
    meta: [{ title: "Gerenciar Domínio — Eqsam" }],
  }),
  component: DomainDetailsPage,
});

function DomainDetailsPage() {
  const { domainId } = Route.useParams();
  const queryClient = useQueryClient();

  const [ns1, setNs1] = useState("");
  const [ns2, setNs2] = useState("");
  const [ns3, setNs3] = useState("");
  const [ns4, setNs4] = useState("");
  const [authCode, setAuthCode] = useState<string | null>(null);
  const [copiedEpp, setCopiedEpp] = useState(false);

  const { data: domain, isLoading, error } = useQuery({
    queryKey: ["domain-details", domainId],
    queryFn: () => getDomainDetails({ data: { domainId } }),
  });

  useEffect(() => {
    if (domain?.nameservers && domain.nameservers.length > 0) {
      setNs1(domain.nameservers[0] || "");
      setNs2(domain.nameservers[1] || "");
      setNs3(domain.nameservers[2] || "");
      setNs4(domain.nameservers[3] || "");
    } else {
      setNs1("ns1.eqsam.com");
      setNs2("ns2.eqsam.com");
    }
  }, [domain]);

  const updateNsMutation = useMutation({
    mutationFn: (nameservers: string[]) => 
      updateDomainNameservers({ data: { domainId, nameservers } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["domain-details", domainId] });
      toast.success("Servidores DNS (Nameservers) atualizados com sucesso!");
    },
    onError: (err: any) => {
      toast.error(`Erro ao atualizar DNS: ${err.message}`);
    }
  });

  const toggleLockMutation = useMutation({
    mutationFn: (isLocked: boolean) => 
      toggleDomainLock({ data: { domainId, isLocked } }),
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ["domain-details", domainId] });
      toast.success(vars ? "Trava de transferência ativada!" : "Trava de transferência desativada!");
    },
    onError: (err: any) => {
      toast.error(`Erro ao alterar trava: ${err.message}`);
    }
  });

  const autoRenewMutation = useMutation({
    mutationFn: (autoRenew: boolean) => 
      toggleDomainAutoRenew({ data: { domainId, autoRenew } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["domain-details", domainId] });
      toast.success("Configuração de auto-renovação atualizada!");
    },
    onError: (err: any) => {
      toast.error(`Erro: ${err.message}`);
    }
  });

  const fetchAuthCode = async () => {
    try {
      const res = await getDomainAuthCode({ data: { domainId } });
      setAuthCode(res.authCode);
      toast.success("Código EPP gerado!");
    } catch (e: any) {
      toast.error("Erro ao obter código EPP: " + e.message);
    }
  };

  const handleCopyAuthCode = () => {
    if (authCode) {
      navigator.clipboard.writeText(authCode);
      setCopiedEpp(true);
      toast.success("Código EPP copiado para a área de transferência!");
      setTimeout(() => setCopiedEpp(false), 2000);
    }
  };

  if (isLoading) {
    return (
      <AppShell area="client" breadcrumb={<span>Carregando domínio...</span>}>
        <div className="space-y-6">
          <Skeleton className="h-40 w-full rounded-3xl" />
          <Skeleton className="h-64 w-full rounded-3xl" />
        </div>
      </AppShell>
    );
  }

  if (error || !domain) {
    return (
      <AppShell area="client" breadcrumb={<span>Domínio não encontrado</span>}>
        <div className="py-20 text-center">
          <h2 className="text-xl font-bold text-destructive">Domínio não encontrado</h2>
          <Button asChild variant="link" className="mt-4">
            <Link to="/domains">Voltar para meus domínios</Link>
          </Button>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell
      area="client"
      breadcrumb={
        <>
          <Link to="/domains" className="flex items-center gap-1.5 hover:text-foreground">
            <Globe className="size-4 text-primary" /> Meus Domínios
          </Link>
          <span>/</span>
          <span className="font-semibold text-foreground">{domain.domain_name}</span>
        </>
      }
    >
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" asChild className="rounded-xl">
              <Link to="/domains">
                <ArrowLeft className="size-5" />
              </Link>
            </Button>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground flex items-center gap-3">
                {domain.domain_name}
                <Badge className={cn(
                  "rounded-full text-[10px] uppercase font-bold px-3 py-0.5",
                  domain.status === "active" 
                    ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" 
                    : "bg-warning/10 text-warning"
                )}>
                  {domain.status === "active" ? "Ativo" : domain.status}
                </Badge>
              </h1>
              <p className="text-xs text-muted-foreground mt-1">
                Registrado em: {new Date(domain.registration_date || domain.created_at).toLocaleDateString("pt-BR")} • Expiração: {domain.expiry_date ? new Date(domain.expiry_date).toLocaleDateString("pt-BR") : "---"}
              </p>
            </div>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Coluna 1 & 2: Nameservers e Configurações de DNS */}
          <div className="lg:col-span-2 space-y-6">
            <Card className="rounded-3xl border-none shadow-sm bg-card p-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                <div>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Server className="size-5 text-primary" /> Servidores DNS (Nameservers)
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Altere os servidores DNS para apontar seu domínio para sua hospedagem ou serviços como Cloudflare.
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => {
                      setNs1("ns1.eqsam.com");
                      setNs2("ns2.eqsam.com");
                      setNs3("");
                      setNs4("");
                    }}
                    className="rounded-xl text-xs"
                  >
                    Usar DNS Eqsam
                  </Button>
                </div>
              </div>

              <form onSubmit={(e) => {
                e.preventDefault();
                const nsList = [ns1, ns2, ns3, ns4].filter(Boolean);
                updateNsMutation.mutate(nsList);
              }} className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Nameserver 1 (Primário) *</Label>
                    <Input 
                      placeholder="ns1.seuservidor.com" 
                      value={ns1} 
                      onChange={(e) => setNs1(e.target.value)}
                      className="rounded-xl font-mono text-xs"
                      required
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Nameserver 2 (Secundário) *</Label>
                    <Input 
                      placeholder="ns2.seuservidor.com" 
                      value={ns2} 
                      onChange={(e) => setNs2(e.target.value)}
                      className="rounded-xl font-mono text-xs"
                      required
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Nameserver 3 (Opcional)</Label>
                    <Input 
                      placeholder="ns3.seuservidor.com" 
                      value={ns3} 
                      onChange={(e) => setNs3(e.target.value)}
                      className="rounded-xl font-mono text-xs"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Nameserver 4 (Opcional)</Label>
                    <Input 
                      placeholder="ns4.seuservidor.com" 
                      value={ns4} 
                      onChange={(e) => setNs4(e.target.value)}
                      className="rounded-xl font-mono text-xs"
                    />
                  </div>
                </div>

                <div className="p-3 bg-secondary/30 rounded-2xl flex items-center gap-2.5 text-xs text-muted-foreground">
                  <Info className="size-4 text-primary shrink-0" />
                  <span>A propagação de novos Nameservers na internet costuma levar entre 2 e 24 horas.</span>
                </div>

                <div className="pt-2 flex justify-end">
                  <Button 
                    type="submit" 
                    disabled={updateNsMutation.isPending}
                    className="rounded-xl gap-2 bg-primary text-primary-foreground"
                  >
                    <Save className="size-4" /> 
                    {updateNsMutation.isPending ? "Salvando DNS..." : "Salvar Nameservers"}
                  </Button>
                </div>
              </form>
            </Card>

            {/* Código EPP / Auth-Info */}
            <Card className="rounded-3xl border-none shadow-sm bg-card p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Key className="size-5 text-amber-500" /> Código de Transferência (EPP / Auth-Code)
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Necessário caso você queira transferir este domínio para outro registrador no futuro.
                  </CardDescription>
                </div>
              </div>

              {authCode ? (
                <div className="flex items-center gap-3 p-3 bg-secondary/50 rounded-2xl border border-border">
                  <span className="font-mono text-sm font-bold text-foreground flex-1 break-all">
                    {authCode}
                  </span>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={handleCopyAuthCode}
                    className="rounded-xl gap-1.5 text-xs shrink-0"
                  >
                    {copiedEpp ? <Check className="size-3.5 text-emerald-600" /> : <Copy className="size-3.5" />}
                    {copiedEpp ? "Copiado!" : "Copiar"}
                  </Button>
                </div>
              ) : (
                <Button 
                  variant="outline" 
                  onClick={fetchAuthCode}
                  className="rounded-xl gap-2 text-xs"
                >
                  <Key className="size-3.5 text-amber-500" /> Revelar Código EPP
                </Button>
              )}
            </Card>
          </div>

          {/* Coluna 3: Status, Trava de Segurança e Auto-renovação */}
          <div className="space-y-6">
            {/* Trava de Transferência (Lock) */}
            <Card className="rounded-3xl border-none shadow-sm bg-card p-6 space-y-4">
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Lock className="size-5 text-emerald-600" />
                    <h3 className="font-bold text-base text-foreground">Trava de Transferência</h3>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Protege o domínio contra transferências não autorizadas (Transfer Lock).
                  </p>
                </div>
                <Switch 
                  checked={domain.is_locked ?? true}
                  onCheckedChange={(checked) => toggleLockMutation.mutate(checked)}
                  disabled={toggleLockMutation.isPending}
                />
              </div>
            </Card>

            {/* Renovação Automática */}
            <Card className="rounded-3xl border-none shadow-sm bg-card p-6 space-y-4">
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <RotateCw className="size-5 text-primary" />
                    <h3 className="font-bold text-base text-foreground">Auto-Renovação</h3>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Gera a fatura de renovação automaticamente 30 dias antes do vencimento.
                  </p>
                </div>
                <Switch 
                  checked={domain.auto_renew ?? true}
                  onCheckedChange={(checked) => autoRenewMutation.mutate(checked)}
                  disabled={autoRenewMutation.isPending}
                />
              </div>
            </Card>

            {/* Informações da Assinatura */}
            <Card className="rounded-3xl border-none shadow-sm bg-card p-6 space-y-3">
              <h3 className="font-bold text-xs uppercase text-muted-foreground tracking-wider">
                Resumo do Registro
              </h3>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between py-1.5 border-b border-border/50">
                  <span className="text-muted-foreground">Registrador:</span>
                  <span className="font-semibold uppercase text-foreground">{domain.registrar || "Openprovider"}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-border/50">
                  <span className="text-muted-foreground">Data de Registro:</span>
                  <span className="font-semibold text-foreground">
                    {new Date(domain.registration_date || domain.created_at).toLocaleDateString("pt-BR")}
                  </span>
                </div>
                <div className="flex justify-between py-1.5">
                  <span className="text-muted-foreground">Próxima Renovação:</span>
                  <span className="font-semibold text-primary">
                    {domain.expiry_date ? new Date(domain.expiry_date).toLocaleDateString("pt-BR") : "---"}
                  </span>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
