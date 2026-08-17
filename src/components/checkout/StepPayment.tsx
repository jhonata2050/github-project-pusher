import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";

export function StepPayment({ paymentMethod, setPaymentMethod, onPay }: any) {
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
      <Button onClick={onPay} className="w-full h-12 rounded-xl text-lg font-bold">Pagar Agora</Button>
    </div>
  );
}
