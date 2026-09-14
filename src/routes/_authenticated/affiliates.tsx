import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";
import { AppShell } from "@/components/app/AppShell";
import { getMyAffiliateData, transferAffiliateEarningsToWallet } from "@/lib/affiliates.functions";
import { toast } from "sonner";
import {
  AffiliateBanner,
  AffiliateLinkCard,
  AffiliateStatsCards,
  AffiliateReferralsCard,
  AffiliateHowItWorks,
  AffiliateWithdrawModal,
} from "@/components/affiliates";

export const Route = createFileRoute("/_authenticated/affiliates")({
  head: () => ({
    meta: [{ title: "Programa de Afiliados — Indique e Ganhe" }],
  }),
  component: AffiliatesPage,
});

function AffiliatesPage() {
  const queryClient = useQueryClient();
  const [copied, setCopied] = useState(false);
  const [withdrawModalOpen, setWithdrawModalOpen] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState<string>("");

  const { data, isLoading } = useQuery({
    queryKey: ["myAffiliateData"],
    queryFn: () => getMyAffiliateData(),
  });

  const affiliate = data?.affiliate;
  const referrals = data?.referrals || [];

  const origin = typeof window !== "undefined" ? window.location.origin : "http://localhost:8080";
  const referralLink = `${origin}/?aff=${affiliate?.code || ""}`;

  const handleCopyLink = () => {
    if (!affiliate?.code) return;
    navigator.clipboard.writeText(referralLink);
    setCopied(true);
    toast.success("Link de indicação copiado para a área de transferência!");
    setTimeout(() => setCopied(false), 2500);
  };

  const withdrawMutation = useMutation({
    mutationFn: async (amount: number) => {
      return transferAffiliateEarningsToWallet({ data: { amount } });
    },
    onSuccess: (res: any) => {
      toast.success(
        `R$ ${Number(res.transferredAmount).toFixed(2)} transferidos com sucesso para a sua Carteira!`
      );
      setWithdrawModalOpen(false);
      setWithdrawAmount("");
      queryClient.invalidateQueries({ queryKey: ["myAffiliateData"] });
      queryClient.invalidateQueries({ queryKey: ["myWallet"] });
    },
    onError: (err: any) => {
      toast.error(err.message || "Falha ao resgatar comissão.");
    },
  });

  const handleWithdrawSubmit = (e: FormEvent) => {
    e.preventDefault();
    const val = Number(withdrawAmount);
    if (isNaN(val) || val <= 0) {
      toast.error("Informe um valor válido para resgate.");
      return;
    }
    if (val > (affiliate?.available_balance || 0)) {
      toast.error("O valor solicitado é maior do que seu saldo disponível.");
      return;
    }
    withdrawMutation.mutate(val);
  };

  return (
    <AppShell breadcrumbs={[{ label: "Painel", href: "/dashboard" }, { label: "Programa de Afiliados" }]}>
      <div className="space-y-6 max-w-6xl mx-auto pb-12">
        <AffiliateBanner commissionPercent={affiliate?.commission_percent} />

        <AffiliateLinkCard
          referralLink={referralLink}
          isLoading={isLoading}
          copied={copied}
          onCopyLink={handleCopyLink}
        />

        <AffiliateStatsCards
          affiliate={affiliate}
          onOpenWithdrawModal={() => {
            setWithdrawAmount(String(affiliate?.available_balance || ""));
            setWithdrawModalOpen(true);
          }}
        />

        <AffiliateReferralsCard referrals={referrals} />

        <AffiliateHowItWorks />
      </div>

      <AffiliateWithdrawModal
        open={withdrawModalOpen}
        onOpenChange={setWithdrawModalOpen}
        availableBalance={affiliate?.available_balance || 0}
        withdrawAmount={withdrawAmount}
        onWithdrawAmountChange={setWithdrawAmount}
        onSubmit={handleWithdrawSubmit}
        isPending={withdrawMutation.isPending}
      />
    </AppShell>
  );
}

