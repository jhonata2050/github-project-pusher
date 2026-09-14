import { Server } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { HostingFieldsSectionProps } from "./types";

export function HostingFieldsSection({
  newServiceDomain,
  setNewServiceDomain,
  newServiceServer,
  setNewServiceServer,
  newServiceUsername,
  setNewServiceUsername,
  newServicePassword,
  setNewServicePassword,
  newServiceProvision,
  setNewServiceProvision,
  servers,
}: HostingFieldsSectionProps) {
  return (
    <div className="space-y-4 p-4 rounded-2xl bg-muted/30 border">
      <div className="flex items-center gap-2 text-xs font-semibold text-brand">
        <Server className="size-4" /> Configurações da Hospedagem Web
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Domínio */}
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold">Domínio Principal *</Label>
          <Input
            placeholder="ex: meusite.com.br"
            value={newServiceDomain}
            onChange={(e) => {
              const dom = e.target.value;
              setNewServiceDomain(dom);
              if (!newServiceUsername && dom.includes(".")) {
                const firstPart = dom.split(".")[0] || "";
                const cleanUser = firstPart.replace(/[^a-zA-Z0-9]/g, "").slice(0, 8).toLowerCase();
                setNewServiceUsername(cleanUser);
              }
            }}
            className="rounded-xl h-10"
            required
          />
        </div>

        {/* Servidor */}
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold">Servidor DirectAdmin</Label>
          <Select value={newServiceServer} onValueChange={setNewServiceServer}>
            <SelectTrigger className="rounded-xl h-10">
              <SelectValue placeholder="Selecione o servidor..." />
            </SelectTrigger>
            <SelectContent className="rounded-xl">
              {servers?.map((srv: any) => (
                <SelectItem key={srv.id} value={srv.id}>
                  {srv.name || srv.hostname} ({srv.type?.toUpperCase() || 'DA'})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Usuário */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label className="text-xs font-semibold">Usuário cPanel/DA</Label>
            <button
              type="button"
              onClick={() => {
                const rand = "usr" + Math.floor(1000 + Math.random() * 9000);
                setNewServiceUsername(rand);
              }}
              className="text-[10px] text-brand hover:underline"
            >
              Gerar
            </button>
          </div>
          <Input
            placeholder="ex: cliente01"
            value={newServiceUsername}
            onChange={(e) => setNewServiceUsername(e.target.value)}
            className="rounded-xl h-10 font-mono text-xs"
          />
        </div>

        {/* Senha */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label className="text-xs font-semibold">Senha de Acesso</Label>
            <button
              type="button"
              onClick={() => {
                const pass = "Eqsam#" + Math.random().toString(36).slice(-8) + "!";
                setNewServicePassword(pass);
              }}
              className="text-[10px] text-brand hover:underline"
            >
              Gerar Forte
            </button>
          </div>
          <Input
            placeholder="ex: Senha#Forte123"
            value={newServicePassword}
            onChange={(e) => setNewServicePassword(e.target.value)}
            className="rounded-xl h-10 font-mono text-xs"
          />
        </div>
      </div>

      <div className="flex items-center justify-between p-3 rounded-xl bg-background border">
        <div className="space-y-0.5">
          <Label className="text-xs font-semibold cursor-pointer">Provisionar Imediatamente no Servidor</Label>
          <p className="text-[10px] text-muted-foreground">
            Cria a conta no DirectAdmin agora via API no servidor selecionado.
          </p>
        </div>
        <Switch
          checked={newServiceProvision}
          onCheckedChange={setNewServiceProvision}
        />
      </div>
    </div>
  );
}
