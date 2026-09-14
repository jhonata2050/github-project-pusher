import { Receipt, Clock, Sparkles, Check, Globe, Server, CreditCard, CheckCircle2, QrCode } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { getCycleDetails, type PricingDetails, type VPSConfigState } from "./types";

export interface CheckoutSummarySidebarProps {
  product: any;
  productType: string;
  billingCycle: string;
  currentPrice: any;
  pricingDetails: PricingDetails;
  domain?: string;
  vpsConfig?: VPSConfigState;
  paymentMethod: string;
  isPaymentStep: boolean;
  walletBalance: number;
  isNextDisabled: boolean;
  isProcessingPix: boolean;
  pixResult: any;
  onPay: () => void;
  brl: Intl.NumberFormat;
}

export function CheckoutSummarySidebar({
  product,
  productType,
  billingCycle,
  currentPrice,
  pricingDetails,
  domain,
  vpsConfig,
  paymentMethod,
  isPaymentStep,
  walletBalance,
  isNextDisabled,
  isProcessingPix,
  pixResult,
  onPay,
  brl,
}: CheckoutSummarySidebarProps) {
  const cycleInfo = getCycleDetails(billingCycle || currentPrice?.cycle);
  const isPaaS =
    productType === "apps" ||
    product?.name?.includes("PaaS") ||
    product?.name?.includes("MB") ||
    product?.name?.includes("GB") ||
    product?.name?.includes("Bot");

  return (
    <div className="rounded-2xl border bg-sidebar/70 p-4 sticky top-4 space-y-3 shadow-xs">
      <div className="flex items-center justify-between border-b border-sidebar-border pb-2">
        <div className="flex items-center gap-2">
          <Receipt className="size-4 text-primary" />
          <h2 className="text-sm font-bold text-foreground">Resumo do Pedido</h2>
        </div>
        <Badge
          variant="secondary"
          className="text-[10px] font-bold uppercase tracking-wider bg-primary/10 text-primary border-primary/20 py-0.5 px-2"
        >
          {isPaaS ? "Containers (PaaS)" : productType === "vps" ? "Cloud VPS" : "DirectAdmin"}
        </Badge>
      </div>

      {/* Item Selecionado e Ciclo Compacto */}
      <div className="p-2.5 rounded-xl bg-card border border-border/70 space-y-1 shadow-2xs">
        <div className="flex justify-between items-start gap-2">
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="font-extrabold text-xs sm:text-sm text-foreground truncate">
                {product?.name}
              </span>
              <Badge
                variant="outline"
                className="text-[10px] font-bold border-primary/30 text-primary bg-primary/5 py-0 px-1.5 h-4.5"
              >
                {cycleInfo.badge}
              </Badge>
              {pricingDetails.hasDiscount && (
                <span className="text-[10px] font-bold text-lime-600 dark:text-lime-400 bg-lime-500/10 border border-lime-500/20 px-1.5 py-0.5 rounded-md">
                  -{pricingDetails.savingsPercent}% OFF
                </span>
              )}
            </div>
            <span className="text-[11px] text-muted-foreground flex items-center gap-1 mt-0.5">
              <Clock className="size-3 text-primary shrink-0" />
              <span className="truncate">{cycleInfo.period}</span>
            </span>
          </div>
          <div className="text-right shrink-0">
            {pricingDetails.hasDiscount && (
              <span className="text-[11px] text-muted-foreground line-through block font-semibold leading-none mb-0.5">
                {brl.format(pricingDetails.originalPrice)}
              </span>
            )}
            <span className="font-extrabold text-sm sm:text-base text-foreground block leading-tight">
              {brl.format(pricingDetails.actualPrice)}
            </span>
          </div>
        </div>
      </div>

      {/* Especificações do Plano */}
      <div className="p-2.5 rounded-xl bg-muted/20 border border-border/50 space-y-1.5">
        <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
          <Sparkles className="size-3 text-primary" />
          <span>Incluso no plano:</span>
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-2 gap-y-1 text-[11px] text-muted-foreground">
          {isPaaS && (
            <>
              <div className="flex items-center gap-1.5">
                <Check className="size-3 text-primary shrink-0" />
                <span className="truncate">Cluster Docker Swarm HA</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Check className="size-3 text-primary shrink-0" />
                <span className="truncate">Bots WhatsApp & APIs</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Check className="size-3 text-primary shrink-0" />
                <span className="truncate">Deploy Git e SSL Grátis</span>
              </div>
            </>
          )}
          {productType === "hosting" && (
            <>
              <div className="flex items-center gap-1.5">
                <Check className="size-3 text-primary shrink-0" />
                <span className="truncate">Painel DirectAdmin PT-BR</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Check className="size-3 text-primary shrink-0" />
                <span className="truncate">
                  {product?.disk_quota_mb ? `${Math.round(product.disk_quota_mb / 1024)} GB NVMe` : "Disco NVMe"}
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <Check className="size-3 text-primary shrink-0" />
                <span className="truncate">PHP 8.x, MySQL & E-mails</span>
              </div>
            </>
          )}
          {productType === "vps" && (
            <>
              <div className="flex items-center gap-1.5">
                <Check className="size-3 text-primary shrink-0" />
                <span className="truncate">Root SSH Total</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Check className="size-3 text-primary shrink-0" />
                <span className="truncate">IPv4 Dedicado Próprio</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Check className="size-3 text-primary shrink-0" />
                <span className="truncate">Proteção Anti-DDoS 24/7</span>
              </div>
            </>
          )}
          {domain && (
            <div className="col-span-full flex items-center gap-1.5 pt-1 border-t border-border/40 font-mono text-[11px] text-foreground truncate">
              <Globe className="size-3 text-primary shrink-0" />
              <span className="truncate">{domain}</span>
            </div>
          )}
          {productType === "vps" && vpsConfig?.hostname && (
            <div className="col-span-full flex items-center gap-1.5 pt-1 border-t border-border/40 font-mono text-[11px] text-foreground truncate">
              <Server className="size-3 text-primary shrink-0" />
              <span className="truncate">{vpsConfig.hostname} ({vpsConfig.os || "Linux"})</span>
            </div>
          )}
        </div>
      </div>

      {/* Forma de Pagamento Selecionada */}
      {isPaymentStep && (
        <div className="flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-card border border-border/70 text-xs shadow-2xs">
          <span className="text-muted-foreground flex items-center gap-1 text-[11px]">
            <CreditCard className="size-3 text-primary" /> Meio de Pagamento:
          </span>
          <span className="font-bold text-[11px] text-foreground">
            {paymentMethod === "pix"
              ? "PIX Instantâneo"
              : paymentMethod === "wallet"
              ? "Saldo da Carteira"
              : paymentMethod === "credit_card"
              ? "Cartão de Crédito"
              : "Boleto Bancário"}
          </span>
        </div>
      )}

      {/* Discriminativo Financeiro Compacto */}
      <div className="space-y-1 border-t border-sidebar-border pt-2 text-xs">
        <div className="flex justify-between text-muted-foreground text-[11px]">
          <span>Subtotal do plano:</span>
          <span className="font-medium text-foreground">
            {pricingDetails.hasDiscount ? (
              <span className="space-x-1.5">
                <span className="line-through text-muted-foreground/70">{brl.format(pricingDetails.originalPrice)}</span>
                <span>{brl.format(pricingDetails.actualPrice)}</span>
              </span>
            ) : (
              brl.format(pricingDetails.actualPrice)
            )}
          </span>
        </div>
        {pricingDetails.hasDiscount && (
          <div className="flex justify-between text-lime-600 dark:text-lime-400 text-[11px] font-medium">
            <span>Desconto do ciclo ({pricingDetails.savingsPercent}% OFF):</span>
            <span className="font-bold">-{brl.format(pricingDetails.savingsAmount)}</span>
          </div>
        )}
        <div className="flex justify-between text-muted-foreground text-[11px]">
          <span>Taxa de instalação (Setup):</span>
          <span className="font-semibold text-lime-600 dark:text-lime-400">Grátis</span>
        </div>
        <div className="flex justify-between items-end pt-1 border-t border-sidebar-border">
          <div>
            <span className="font-bold text-xs text-foreground leading-none block">Total hoje:</span>
            <span className="text-[10px] text-muted-foreground">Ativação imediata</span>
          </div>
          <div className="text-right">
            {pricingDetails.hasDiscount && (
              <span className="text-xs text-muted-foreground line-through block font-semibold leading-none mb-1">
                {brl.format(pricingDetails.originalPrice)}
              </span>
            )}
            <span className="text-xl font-black text-primary leading-none block">
              {brl.format(pricingDetails.actualPrice)}
            </span>
          </div>
        </div>
      </div>

      {/* Detalhes do Saldo e Botão de Pagar */}
      {isPaymentStep && (
        <div className="pt-2 border-t border-sidebar-border space-y-2">
          {paymentMethod === "wallet" && (
            <div className="space-y-1 p-2 border rounded-xl bg-primary/5 border-primary/20 text-[11px]">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Saldo Disponível:</span>
                <span className="font-bold text-foreground">{brl.format(walletBalance)}</span>
              </div>
              <div className="flex justify-between pt-0.5 border-t border-primary/20">
                <span className="text-muted-foreground">Saldo Restante:</span>
                <span
                  className={cn(
                    "font-bold",
                    walletBalance >= Number(currentPrice?.price ?? 0)
                      ? "text-lime-600 dark:text-lime-400"
                      : "text-destructive"
                  )}
                >
                  {brl.format(walletBalance - Number(currentPrice?.price ?? 0))}
                </span>
              </div>
            </div>
          )}

          {!pixResult && (
            <Button
              type="button"
              onClick={onPay}
              disabled={isNextDisabled || isProcessingPix}
              className={cn(
                "w-full h-10 rounded-xl text-xs font-bold shadow-md gap-2 cursor-pointer transition-all",
                paymentMethod === "wallet"
                  ? "bg-primary text-primary-foreground hover:bg-primary/90"
                  : ""
              )}
            >
              {isProcessingPix ? (
                <span className="flex items-center gap-2">
                  <span className="animate-spin size-3.5 border-2 border-background border-t-transparent rounded-full" />
                  {paymentMethod === "wallet" ? "Liquidando..." : "Processando..."}
                </span>
              ) : paymentMethod === "wallet" ? (
                <>
                  <CheckCircle2 className="size-3.5" /> Confirmar e Pagar com Saldo
                </>
              ) : paymentMethod === "pix" ? (
                <>
                  <QrCode className="size-3.5" /> Gerar PIX e Pagar
                </>
              ) : (
                <>
                  <CreditCard className="size-3.5" /> Pagar Agora
                </>
              )}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
