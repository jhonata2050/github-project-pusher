import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/app/AppShell";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  Wallet, 
  Plus, 
  ArrowUpRight, 
  ArrowDownLeft, 
  Receipt, 
  Sparkles, 
  CheckCircle2, 
  Clock, 
  ShieldCheck, 
  CreditCard,
  QrCode
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { getMyWallet, requestWalletDeposit } from "@/lib/wallet.functions";

export const Route = createFileRoute("/_authenticated/wallet")({
  head: () => ({
    meta: [{ title: "Minha Carteira — Eqsam" }],
  }),
  component: ClientWalletPage,
});

const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

const PRESET_AMOUNTS = [25, 50, 100, 200, 500];

function ClientWalletPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [selectedAmount, setSelectedAmount] = useState<number>(50);
  const [customAmount, setCustomAmount] = useState<string>("");

  const { data: walletData, isLoading } = useQuery({
    queryKey: ["client-my-wallet"],
    queryFn: () => getMyWallet(),
  });

  const depositMutation = useMutation({
    mutationFn: (amount: number) => requestWalletDeposit({ data: { amount } }),
    onSuccess: (res) => {
      toast.success(`Fatura para recarga de ${brl.format(res.amount)} gerada!`);
      navigate({ to: "/invoices/$invoiceId", params: { invoiceId: res.invoiceId } });
    },
    onError: (err: any) => {
      toast.error(`Erro ao gerar recarga: ${err.message}`);
    }
  });

  const handleDeposit = () => {
    const amount = customAmount ? parseFloat(customAmount.replace(",", ".")) : selectedAmount;
    if (isNaN(amount) || amount < 5) {
      toast.error("Informe um valor de recarga de pelo menos R$ 5,00.");
      return;
    }
    depositMutation.mutate(amount);
  };

  const balance = Number(walletData?.balance || 0);

  return (
    <AppShell
      area="client"
      breadcrumb={
        <>
          <span className="flex items-center gap-2 text-foreground font-medium">
            <Wallet className="size-4 text-primary" /> Minha Carteira
          </span>
        </>
      }
    >
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Minha Carteira</h1>
          <p className="text-muted-foreground mt-1">
            Adicione créditos para liquidação automática e renovação de suas hospedagens e domínios.
          </p>
        </div>

        {/* Saldo e Recarga Rápida */}
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Card de Saldo */}
          <Card className="rounded-3xl border-none shadow-md bg-gradient-to-br from-slate-900 via-slate-800 to-slate-950 text-white p-6 sm:p-8 flex flex-col justify-between relative overflow-hidden">
            <div className="absolute right-0 top-0 translate-x-4 -translate-y-4 w-40 h-40 bg-primary/20 rounded-full blur-3xl pointer-events-none" />
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="p-3 bg-white/10 rounded-2xl backdrop-blur-md">
                  <Wallet className="size-6 text-primary" />
                </div>
                <Badge className="bg-emerald-500/20 text-emerald-400 border-none rounded-full px-3 py-0.5 text-xs font-semibold">
                  Saldo Ativo
                </Badge>
              </div>
              <div>
                <p className="text-xs uppercase font-semibold text-slate-400 tracking-wider">Saldo Disponível em Conta</p>
                {isLoading ? (
                  <Skeleton className="h-12 w-40 bg-white/10 rounded-xl mt-2" />
                ) : (
                  <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight mt-1 text-white">
                    {brl.format(balance)}
                  </h2>
                )}
              </div>
            </div>

            <div className="mt-8 pt-4 border-t border-white/10 flex items-center justify-between text-xs text-slate-400">
              <span>Débito automático ativo</span>
              <ShieldCheck className="size-4 text-emerald-400" />
            </div>
          </Card>

          {/* Adicionar Saldo */}
          <Card className="lg:col-span-2 rounded-3xl border-none shadow-sm bg-card p-6 sm:p-8 space-y-6">
            <div>
              <CardTitle className="text-lg flex items-center gap-2 text-foreground">
                <Plus className="size-5 text-primary" /> Adicionar Saldo / Recarregar Carteira
              </CardTitle>
              <CardDescription className="text-xs">
                Selecione um valor para gerar uma fatura instantânea com aprovação imediata via Pix ou Cartão.
              </CardDescription>
            </div>

            <div className="space-y-4">
              {/* Presets */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
                {PRESET_AMOUNTS.map((val) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => {
                      setSelectedAmount(val);
                      setCustomAmount("");
                    }}
                    className={cn(
                      "h-12 rounded-2xl font-bold text-sm transition-all border",
                      !customAmount && selectedAmount === val
                        ? "bg-primary text-primary-foreground border-primary shadow-sm"
                        : "bg-secondary/30 hover:bg-secondary/60 text-foreground border-transparent"
                    )}
                  >
                    {brl.format(val)}
                  </button>
                ))}
              </div>

              {/* Valor Personalizado */}
              <div className="grid gap-2">
                <Label className="text-xs font-semibold">Ou digite outro valor</Label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground font-bold text-sm">
                    R$
                  </span>
                  <Input 
                    placeholder="0,00"
                    value={customAmount}
                    onChange={(e) => setCustomAmount(e.target.value)}
                    className="pl-12 rounded-2xl h-12 text-base font-bold bg-muted/30"
                  />
                </div>
              </div>

              <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-4">
                <p className="text-xs text-muted-foreground">
                  O saldo não expira e pode ser usado para faturas de qualquer serviço ou domínio.
                </p>
                <Button 
                  onClick={handleDeposit}
                  disabled={depositMutation.isPending}
                  className="w-full sm:w-auto h-12 px-8 rounded-2xl font-bold gap-2 bg-primary text-primary-foreground shadow-sm"
                >
                  <QrCode className="size-4" />
                  {depositMutation.isPending ? "Gerando Fatura..." : "Recarregar via Pix / Cartão"}
                </Button>
              </div>
            </div>
          </Card>
        </div>

        {/* Extrato de Transações */}
        <Card className="rounded-3xl border-none shadow-sm bg-card p-6 sm:p-8 space-y-6">
          <div>
            <CardTitle className="text-lg flex items-center gap-2 text-foreground">
              <Receipt className="size-5 text-primary" /> Extrato de Movimentações
            </CardTitle>
            <CardDescription className="text-xs">
              Histórico detalhado de depósitos, pagamentos e créditos na sua conta.
            </CardDescription>
          </div>

          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-16 bg-muted/40 rounded-2xl animate-pulse" />
              ))}
            </div>
          ) : walletData?.transactions && walletData.transactions.length > 0 ? (
            <div className="overflow-x-auto rounded-2xl border border-border">
              <table className="w-full text-left text-sm">
                <thead className="bg-secondary/30 text-xs font-semibold text-muted-foreground uppercase">
                  <tr>
                    <th className="px-5 py-3.5">Data</th>
                    <th className="px-5 py-3.5">Tipo</th>
                    <th className="px-5 py-3.5">Descrição</th>
                    <th className="px-5 py-3.5 text-right">Valor</th>
                    <th className="px-5 py-3.5 text-right">Saldo Resultante</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {walletData.transactions.map((tx: any) => {
                    const isPositive = tx.amount > 0;
                    return (
                      <tr key={tx.id} className="hover:bg-secondary/10">
                        <td className="px-5 py-4 text-xs text-muted-foreground">
                          {new Date(tx.created_at).toLocaleString("pt-BR")}
                        </td>
                        <td className="px-5 py-4">
                          <Badge className={cn(
                            "rounded-full text-[10px] uppercase font-bold",
                            isPositive ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" : "bg-destructive/10 text-destructive border-destructive/20"
                          )}>
                            {tx.type === "deposit" ? "Recarga" : tx.type === "payment" ? "Pagamento" : tx.type}
                          </Badge>
                        </td>
                        <td className="px-5 py-4 text-xs font-medium text-foreground">
                          {tx.description}
                        </td>
                        <td className={cn(
                          "px-5 py-4 text-xs font-extrabold text-right",
                          isPositive ? "text-emerald-600" : "text-destructive"
                        )}>
                          {isPositive ? `+ ${brl.format(tx.amount)}` : `- ${brl.format(Math.abs(tx.amount))}`}
                        </td>
                        <td className="px-5 py-4 text-xs font-semibold text-muted-foreground text-right">
                          {brl.format(tx.balance_after)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 bg-muted/20 rounded-2xl border-2 border-dashed border-muted text-center p-6">
              <Clock className="h-10 w-10 text-muted-foreground mb-3 opacity-30" />
              <p className="text-sm font-medium text-muted-foreground">Nenhuma movimentação registrada na carteira ainda.</p>
            </div>
          )}
        </Card>
      </div>
    </AppShell>
  );
}
