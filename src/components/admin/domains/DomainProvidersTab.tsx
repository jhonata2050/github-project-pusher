import { Globe, Shield, Server, Save } from "lucide-react";
import { Card, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import type { DomainSettings } from "./types";

interface DomainProvidersTabProps {
  formData: DomainSettings | null;
  setFormData: React.Dispatch<React.SetStateAction<DomainSettings | null>>;
  onSaveSettings: (e: React.FormEvent) => void;
  isSavingSettings: boolean;
}

export function DomainProvidersTab({
  formData,
  setFormData,
  onSaveSettings,
  isSavingSettings,
}: DomainProvidersTabProps) {
  return (
    <form onSubmit={onSaveSettings}>
      <div className="grid gap-6 md:grid-cols-2">
        {/* Provedor Openprovider */}
        <Card className="rounded-3xl border-none shadow-sm bg-card p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <Globe className="size-4 text-primary" /> Openprovider REST API
              </CardTitle>
              <CardDescription className="text-xs">
                Registrador oficial ICANN com custos at-cost para gTLDs e .com.br.
              </CardDescription>
            </div>
          </div>

          <div className="space-y-3 pt-2">
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Usuário / Email Openprovider</Label>
              <Input 
                placeholder="seu-usuario-openprovider" 
                value={formData?.openproviderUsername || ""}
                onChange={(e) => setFormData((prev) => ({ ...prev, openproviderUsername: e.target.value }))}
                className="rounded-xl h-10"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Senha / API Token</Label>
              <Input 
                type="password"
                placeholder="••••••••" 
                value={formData?.openproviderPassword || ""}
                onChange={(e) => setFormData((prev) => ({ ...prev, openproviderPassword: e.target.value }))}
                className="rounded-xl h-10"
              />
            </div>
            <div className="flex items-center justify-between pt-2">
              <div>
                <Label className="text-xs font-semibold">Ambiente de Testes (Sandbox CTE)</Label>
                <p className="text-[11px] text-muted-foreground">Usar api.cte.openprovider.eu</p>
              </div>
              <Switch 
                checked={formData?.openproviderTestMode || false}
                onCheckedChange={(v) => setFormData((prev) => ({ ...prev, openproviderTestMode: v }))}
              />
            </div>
          </div>
        </Card>

        {/* Provedor ResellerClub */}
        <Card className="rounded-3xl border-none shadow-sm bg-card p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <Shield className="size-4 text-blue-500" /> ResellerClub API
              </CardTitle>
              <CardDescription className="text-xs">
                API tradicional HTTP/REST do ecossistema WHMCS.
              </CardDescription>
            </div>
          </div>

          <div className="space-y-3 pt-2">
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Reseller ID (Auth-UserID)</Label>
              <Input 
                placeholder="Ex: 123456" 
                value={formData?.resellerclubUserid || ""}
                onChange={(e) => setFormData((prev) => ({ ...prev, resellerclubUserid: e.target.value }))}
                className="rounded-xl h-10"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-semibold">API Key</Label>
              <Input 
                type="password"
                placeholder="••••••••" 
                value={formData?.resellerclubApikey || ""}
                onChange={(e) => setFormData((prev) => ({ ...prev, resellerclubApikey: e.target.value }))}
                className="rounded-xl h-10"
              />
            </div>
            <div className="flex items-center justify-between pt-2">
              <div>
                <Label className="text-xs font-semibold">Ambiente de Testes (Sandbox)</Label>
                <p className="text-[11px] text-muted-foreground">Usar test.httpapi.com</p>
              </div>
              <Switch 
                checked={formData?.resellerclubTestMode || false}
                onCheckedChange={(v) => setFormData((prev) => ({ ...prev, resellerclubTestMode: v }))}
              />
            </div>
          </div>
        </Card>

        {/* Nameservers Padrão */}
        <Card className="md:col-span-2 rounded-3xl border-none shadow-sm bg-card p-6 space-y-4">
          <CardTitle className="text-base flex items-center gap-2">
            <Server className="size-4 text-primary" /> Servidores DNS Padrão (Nameservers)
          </CardTitle>
          <CardDescription className="text-xs">
            Estes são os Nameservers atribuídos automaticamente a novos registros de domínio criados pelo sistema.
          </CardDescription>

          <div className="grid gap-4 sm:grid-cols-2 pt-2">
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Nameserver Primário 1</Label>
              <Input 
                placeholder="ns1.seuservidor.com" 
                value={formData?.defaultNs1 || ""}
                onChange={(e) => setFormData((prev) => ({ ...prev, defaultNs1: e.target.value }))}
                className="rounded-xl h-10"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Nameserver Secundário 2</Label>
              <Input 
                placeholder="ns2.seuservidor.com" 
                value={formData?.defaultNs2 || ""}
                onChange={(e) => setFormData((prev) => ({ ...prev, defaultNs2: e.target.value }))}
                className="rounded-xl h-10"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Nameserver Opcional 3</Label>
              <Input 
                placeholder="ns3.seuservidor.com" 
                value={formData?.defaultNs3 || ""}
                onChange={(e) => setFormData((prev) => ({ ...prev, defaultNs3: e.target.value }))}
                className="rounded-xl h-10"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Nameserver Opcional 4</Label>
              <Input 
                placeholder="ns4.seuservidor.com" 
                value={formData?.defaultNs4 || ""}
                onChange={(e) => setFormData((prev) => ({ ...prev, defaultNs4: e.target.value }))}
                className="rounded-xl h-10"
              />
            </div>
          </div>

          <div className="flex justify-end pt-4 border-t">
            <Button 
              type="submit" 
              disabled={isSavingSettings}
              className="rounded-xl gap-2 bg-primary text-primary-foreground"
            >
              <Save className="size-4" /> Salvar Configurações
            </Button>
          </div>
        </Card>
      </div>
    </form>
  );
}
