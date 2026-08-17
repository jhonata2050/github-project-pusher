import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getOSOptions, getLocations } from "@/lib/checkout.functions";

export function StepVPSConfig({ config, setConfig }: any) {
  const osOptions = useQuery({ queryKey: ["os-options"], queryFn: useServerFn(getOSOptions) });
  const locations = useQuery({ queryKey: ["locations"], queryFn: useServerFn(getLocations) });

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold">Configurações do Servidor</h2>
      <div className="space-y-2">
        <Label>Hostname</Label>
        <Input placeholder="vps.exemplo.com" value={config.hostname} onChange={(e) => setConfig({...config, hostname: e.target.value})} className="h-12 rounded-xl" />
      </div>
      <div className="space-y-2">
        <Label>Sistema Operacional</Label>
        <Select value={config.os} onValueChange={(val) => setConfig({...config, os: val})}>
          <SelectTrigger className="h-12 rounded-xl">
            <SelectValue placeholder="Selecione o SO" />
          </SelectTrigger>
          <SelectContent>
            {osOptions.data?.map((os: any) => <SelectItem key={os.id} value={os.id}>{os.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label>Localização</Label>
        <Select value={config.location} onValueChange={(val) => setConfig({...config, location: val})}>
          <SelectTrigger className="h-12 rounded-xl">
            <SelectValue placeholder="Selecione a localização" />
          </SelectTrigger>
          <SelectContent>
            {locations.data?.map((loc: any) => <SelectItem key={loc.id} value={loc.id}>{loc.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
