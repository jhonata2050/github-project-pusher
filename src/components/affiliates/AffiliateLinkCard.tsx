import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Share2, Copy, Check } from "lucide-react";
import type { AffiliateLinkCardProps } from "./types";

export function AffiliateLinkCard({
  referralLink,
  isLoading,
  copied,
  onCopyLink,
}: AffiliateLinkCardProps) {
  const handleWhatsAppShare = () => {
    const text = encodeURIComponent(
      `Conheça os melhores planos de hospedagem e servidores cloud com alta performance: ${referralLink}`
    );
    window.open(`https://api.whatsapp.com/send?text=${text}`, "_blank");
  };

  return (
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
          <Button onClick={onCopyLink} disabled={isLoading} className="gap-2 shrink-0">
            {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
            {copied ? "Copiado!" : "Copiar Link"}
          </Button>
          <Button
            variant="outline"
            onClick={handleWhatsAppShare}
            className="gap-2 shrink-0 border-green-500/30 text-green-600 dark:text-green-400 hover:bg-green-500/10"
          >
            Compartilhar no WhatsApp
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
