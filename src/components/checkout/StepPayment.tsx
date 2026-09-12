import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Info, Check, Copy, QrCode, Wallet, CheckCircle2, AlertCircle, CreditCard, Banknote } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

function maskTaxId(val?: string) {
  if (!val) return "";
  const clean = val.replace(/\D/g, "");
  if (clean.length === 11) {
    return `${clean.slice(0, 3)}.***.***-${clean.slice(9)}`;
  }
  if (clean.length === 14) {
    return `${clean.slice(0, 2)}.***.***/****-${clean.slice(12)}`;
  }
  return val.length > 4 ? `${val.slice(0, 2)}***${val.slice(-2)}` : val;
}

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
  totalAmount = 0,
  profile,
}: any) {
  const handleCopy = () => {
    if (pixResult?.pixCode) {
      navigator.clipboard.writeText(pixResult.pixCode);
      toast.success("Código PIX copiado!");
    }
  };

  const hasEnoughBalance = walletBalance >= totalAmount && totalAmount > 0;
  
  const registeredTaxId = profile?.tax_id?.trim() || "";
  const hasRegisteredTaxId = Boolean(
    registeredTaxId && (registeredTaxId.replace(/\D/g, "").length >= 11 || registeredTaxId.length >= 8)
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between pb-1 border-b border-border/50">
        <div>
          <h2 className="text-base font-bold text-foreground">Forma de Pagamento</h2>
          <p className="text-[11px] text-muted-foreground">
            Escolha o método desejado para liberação do seu serviço
          </p>
        </div>
        <Badge variant="outline" className="text-[10px] font-semibold text-muted-foreground hidden sm:flex">
          Ambiente Seguro 256-bit
        </Badge>
      </div>
      
      {!pixResult ? (
        <RadioGroup value={paymentMethod} onValueChange={setPaymentMethod} className="grid sm:grid-cols-2 gap-2.5">
          
          {/* Opção 1: Saldo em Conta / Carteira */}
          <div 
            role="button"
            tabIndex={0}
            className={cn(
              "flex items-start space-x-2.5 border p-3 rounded-xl cursor-pointer transition-all select-none",
              paymentMethod === "wallet" 
                ? "border-primary bg-primary/5 ring-1 ring-primary/30 shadow-2xs" 
                : "hover:border-primary/40 border-border/70",
              !hasEnoughBalance && "opacity-70 bg-muted/10 cursor-not-allowed"
            )}
            onClick={() => {
              if (hasEnoughBalance) setPaymentMethod("wallet");
            }}
            onKeyDown={(e) => {
              if (hasEnoughBalance && (e.key === "Enter" || e.key === " ")) setPaymentMethod("wallet");
            }}
          >
            <RadioGroupItem 
              value="wallet" 
              id="wallet" 
              disabled={!hasEnoughBalance}
              className="mt-0.5" 
            />
            <div className="flex-1 min-w-0 space-y-0.5">
              <div className="flex items-center justify-between gap-1">
                <span className={cn("font-bold flex items-center gap-1.5 text-xs truncate", !hasEnoughBalance && "text-muted-foreground")}>
                  <Wallet className="size-3.5 text-primary shrink-0" /> Saldo da Carteira
                </span>
                <Badge variant={hasEnoughBalance ? "default" : "outline"} className="text-[10px] font-mono font-bold py-0 px-1.5 h-4.5">
                  {brl.format(walletBalance)}
                </Badge>
              </div>
              
              {hasEnoughBalance ? (
                <p className="text-[10px] text-lime-600 dark:text-lime-400 font-medium flex items-center gap-1 truncate">
                  <CheckCircle2 className="size-3 shrink-0" /> Ativação imediata sem taxas
                </p>
              ) : (
                <p className="text-[10px] text-muted-foreground truncate">
                  Saldo insuficiente ({brl.format(walletBalance)})
                </p>
              )}
            </div>
          </div>

          {/* Opção 2: PIX */}
          <div 
            role="button"
            tabIndex={0}
            className={cn(
              "flex items-center space-x-2.5 border p-3 rounded-xl cursor-pointer transition-all select-none",
              paymentMethod === "pix" 
                ? "border-primary bg-primary/5 ring-1 ring-primary/30 shadow-2xs" 
                : "hover:border-primary/40 border-border/70"
            )}
            onClick={() => setPaymentMethod("pix")}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") setPaymentMethod("pix");
            }}
          >
            <RadioGroupItem value="pix" id="pix" />
            <div className="flex-1 flex items-center justify-between gap-1">
              <span className="font-bold flex items-center gap-1.5 text-xs">
                <QrCode className="size-3.5 text-primary shrink-0" /> PIX Instantâneo
              </span>
              <Badge variant="secondary" className="text-[10px] bg-primary/10 text-primary font-bold py-0 px-1.5 h-4.5">
                Automático
              </Badge>
            </div>
          </div>

          {/* Opção 3: Cartão de Crédito */}
          <div 
            role="button"
            tabIndex={0}
            className={cn(
              "flex items-center space-x-2.5 border p-3 rounded-xl cursor-pointer transition-all select-none",
              paymentMethod === "credit_card" 
                ? "border-primary bg-primary/5 ring-1 ring-primary/30 shadow-2xs" 
                : "hover:border-primary/40 border-border/70"
            )}
            onClick={() => setPaymentMethod("credit_card")}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") setPaymentMethod("credit_card");
            }}
          >
            <RadioGroupItem value="credit_card" id="cc" />
            <div className="flex-1 flex items-center justify-between gap-1">
              <span className="font-bold flex items-center gap-1.5 text-xs">
                <CreditCard className="size-3.5 text-muted-foreground shrink-0" /> Cartão de Crédito
              </span>
              <span className="text-[10px] text-muted-foreground">Transparente</span>
            </div>
          </div>

          {/* Opção 4: Boleto Bancário */}
          <div 
            role="button"
            tabIndex={0}
            className={cn(
              "flex items-center space-x-2.5 border p-3 rounded-xl cursor-pointer transition-all select-none",
              paymentMethod === "boleto" 
                ? "border-primary bg-primary/5 ring-1 ring-primary/30 shadow-2xs" 
                : "hover:border-primary/40 border-border/70"
            )}
            onClick={() => setPaymentMethod("boleto")}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") setPaymentMethod("boleto");
            }}
          >
            <RadioGroupItem value="boleto" id="bt" />
            <div className="flex-1 flex items-center justify-between gap-1">
              <span className="font-bold flex items-center gap-1.5 text-xs">
                <Banknote className="size-3.5 text-muted-foreground shrink-0" /> Boleto Bancário
              </span>
              <span className="text-[10px] text-muted-foreground">Até 1 dia útil</span>
            </div>
          </div>

          {/* SE PIX SELECIONADO: DETALHES LOGO ABAIXO DO GRID */}
          {paymentMethod === "pix" && (
            hasRegisteredTaxId ? (
              <div className="col-span-full flex items-center justify-between p-2.5 rounded-xl border border-primary/25 bg-primary/5 text-xs animate-in fade-in slide-in-from-top-1 duration-200">
                <div className="flex items-center gap-2">
                  <div className="size-6 rounded-lg bg-primary/15 text-primary flex items-center justify-center border border-primary/25 shrink-0">
                    <CheckCircle2 className="size-3.5" />
                  </div>
                  <div>
                    <span className="font-bold text-foreground text-xs">Documento vinculado: </span>
                    <span className="font-mono text-muted-foreground text-xs">{maskTaxId(registeredTaxId || cpfCnpj)}</span>
                  </div>
                </div>
                <Badge variant="outline" className="text-[10px] border-primary/30 text-primary font-bold bg-background py-0 px-1.5 h-5">
                  Pronto para PIX
                </Badge>
              </div>
            ) : (
              <div className="col-span-full p-3 rounded-xl border-2 border-primary/40 bg-card shadow-sm space-y-2 ring-1 ring-primary/10 animate-in fade-in slide-in-from-top-1 duration-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-foreground">
                    <Info className="size-3.5 text-primary shrink-0" />
                    <span>Informe seu CPF/CNPJ para emissão do PIX</span>
                  </div>
                  <Badge variant="secondary" className="text-[9px] font-bold bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/20 py-0 px-1.5">
                    Obrigatório
                  </Badge>
                </div>
                <div className="flex gap-2 items-center">
                  <Input
                    id="cpf"
                    placeholder="Digite seu CPF ou CNPJ"
                    value={cpfCnpj}
                    onChange={(e) => setCpfCnpj(e.target.value)}
                    className="h-9 rounded-lg bg-background border-border/80 focus-visible:ring-primary font-mono text-xs shadow-xs"
                    autoFocus
                  />
                  {cpfCnpj && cpfCnpj.replace(/\D/g, "").length >= 11 && (
                    <div className="flex items-center text-lime-600 dark:text-lime-400 text-[11px] font-bold px-2 shrink-0">
                      <CheckCircle2 className="size-3.5 mr-1" /> Válido
                    </div>
                  )}
                </div>
              </div>
            )
          )}
        </RadioGroup>
      ) : (
        <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4 sm:p-5 animate-in fade-in zoom-in duration-300">
          <div className="flex flex-col items-center text-center space-y-3">
            <div className="size-10 rounded-full bg-primary/20 flex items-center justify-center text-primary">
              <QrCode className="size-5" />
            </div>
            <div>
              <h3 className="font-bold text-base">QR Code PIX Gerado</h3>
              <p className="text-xs text-muted-foreground">Escaneie o QR Code abaixo pelo app do seu banco</p>
            </div>

            {pixResult.qrCodeUrl && (
              <div className="bg-white p-2.5 rounded-xl border border-border shadow-sm">
                <img src={pixResult.qrCodeUrl} alt="QR Code PIX" className="size-40" />
              </div>
            )}

            <div className="w-full space-y-1.5">
              <p className="text-[10px] uppercase font-bold text-muted-foreground">Código Copia e Cola</p>
              <div className="relative group">
                <div className="w-full bg-background border rounded-xl p-2.5 pr-10 text-[10px] font-mono break-all line-clamp-2 text-left">
                  {pixResult.pixCode}
                </div>
                <Button 
                  size="icon" 
                  variant="ghost" 
                  className="absolute right-1 top-1/2 -translate-y-1/2 hover:bg-primary/10 hover:text-primary size-7"
                  onClick={handleCopy}
                >
                  <Copy className="size-3.5" />
                </Button>
              </div>
            </div>

            <Button asChild variant="outline" className="w-full rounded-xl mt-1 h-9 text-xs font-semibold">
              <a href="/invoices">Ver minhas faturas</a>
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
