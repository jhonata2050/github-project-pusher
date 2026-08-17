import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Info } from "lucide-react";

export function StepPayment({ paymentMethod, setPaymentMethod, onPay, cpfCnpj, setCpfCnpj }: any) {
  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold">Pagamento</h2>
      <RadioGroup value={paymentMethod} onValueChange={setPaymentMethod} className="grid gap-4">
        <div className="flex items-center space-x-3 border p-4 rounded-xl cursor-pointer">
          <RadioGroupItem value="pix" id="pix" />
          <Label htmlFor="pix" className="flex-1 cursor-pointer">PIX (Aprovação imediata)</Label>
        </div>
        <div className="flex items-center space-x-3 border p-4 rounded-xl cursor-pointer">
          <RadioGroupItem value="credit_card" id="cc" />
          <Label htmlFor="cc" className="flex-1 cursor-pointer">Cartão de Crédito</Label>
        </div>
        <div className="flex items-center space-x-3 border p-4 rounded-xl cursor-pointer">
          <RadioGroupItem value="bank_transfer" id="bt" />
          <Label htmlFor="bt" className="flex-1 cursor-pointer">Boleto Bancário</Label>
        </div>
      </RadioGroup>

      {paymentMethod === "pix" && (
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
        </div>
      )}

      <Button 
        onClick={onPay} 
        disabled={paymentMethod === "pix" && !cpfCnpj}
        className="w-full h-12 rounded-xl text-lg font-bold"
      >
        Pagar Agora
      </Button>
    </div>
  );
}
