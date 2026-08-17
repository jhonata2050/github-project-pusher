import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Info, Check, Copy, QrCode } from "lucide-react";
import { toast } from "sonner";
import { useEffect } from "react";
import { cn } from "@/lib/utils";

export function StepPayment({ 
  paymentMethod, 
  setPaymentMethod, 
  onPay, 
  cpfCnpj, 
  setCpfCnpj,
  pixResult,
  isProcessingPix
}: any) {
  
  // Efeito para gerar Pix automaticamente se CPF estiver preenchido e Pix selecionado
  useEffect(() => {
    if (paymentMethod === "pix" && cpfCnpj?.length >= 11 && !pixResult && !isProcessingPix) {
      const timer = setTimeout(() => {
        onPay();
      }, 1000);
      return () => {
        clearTimeout(timer);
      };
    }
  }, [paymentMethod, cpfCnpj, pixResult, isProcessingPix, onPay]);

  const handleCopy = () => {
    if (pixResult?.pixCode) {
      navigator.clipboard.writeText(pixResult.pixCode);
      toast.success("Código PIX copiado!");
    }
  };

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold">Pagamento</h2>
      
      {!pixResult ? (
        <RadioGroup value={paymentMethod} onValueChange={setPaymentMethod} className="grid gap-4">
          <div className={cn(
            "flex items-center space-x-3 border p-4 rounded-xl cursor-pointer transition-colors",
            paymentMethod === "pix" ? "border-brand bg-brand/5" : ""
          )}>
            <RadioGroupItem value="pix" id="pix" />
            <Label htmlFor="pix" className="flex-1 cursor-pointer font-medium">PIX (Aprovação imediata)</Label>
          </div>
          <div className={cn(
            "flex items-center space-x-3 border p-4 rounded-xl cursor-pointer transition-colors",
            paymentMethod === "credit_card" ? "border-brand bg-brand/5" : ""
          )}>
            <RadioGroupItem value="credit_card" id="cc" />
            <Label htmlFor="cc" className="flex-1 cursor-pointer font-medium">Cartão de Crédito</Label>
          </div>
          <div className={cn(
            "flex items-center space-x-3 border p-4 rounded-xl cursor-pointer transition-colors",
            paymentMethod === "bank_transfer" ? "border-brand bg-brand/5" : ""
          )}>
            <RadioGroupItem value="bank_transfer" id="bt" />
            <Label htmlFor="bt" className="flex-1 cursor-pointer font-medium">Boleto Bancário</Label>
          </div>
        </RadioGroup>
      ) : (
        <div className="rounded-2xl border border-brand/20 bg-brand/5 p-6 animate-in fade-in zoom-in duration-300">
          <div className="flex flex-col items-center text-center space-y-4">
            <div className="size-12 rounded-full bg-brand/20 flex items-center justify-center text-brand">
              <QrCode className="size-6" />
            </div>
            <div>
              <h3 className="font-bold text-lg">Pagamento Gerado</h3>
              <p className="text-sm text-muted-foreground">Escaneie o QR Code abaixo para pagar</p>
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
                  className="absolute right-1 top-1/2 -translate-y-1/2 hover:bg-brand/10 hover:text-brand"
                  onClick={handleCopy}
                >
                  <Copy className="size-4" />
                </Button>
              </div>
            </div>

            <Button asChild variant="outline" className="w-full rounded-xl mt-2">
              <a href="/invoices">Ver minhas faturas</a>
            </Button>
          </div>
        </div>
      )}

      {paymentMethod === "pix" && !pixResult && (
        <div className="space-y-3 p-4 border rounded-xl bg-muted/30">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Info className="size-4 text-brand" />
            <span>Dados para PIX</span>
          </div>
          <p className="text-xs text-muted-foreground">O CPF/CNPJ é obrigatório para emissão do QR Code PIX.</p>
          <div className="space-y-1">
            <Label htmlFor="cpf" className="text-xs">CPF ou CNPJ</Label>
            <Input
              id="cpf"
              placeholder="000.000.000-00"
              value={cpfCnpj}
              onChange={(e) => setCpfCnpj(e.target.value)}
              className="h-10 rounded-lg"
            />
          </div>
          {cpfCnpj?.length >= 11 && (
            <p className="text-[10px] text-brand animate-pulse">Gerando seu Pix automaticamente...</p>
          )}
        </div>
      )}

      {paymentMethod !== "pix" && (
        <Button 
          onClick={onPay} 
          disabled={isProcessingPix}
          className="w-full h-12 rounded-xl text-lg font-bold"
        >
          {isProcessingPix ? "Gerando..." : "Pagar Agora"}
        </Button>
      )}
    </div>
  );
}
