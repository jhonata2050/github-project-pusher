import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Info, Check, Copy, QrCode, Wallet, CheckCircle2, AlertCircle, CreditCard, Banknote } from "lucide-react";
import { toast } from "sonner";
import { useEffect } from "react";
import { cn } from "@/lib/utils";

const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

export function StepPayment({ 
  paymentMethod, 
  setPaymentMethod, 
  onPay, 
  cpfCnpj, 
  setCpfCnpj,
  pixResult,
  isProcessingPix,
  hasStartedAutoPix,
  walletBalance = 0,
  totalAmount = 0
}: any) {
  
  // Efeito para gerar Pix automaticamente se CPF estiver preenchido e Pix selecionado
  useEffect(() => {
    let timer: any;
    if (paymentMethod === "pix" && cpfCnpj?.length >= 11 && !pixResult && !isProcessingPix && !hasStartedAutoPix) {
      timer = setTimeout(() => {
        onPay();
      }, 1000);
    }
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [paymentMethod, cpfCnpj, pixResult, isProcessingPix, onPay, hasStartedAutoPix]);

  const handleCopy = () => {
    if (pixResult?.pixCode) {
      navigator.clipboard.writeText(pixResult.pixCode);
      toast.success("Código PIX copiado!");
    }
  };

  const hasEnoughBalance = walletBalance >= totalAmount && totalAmount > 0;

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold">Forma de Pagamento</h2>
      
      {!pixResult ? (
        <RadioGroup value={paymentMethod} onValueChange={setPaymentMethod} className="grid gap-3">
          
          {/* Opção 1: Saldo em Conta / Carteira */}
          <div 
            className={cn(
              "flex items-start space-x-3 border p-4 rounded-2xl cursor-pointer transition-all",
              paymentMethod === "wallet" 
                ? "border-primary bg-primary/5 ring-2 ring-primary/20 shadow-xs" 
                : "hover:border-primary/40",
              !hasEnoughBalance && "opacity-75 bg-muted/20"
            )}
            onClick={() => {
              if (hasEnoughBalance) setPaymentMethod("wallet");
            }}
          >
            <RadioGroupItem 
              value="wallet" 
              id="wallet" 
              disabled={!hasEnoughBalance}
              className="mt-1" 
            />
            <div className="flex-1 space-y-1">
              <div className="flex items-center justify-between">
                <Label htmlFor="wallet" className={cn("cursor-pointer font-bold flex items-center gap-2 text-sm", !hasEnoughBalance && "cursor-not-allowed")}>
                  <Wallet className="size-4 text-primary" /> Saldo da Conta (Carteira)
                </Label>
                <Badge variant={hasEnoughBalance ? "default" : "outline"} className="text-xs font-mono font-bold">
                  {brl.format(walletBalance)}
                </Badge>
              </div>
              
              {hasEnoughBalance ? (
                <p className="text-xs text-lime-600 dark:text-lime-400 font-medium flex items-center gap-1">
                  <CheckCircle2 className="size-3.5" /> Saldo suficiente para ativação imediata sem taxas.
                </p>
              ) : (
                <p className="text-xs text-muted-foreground flex items-center gap-1.5 mt-0.5">
                  <AlertCircle className="size-3.5 text-amber-500 shrink-0" />
                  <span>
                    Saldo insuficiente ({brl.format(walletBalance)} de {brl.format(totalAmount)}).{" "}
                    <a href="/wallet" target="_blank" rel="noreferrer" className="underline font-bold text-primary">
                      Adicionar saldo
                    </a>
                  </span>
                </p>
              )}
            </div>
          </div>

          {/* Opção 2: PIX */}
          <div 
            className={cn(
              "flex items-center space-x-3 border p-4 rounded-2xl cursor-pointer transition-all",
              paymentMethod === "pix" ? "border-primary bg-primary/5 ring-2 ring-primary/20 shadow-xs" : "hover:border-primary/40"
            )}
            onClick={() => setPaymentMethod("pix")}
          >
            <RadioGroupItem value="pix" id="pix" />
            <div className="flex-1 flex items-center justify-between">
              <Label htmlFor="pix" className="cursor-pointer font-bold flex items-center gap-2 text-sm">
                <QrCode className="size-4 text-primary" /> PIX (Aprovação Imediata)
              </Label>
              <Badge variant="secondary" className="text-[10px] bg-primary/10 text-primary font-bold">
                Automático
              </Badge>
            </div>
          </div>

          {/* Opção 3: Cartão de Crédito */}
          <div 
            className={cn(
              "flex items-center space-x-3 border p-4 rounded-2xl cursor-pointer transition-all",
              paymentMethod === "credit_card" ? "border-primary bg-primary/5 ring-2 ring-primary/20 shadow-xs" : "hover:border-primary/40"
            )}
            onClick={() => setPaymentMethod("credit_card")}
          >
            <RadioGroupItem value="credit_card" id="cc" />
            <div className="flex-1 flex items-center justify-between">
              <Label htmlFor="cc" className="cursor-pointer font-bold flex items-center gap-2 text-sm">
                <CreditCard className="size-4 text-muted-foreground" /> Cartão de Crédito
              </Label>
              <span className="text-xs text-muted-foreground">Checkout Transparente</span>
            </div>
          </div>

          {/* Opção 4: Boleto Bancário */}
          <div 
            className={cn(
              "flex items-center space-x-3 border p-4 rounded-2xl cursor-pointer transition-all",
              paymentMethod === "boleto" ? "border-primary bg-primary/5 ring-2 ring-primary/20 shadow-xs" : "hover:border-primary/40"
            )}
            onClick={() => setPaymentMethod("boleto")}
          >
            <RadioGroupItem value="boleto" id="bt" />
            <div className="flex-1 flex items-center justify-between">
              <Label htmlFor="boleto" className="cursor-pointer font-bold flex items-center gap-2 text-sm">
                <Banknote className="size-4 text-muted-foreground" /> Boleto Bancário
              </Label>
              <span className="text-xs text-muted-foreground">Compensação em até 1 dia útil</span>
            </div>
          </div>
        </RadioGroup>
      ) : (
        <div className="rounded-3xl border border-primary/20 bg-primary/5 p-6 animate-in fade-in zoom-in duration-300">
          <div className="flex flex-col items-center text-center space-y-4">
            <div className="size-12 rounded-full bg-primary/20 flex items-center justify-center text-primary">
              <QrCode className="size-6" />
            </div>
            <div>
              <h3 className="font-bold text-lg">QR Code PIX Gerado</h3>
              <p className="text-sm text-muted-foreground">Escaneie o QR Code abaixo pelo app do seu banco</p>
            </div>

            {pixResult.qrCodeUrl && (
              <div className="bg-white p-3 rounded-2xl border border-border shadow-sm">
                <img src={pixResult.qrCodeUrl} alt="QR Code PIX" className="size-48" />
              </div>
            )}

            <div className="w-full space-y-2">
              <p className="text-[10px] uppercase font-bold text-muted-foreground">Código Copia e Cola</p>
              <div className="relative group">
                <div className="w-full bg-background border rounded-xl p-3 pr-12 text-[10px] font-mono break-all line-clamp-2 text-left">
                  {pixResult.pixCode}
                </div>
                <Button 
                  size="icon" 
                  variant="ghost" 
                  className="absolute right-1 top-1/2 -translate-y-1/2 hover:bg-primary/10 hover:text-primary"
                  onClick={handleCopy}
                >
                  <Copy className="size-4" />
                </Button>
              </div>
            </div>

            <Button asChild variant="outline" className="w-full rounded-2xl mt-2 font-semibold">
              <a href="/invoices">Ver minhas faturas</a>
            </Button>
          </div>
        </div>
      )}

      {paymentMethod === "pix" && !pixResult && (
        <div className="space-y-3 p-4 border rounded-2xl bg-muted/30">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Info className="size-4 text-primary" />
            <span>Dados para Pagamento</span>
          </div>
          <p className="text-xs text-muted-foreground">O Documento (ID) é obrigatório para emissão da cobrança.</p>
          <div className="space-y-1">
            <Label htmlFor="cpf" className="text-xs">Documento de Identificação (CPF, CNPJ, Tax ID...)</Label>
            <Input
              id="cpf"
              placeholder="Digite o número do documento"
              value={cpfCnpj}
              onChange={(e) => setCpfCnpj(e.target.value)}
              className="h-10 rounded-xl"
            />
          </div>
          {cpfCnpj?.length >= 11 && (
            <p className="text-[10px] text-primary animate-pulse font-semibold">Gerando seu Pix automaticamente...</p>
          )}
        </div>
      )}

      {paymentMethod === "wallet" && (
        <div className="space-y-4 p-5 border rounded-2xl bg-primary/5 border-primary/20">
          <div className="flex items-center gap-2 text-sm font-bold text-foreground">
            <Wallet className="size-5 text-primary" />
            <span>Pagamento Instantâneo com Saldo</span>
          </div>
          <div className="space-y-1 text-xs text-muted-foreground">
            <div className="flex justify-between py-1 border-b">
              <span>Total da Contratação:</span>
              <span className="font-bold text-foreground">{brl.format(totalAmount)}</span>
            </div>
            <div className="flex justify-between py-1 border-b">
              <span>Seu Saldo Atual:</span>
              <span className="font-bold text-foreground">{brl.format(walletBalance)}</span>
            </div>
            <div className="flex justify-between py-1">
              <span>Saldo Restante após compra:</span>
              <span className="font-bold text-lime-600 dark:text-lime-400">
                {brl.format(walletBalance - totalAmount)}
              </span>
            </div>
          </div>

          <Button 
            onClick={onPay} 
            disabled={isProcessingPix || !hasEnoughBalance}
            className="w-full h-12 rounded-2xl text-base font-bold shadow-md gap-2"
          >
            {isProcessingPix ? (
              <span className="flex items-center gap-2">
                <span className="animate-spin size-4 border-2 border-background border-t-transparent rounded-full" />
                Liquidando com Saldo...
              </span>
            ) : (
              <>
                <CheckCircle2 className="size-5" /> Confirmar e Pagar com Saldo
              </>
            )}
          </Button>
        </div>
      )}

      {paymentMethod !== "pix" && paymentMethod !== "wallet" && (
        <Button 
          onClick={onPay} 
          disabled={isProcessingPix}
          className="w-full h-12 rounded-2xl text-base font-bold shadow-md"
        >
          {isProcessingPix ? (
            <span className="flex items-center gap-2">
              <span className="animate-spin size-4 border-2 border-background border-t-transparent rounded-full" />
              Processando...
            </span>
          ) : "Pagar Agora"}
        </Button>
      )}
    </div>
  );
}
