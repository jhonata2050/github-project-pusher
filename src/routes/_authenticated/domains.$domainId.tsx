import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/app/AppShell";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Globe } from "lucide-react";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { 
  getDomainDetails, 
  updateDomainNameservers, 
  toggleDomainLock, 
  getDomainAuthCode, 
  toggleDomainAutoRenew 
} from "@/lib/domains.functions";
import {
  DomainHeader,
  DomainNameserversCard,
  DomainAuthCodeCard,
  DomainSecurityCard,
  type DomainDetails,
} from "@/components/domains";

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
        <DomainHeader domain={domain as DomainDetails} />

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Coluna 1 & 2: Nameservers e Configurações de DNS */}
          <div className="lg:col-span-2 space-y-6">
            <DomainNameserversCard
              ns1={ns1}
              ns2={ns2}
              ns3={ns3}
              ns4={ns4}
              setNs1={setNs1}
              setNs2={setNs2}
              setNs3={setNs3}
              setNs4={setNs4}
              onSubmit={(e) => {
                e.preventDefault();
                const nsList = [ns1, ns2, ns3, ns4].filter(Boolean);
                updateNsMutation.mutate(nsList);
              }}
              isSaving={updateNsMutation.isPending}
            />

            <DomainAuthCodeCard
              authCode={authCode}
              copiedEpp={copiedEpp}
              onFetchAuthCode={fetchAuthCode}
              onCopyAuthCode={handleCopyAuthCode}
            />
          </div>

          {/* Coluna 3: Status, Trava de Segurança e Auto-renovação */}
          <DomainSecurityCard
            domain={domain as DomainDetails}
            isLockPending={toggleLockMutation.isPending}
            isAutoRenewPending={autoRenewMutation.isPending}
            onToggleLock={(checked) => toggleLockMutation.mutate(checked)}
            onToggleAutoRenew={(checked) => autoRenewMutation.mutate(checked)}
          />
        </div>
      </div>
    </AppShell>
  );
}
