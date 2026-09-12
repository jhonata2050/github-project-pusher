import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getAvailableVPSInstances } from "@/lib/vps-admin.functions";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export interface VPSInstanceSelectorProps {
  serviceId: string;
  currentVpsId?: string;
  onSelect?: (val: string) => void;
}

export function VPSInstanceSelector({ serviceId, currentVpsId, onSelect }: VPSInstanceSelectorProps) {
  const { data: vpsInstances, isLoading } = useQuery({
    queryKey: ["available-vps-instances", serviceId],
    queryFn: () => getAvailableVPSInstances({ data: { serviceId } }),
  });

  const [selectedVal, setSelectedVal] = useState<string>(currentVpsId || "none");

  return (
    <div className="space-y-2">
      <input type="hidden" name="vps_instance_id" value={selectedVal} />
      <Select 
        value={selectedVal} 
        onValueChange={(val) => {
          setSelectedVal(val);
          if (onSelect) onSelect(val);
        }}
      >
        <SelectTrigger className="h-9 rounded-xl border-input bg-background shadow-sm text-xs">
          <SelectValue placeholder={isLoading ? "Carregando..." : "Selecione uma instância..."} />
        </SelectTrigger>
        <SelectContent className="rounded-xl border-border/40 shadow-xl">
          <SelectItem value="none">Nenhuma vinculada</SelectItem>
          {vpsInstances?.map((vps: any) => (
            <SelectItem key={vps.id} value={vps.id}>
              {vps.name || "VPS"} — IP: {vps.ip_address || "Pendente"} (ID: {vps.external_id})
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
