import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { 
  Users, 
  DollarSign, 
  Share2, 
  Copy, 
  Check, 
  TrendingUp, 
  MousePointerClick, 
  ArrowRightLeft, 
  Wallet,
  Sparkles,
  Gift,
  ShieldCheck,
  CheckCircle2
} from "lucide-react";
import { AppShell } from "@/components/app/AppShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getMyAffiliateData, transferAffiliateEarningsToWallet } from "@/lib/affiliates.functions";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

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
      toast.success(`R$ ${Number(res.transferredAmount).toFixed(2)} transferidos com sucesso para a sua Carteira!`);
      setWithdrawModalOpen(false);
      setWithdrawAmount("");
      queryClient.invalidateQueries({ queryKey: ["myAffiliateData"] });
      queryClient.invalidateQueries({ queryKey: ["myWallet"] });
    },
    onError: (err: any) => {
      toast.error(err.message || "Falha ao resgatar comissão.");
    },
  });

  const handleWithdrawSubmit = (e: React.FormEvent) => {
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
        {/* Banner de Boas-Vindas */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-primary/95 via-primary to-indigo-900 text-white p-6 sm:p-8 shadow-xl">
          <div className="relative z-10 max-w-2xl space-y-3">
            <Badge variant="outline" className="text-white border-white/30 bg-white/10 backdrop-blur-sm px-3 py-1 font-medium">
              <Sparkles className="w-3.5 h-3.5 mr-1 text-amber-300" />
              Ganhe {affiliate?.commission_percent || 10}% de Comissão Recorrente
            </Badge>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
              Programa de Afiliados: Indique e Ganhe
            </h1>
            <p className="text-white/80 text-sm sm:text-base leading-relaxed">
              Compartilhe seu link exclusivo com amigos, clientes e parceiros. A cada fatura paga por alguém que você indicou, você ganha <strong>{affiliate?.commission_percent || 10}% de comissão</strong> direto no seu saldo!
            </p>
          </div>
          <div className="absolute right-0 top-0 bottom-0 opacity-10 pointer-events-none flex items-center pr-8">
            <Gift className="w-64 h-64 text-white" />
          </div>
        </div>

        {/* Link de Indicação & Ações Rápidas */}
        <Card className="border-primary/20 shadow-md">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Share2 className="w-5 h-5 text-primary" />
              Seu Link de Indicação Exclusivo
            </CardTitle>
            <CardDescription>
              Envie este link para qualquer pessoa. Nós cuidamos do rastreamento e crédito automático da comissão.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="relative flex-1">
                <Input
                  readOnly
                  value={isLoading ? "Carregando seu link..." : referralLink}
                  className="font-mono text-sm bg-muted/50 pr-10 selection:bg-primary selection:text-white"
                />
              </div>
              <Button onClick={handleCopyLink} disabled={isLoading} className="gap-2 shrink-0">
                {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
                {copied ? "Copiado!" : "Copiar Link"}
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  const text = encodeURIComponent(`Conheça os melhores planos de hospedagem e servidores cloud com alta performance: ${referralLink}`);
                  window.open(`https://api.whatsapp.com/send?text=${text}`, "_blank");
                }}
                className="gap-2 shrink-0 border-green-500/30 text-green-600 dark:text-green-400 hover:bg-green-500/10"
              >
                Compartilhar no WhatsApp
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Grid de Estatísticas */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="shadow-sm">
            <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
              <span className="text-sm font-medium text-muted-foreground">Cliques no Link</span>
              <MousePointerClick className="w-4 h-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{affiliate?.total_clicks || 0}</div>
              <p className="text-xs text-muted-foreground mt-1">Total de acessos rastreados</p>
            </CardContent>
          </Card>

          <Card className="shadow-sm">
            <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
              <span className="text-sm font-medium text-muted-foreground">Vendas Confirmadas</span>
              <TrendingUp className="w-4 h-4 text-purple-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{affiliate?.total_sales || 0}</div>
              <p className="text-xs text-muted-foreground mt-1">Assinaturas geradas</p>
            </CardContent>
          </Card>

          <Card className="shadow-sm border-emerald-500/30 bg-emerald-500/5">
            <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
              <span className="text-sm font-medium text-emerald-800 dark:text-emerald-300">Saldo Disponível</span>
              <Wallet className="w-4 h-4 text-emerald-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                R$ {(affiliate?.available_balance || 0).toFixed(2)}
              </div>
              <Button
                size="sm"
                variant="outline"
                disabled={(affiliate?.available_balance || 0) <= 0}
                onClick={() => {
                  setWithdrawAmount(String(affiliate?.available_balance || ""));
                  setWithdrawModalOpen(true);
                }}
                className="mt-3 w-full h-8 text-xs font-semibold gap-1.5 border-emerald-500/40 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/10"
              >
                <ArrowRightLeft className="w-3.5 h-3.5" />
                Resgatar para Carteira
              </Button>
            </CardContent>
          </Card>

          <Card className="shadow-sm">
            <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
              <span className="text-sm font-medium text-muted-foreground">Total Resgatado</span>
              <DollarSign className="w-4 h-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-muted-foreground">
                R$ {(affiliate?.paid_earnings || 0).toFixed(2)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">Comissões já utilizadas</p>
            </CardContent>
          </Card>
        </div>

        {/* Tabela de Indicações */}
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Users className="w-5 h-5 text-primary" />
              Histórico de Indicações e Comissões
            </CardTitle>
            <CardDescription>
              Acompanhe em tempo real todas as assinaturas e valores gerados pelo seu link de indicação.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {referrals.length === 0 ? (
              <div className="text-center py-12 space-y-3">
                <Gift className="w-12 h-12 text-muted-foreground/40 mx-auto" />
                <p className="text-base font-semibold text-muted-foreground">Nenhuma indicação registrada ainda</p>
                <p className="text-sm text-muted-foreground/80 max-w-md mx-auto">
                  Compartilhe seu link de afiliado acima nas suas redes sociais, sites ou com amigos para começar a receber comissões!
                </p>
              </div>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data</TableHead>
                      <TableHead>Cliente Indicado</TableHead>
                      <TableHead>Valor da Venda</TableHead>
                      <TableHead>Sua Comissão</TableHead>
                      <TableHead className="text-right">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {referrals.map((r: any) => (
                      <TableRow key={r.id}>
                        <TableCell className="text-xs text-muted-foreground">
                          {format(new Date(r.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                        </TableCell>
                        <TableCell className="font-medium text-sm">
                          {r.profiles?.full_name || "Cliente Indicado"}
                        </TableCell>
                        <TableCell className="text-sm">
                          R$ {Number(r.sale_amount).toFixed(2)}
                        </TableCell>
                        <TableCell className="font-semibold text-sm text-emerald-600 dark:text-emerald-400">
                          + R$ {Number(r.commission_amount).toFixed(2)}
                        </TableCell>
                        <TableCell className="text-right">
                          <Badge variant={r.status === "approved" || r.status === "paid" ? "default" : "secondary"}>
                            {r.status === "approved" ? "Disponível" : (r.status === "paid" ? "Resgatado" : "Pendente")}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Como Funciona */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4">
          <Card className="bg-muted/30 border-none shadow-none">
            <CardHeader className="pb-2">
              <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-lg mb-2">1</div>
              <CardTitle className="text-base">1. Compartilhe seu Link</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              Envie seu link personalizado para quem precisa de hospedagem, servidores VPS ou domínios.
            </CardContent>
          </Card>

          <Card className="bg-muted/30 border-none shadow-none">
            <CardHeader className="pb-2">
              <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-lg mb-2">2</div>
              <CardTitle className="text-base">2. Seu Amigo Assina</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              Assim que o cliente conclui o pagamento do plano, nosso sistema credita automaticamente sua comissão.
            </CardContent>
          </Card>

          <Card className="bg-muted/30 border-none shadow-none">
            <CardHeader className="pb-2">
              <div className="w-10 h-10 rounded-full bg-emerald-500/10 text-emerald-600 flex items-center justify-center font-bold text-lg mb-2">3</div>
              <CardTitle className="text-base">3. Resgate para a Carteira</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              Transfira seus ganhos com 1 clique para a sua Carteira e use para pagar suas próprias faturas e renovações!
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Modal de Resgate de Comissão para a Carteira */}
      <Dialog open={withdrawModalOpen} onOpenChange={setWithdrawModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Wallet className="w-5 h-5 text-emerald-600" />
              Resgatar Comissão para a Carteira
            </DialogTitle>
            <DialogDescription>
              O saldo resgatado será transferido instantaneamente para a sua Carteira de Saldo do painel e poderá ser usado para pagar ou renovar seus serviços.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleWithdrawSubmit} className="space-y-4 py-2">
            <div className="p-3 bg-muted/50 rounded-lg flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Saldo disponível para resgate:</span>
              <span className="font-bold text-emerald-600 dark:text-emerald-400">
                R$ {(affiliate?.available_balance || 0).toFixed(2)}
              </span>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Valor do Resgate (R$):</label>
              <Input
                type="number"
                step="0.01"
                min="1"
                max={affiliate?.available_balance || 0}
                required
                value={withdrawAmount}
                onChange={(e) => setWithdrawAmount(e.target.value)}
                placeholder="Ex: 50.00"
              />
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="ghost" onClick={() => setWithdrawModalOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={withdrawMutation.isPending} className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2">
                {withdrawMutation.isPending ? "Processando..." : "Confirmar Transferência"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
