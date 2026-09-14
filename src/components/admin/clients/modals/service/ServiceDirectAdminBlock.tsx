import { ShieldAlert } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

interface ServiceDirectAdminBlockProps {
  editingService: any;
  setEditingService: (service: any) => void;
}

export function ServiceDirectAdminBlock({
  editingService,
  setEditingService,
}: ServiceDirectAdminBlockProps) {
  const isVps = editingService.products?.product_type === "vps" || editingService.billing_cycle === "vps";

  if (isVps) return null;

  return (
    <div className="col-span-full border-t pt-4">
      <div className="flex items-center justify-between p-4 rounded-2xl bg-destructive/5 border border-destructive/10 mb-4">
        <div className="space-y-0.5">
          <Label
            htmlFor="block_directadmin_service"
            className="text-base font-semibold text-destructive flex items-center gap-2"
          >
            <ShieldAlert className="size-4" /> Bloquear Acesso
          </Label>
          <p className="text-xs text-muted-foreground">
            Impede o acesso ao painel deste serviço específico.
          </p>
        </div>
        <Switch
          id="block_directadmin_service"
          checked={editingService.block_directadmin || false}
          onCheckedChange={(checked) => {
            setEditingService({ ...editingService, block_directadmin: checked });
            const el = document.getElementById("block_directadmin_service_hidden") as HTMLInputElement;
            if (el) el.value = checked ? "true" : "false";
          }}
        />
        <input
          type="hidden"
          id="block_directadmin_service_hidden"
          name="block_directadmin_service"
          value={editingService.block_directadmin ? "true" : "false"}
        />
      </div>
    </div>
  );
}
