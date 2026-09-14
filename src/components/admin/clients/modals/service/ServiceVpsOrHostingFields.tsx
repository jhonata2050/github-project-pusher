import { Monitor } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { VPSInstanceSelector } from "../../VPSInstanceSelector";

interface ServiceVpsOrHostingFieldsProps {
  editingService: any;
  servers?: any[] | undefined;
}

export function ServiceVpsOrHostingFields({ editingService, servers }: ServiceVpsOrHostingFieldsProps) {
  const isVps = editingService.products?.product_type === "vps" || editingService.billing_cycle === "vps";

  if (isVps) {
    const vps = Array.isArray(editingService.vps_instances)
      ? editingService.vps_instances[0]
      : editingService.vps_instances;
    const hasVps = Array.isArray(editingService.vps_instances)
      ? editingService.vps_instances.length > 0
      : Boolean(editingService.vps_instances);

    return (
      <>
        <div className="grid gap-2 sm:col-span-2">
          <Label htmlFor="vps_instance_id" className="text-xs font-bold text-brand">
            Vincular Instância VPS
          </Label>
          <VPSInstanceSelector
            serviceId={editingService.id}
            currentVpsId={vps?.id}
          />
        </div>

        {hasVps && (
          <div className="sm:col-span-2 p-3 rounded-2xl bg-brand/5 border border-brand/10 space-y-2">
            <h4 className="text-[10px] font-bold text-brand uppercase tracking-wider flex items-center gap-1">
              <Monitor className="size-3" /> Detalhes da VPS Vinculada: {vps.name || "VPS"}
            </h4>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-[9px] text-muted-foreground">IP Principal</p>
                <p className="text-xs font-mono font-bold text-brand">{vps.ip_address || "Aguardando..."}</p>
              </div>
              <div>
                <p className="text-[9px] text-muted-foreground">External ID</p>
                <p className="text-xs font-mono">{vps.external_id || "N/A"}</p>
              </div>
              <div>
                <p className="text-[9px] text-muted-foreground">Status</p>
                <Badge
                  variant="outline"
                  className="text-[9px] uppercase h-4 px-1 border-emerald-500/30 text-emerald-600 bg-emerald-500/10"
                >
                  {vps.status || "Ativo"}
                </Badge>
              </div>
              <div>
                <p className="text-[9px] text-muted-foreground">Região / SO</p>
                <p className="text-[10px] font-medium">
                  {vps.region || "US"} · {vps.os_template || "Linux"}
                </p>
              </div>
            </div>
          </div>
        )}
      </>
    );
  }

  return (
    <>
      <div className="grid gap-2">
        <Label htmlFor="username" className="text-xs">Usuário do Servidor (SSO)</Label>
        <Input
          id="username"
          name="username"
          defaultValue={editingService.username || ""}
          placeholder="Ex: abacap123"
          className="rounded-xl h-9 text-xs"
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="da_password" className="text-xs">Senha do Servidor (SSO)</Label>
        <Input
          id="da_password"
          name="da_password"
          defaultValue={editingService.password || ""}
          placeholder="Deixe vazio para manter a atual"
          className="rounded-xl h-9 text-xs"
          type="password"
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="server_id" className="text-xs">Servidor Vinculado</Label>
        <Select name="server_id" defaultValue={editingService.server_id || ""}>
          <SelectTrigger id="server_id" className="h-9 rounded-xl border-input bg-background shadow-sm text-xs">
            <SelectValue placeholder="Nenhum" />
          </SelectTrigger>
          <SelectContent className="rounded-xl border-border/40 shadow-xl">
            <SelectItem value="none">Nenhum</SelectItem>
            {servers?.map((sv) => (
              <SelectItem key={sv.id} value={sv.id}>{sv.hostname}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </>
  );
}
