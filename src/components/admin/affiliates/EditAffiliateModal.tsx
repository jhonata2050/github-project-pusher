import { Percent } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { AffiliateAccount } from "@/lib/affiliates/types";

interface EditAffiliateModalProps {
  editingAffiliate: AffiliateAccount | null;
  onClose: () => void;
  editPercent: string;
  setEditPercent: (val: string) => void;
  editIsActive: boolean;
  setEditIsActive: (val: boolean) => void;
  onSave: () => void;
  isSaving: boolean;
}

export function EditAffiliateModal({
  editingAffiliate,
  onClose,
  editPercent,
  setEditPercent,
  editIsActive,
  setEditIsActive,
  onSave,
  isSaving,
}: EditAffiliateModalProps) {
  return (
    <Dialog open={Boolean(editingAffiliate)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Editar Comissão do Afiliado</DialogTitle>
          <DialogDescription>
            Personalize a porcentagem base de ganho para o cliente{" "}
            <strong>{editingAffiliate?.profiles?.full_name || editingAffiliate?.code}</strong>.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>Porcentagem de Comissão (%)</Label>
            <div className="relative">
              <Input
                type="number"
                min="0"
                max="100"
                step="0.5"
                value={editPercent}
                onChange={(e) => setEditPercent(e.target.value)}
              />
              <Percent className="w-4 h-4 absolute right-3 top-2.5 text-muted-foreground" />
            </div>
          </div>

          <div className="flex items-center justify-between p-3 border rounded-lg">
            <div>
              <div className="text-sm font-medium">Status da Conta de Afiliado</div>
              <div className="text-xs text-muted-foreground">
                Permitir que este cliente continue acumulando comissões
              </div>
            </div>
            <Switch checked={editIsActive} onCheckedChange={setEditIsActive} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            onClick={onSave}
            disabled={isSaving}
            className="gap-2"
          >
            {isSaving ? "Salvando..." : "Salvar Alterações"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
