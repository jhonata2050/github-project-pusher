import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function AffiliateHowItWorks() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4">
      <Card className="bg-muted/30 border-none shadow-none">
        <CardHeader className="pb-2">
          <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-lg mb-2">
            1
          </div>
          <CardTitle className="text-base">1. Compartilhe seu Link</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Envie seu link personalizado para quem precisa de hospedagem, servidores VPS ou domínios.
        </CardContent>
      </Card>

      <Card className="bg-muted/30 border-none shadow-none">
        <CardHeader className="pb-2">
          <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-lg mb-2">
            2
          </div>
          <CardTitle className="text-base">2. Seu Amigo Assina</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Assim que o cliente conclui o pagamento do plano, nosso sistema credita automaticamente sua comissão.
        </CardContent>
      </Card>

      <Card className="bg-muted/30 border-none shadow-none">
        <CardHeader className="pb-2">
          <div className="w-10 h-10 rounded-full bg-emerald-500/10 text-emerald-600 flex items-center justify-center font-bold text-lg mb-2">
            3
          </div>
          <CardTitle className="text-base">3. Resgate para a Carteira</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Transfira seus ganhos com 1 clique para a sua Carteira e use para pagar suas próprias faturas e renovações!
        </CardContent>
      </Card>
    </div>
  );
}
