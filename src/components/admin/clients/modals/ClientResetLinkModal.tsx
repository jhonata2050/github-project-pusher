import { CheckCircle2, Check, Copy } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface ClientResetLinkModalProps {
  result: { link: string; emailSent: boolean } | null;
  onClose: () => void;
  clientEmail?: string | null;
}

export function ClientResetLinkModal({
  result,
  onClose,
  clientEmail,
}: ClientResetLinkModalProps) {
  return (
    <Dialog open={!!result} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="rounded-3xl max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle2 className="size-5 text-emerald-500" /> Link de Recuperação Gerado
          </DialogTitle>
          <DialogDescription>
            Copie o link abaixo para enviar ao cliente através do WhatsApp ou canal de suporte.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {result?.emailSent && (
            <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-700 dark:text-emerald-300 flex items-center gap-2">
              <Check className="size-4 shrink-0 text-emerald-600" />
              <span>E-mail com o link de recuperação enviado para <strong>{clientEmail}</strong>.</span>
            </div>
          )}

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Link Seguro de Redefinição</Label>
            <div className="flex gap-2">
              <Input 
                readOnly
                value={result?.link || ""}
                className="rounded-xl font-mono text-xs bg-muted/30"
              />
              <Button 
                type="button"
                onClick={() => {
                  if (result?.link) {
                    navigator.clipboard.writeText(result.link);
                    toast.success("Link copiado para a área de transferência!");
                  }
                }}
                className="rounded-xl gap-1.5 bg-brand text-brand-foreground hover:bg-brand/90 shrink-0"
              >
                <Copy className="size-4" /> Copiar
              </Button>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button 
            type="button" 
            onClick={onClose}
            className="rounded-xl w-full"
          >
            Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
