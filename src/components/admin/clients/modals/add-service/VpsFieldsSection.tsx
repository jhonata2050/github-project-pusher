import { Monitor } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { VpsFieldsSectionProps } from "./types";

export function VpsFieldsSection({
  availableVpsInstances,
  newVpsInstanceId,
  setNewVpsInstanceId,
  newVpsHostname,
  setNewVpsHostname,
  newVpsIpAddress,
  setNewVpsIpAddress,
  newVpsExternalId,
  setNewVpsExternalId,
  newVpsOsTemplate,
  setNewVpsOsTemplate,
  newVpsRegion,
  setNewVpsRegion,
  newVpsSshUser,
  setNewVpsSshUser,
  newVpsSshPort,
  setNewVpsSshPort,
  newVpsSshPassword,
  setNewVpsSshPassword,
}: VpsFieldsSectionProps) {
  return (
    <div className="space-y-4 p-4 rounded-2xl bg-muted/30 border">
      <div className="flex items-center gap-2 text-xs font-semibold text-brand">
        <Monitor className="size-4" /> Configurações do Servidor VPS
      </div>

      {/* Opção de Vincular Instância Contabo Existente */}
      {availableVpsInstances && availableVpsInstances.length > 0 && (
        <div className="space-y-1.5 p-3 rounded-xl bg-brand/5 border border-brand/20">
          <Label className="text-xs font-semibold text-brand">Vincular Instância Sincronizada da Contabo (Opcional)</Label>
          <Select
            value={newVpsInstanceId}
            onValueChange={(instId) => {
              setNewVpsInstanceId(instId);
              if (instId && instId !== 'manual') {
                const match = availableVpsInstances.find((i: any) => i.id === instId);
                if (match) {
                  setNewVpsHostname(match.ip_address ? `vps-${match.ip_address.replace(/\./g, '-')}` : `vps-${match.external_id}`);
                  setNewVpsIpAddress(match.ip_address || '');
                  setNewVpsExternalId(match.external_id || '');
                  if (match.region) setNewVpsRegion(match.region);
                  if (match.os_template) setNewVpsOsTemplate(match.os_template);
                }
              }
            }}
          >
            <SelectTrigger className="rounded-xl h-10 bg-background">
              <SelectValue placeholder="Selecione um servidor Contabo não vinculado..." />
            </SelectTrigger>
            <SelectContent className="rounded-xl">
              <SelectItem value="manual">Configurar Manualmente</SelectItem>
              {availableVpsInstances.map((inst: any) => (
                <SelectItem key={inst.id} value={inst.id}>
                  {inst.ip_address ? `VPS ${inst.ip_address}` : 'Instância VPS'} (ID: {inst.external_id})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Hostname / Nome */}
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold">Hostname / Nome da VPS *</Label>
          <Input
            placeholder="ex: vps-streambr.eqsam.com"
            value={newVpsHostname}
            onChange={(e) => setNewVpsHostname(e.target.value)}
            className="rounded-xl h-10"
            required
          />
        </div>

        {/* IP */}
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold">Endereço IP</Label>
          <Input
            placeholder="ex: 154.53.35.8"
            value={newVpsIpAddress}
            onChange={(e) => setNewVpsIpAddress(e.target.value)}
            className="rounded-xl h-10 font-mono text-xs"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* External ID */}
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold">External ID (Contabo)</Label>
          <Input
            placeholder="ex: 203016028"
            value={newVpsExternalId}
            onChange={(e) => setNewVpsExternalId(e.target.value)}
            className="rounded-xl h-10 font-mono text-xs"
          />
        </div>

        {/* SO Template */}
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold">Sistema Operacional</Label>
          <Select value={newVpsOsTemplate} onValueChange={setNewVpsOsTemplate}>
            <SelectTrigger className="rounded-xl h-10 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="rounded-xl">
              <SelectItem value="Ubuntu 24.04">Ubuntu 24.04 LTS</SelectItem>
              <SelectItem value="Ubuntu 22.04">Ubuntu 22.04 LTS</SelectItem>
              <SelectItem value="Debian 12">Debian 12</SelectItem>
              <SelectItem value="AlmaLinux 9">AlmaLinux 9</SelectItem>
              <SelectItem value="Windows Server 2022">Windows Server</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Região */}
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold">Região / Datacenter</Label>
          <Select value={newVpsRegion} onValueChange={setNewVpsRegion}>
            <SelectTrigger className="rounded-xl h-10 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="rounded-xl">
              <SelectItem value="US-east">Estados Unidos (US)</SelectItem>
              <SelectItem value="EU-central">Europa (Alemanha)</SelectItem>
              <SelectItem value="BR">Brasil (BR)</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Acesso SSH */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 border-t">
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold">Usuário SSH</Label>
          <Input
            value={newVpsSshUser}
            onChange={(e) => setNewVpsSshUser(e.target.value)}
            className="rounded-xl h-10 font-mono text-xs"
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold">Porta SSH</Label>
          <Input
            type="number"
            value={newVpsSshPort}
            onChange={(e) => setNewVpsSshPort(Number(e.target.value))}
            className="rounded-xl h-10 font-mono text-xs"
          />
        </div>
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label className="text-xs font-semibold">Senha SSH</Label>
            <button
              type="button"
              onClick={() => {
                const pass = "EqsamVPS#" + Math.random().toString(36).slice(-8) + "!";
                setNewVpsSshPassword(pass);
              }}
              className="text-[10px] text-brand hover:underline"
            >
              Gerar
            </button>
          </div>
          <Input
            placeholder="Senha de root..."
            value={newVpsSshPassword}
            onChange={(e) => setNewVpsSshPassword(e.target.value)}
            className="rounded-xl h-10 font-mono text-xs"
          />
        </div>
      </div>
    </div>
  );
}
