import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/app/AppShell";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  Globe, 
  Shield, 
  Search, 
  Settings, 
  Plus, 
  Save, 
  Clock, 
  Server, 
  ExternalLink,
  CheckCircle2,
  AlertTriangle,
  Lock,
  Sparkles,
  Layers
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { 
  getDomainSettings, 
  saveDomainSettings, 
  getDomainPricing, 
  saveDomainPricing 
} from "@/lib/domains.functions";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/admin/domains")({
  component: AdminDomainsPage,
});

const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

function AdminDomainsPage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("domains");

  // Configurações e TLDs
  const { data: settingsData, isLoading: isLoadingSettings } = useQuery({
    queryKey: ["admin-domain-settings"],
    queryFn: () => getDomainSettings(),
  });

  const { data: pricingData, isLoading: isLoadingPricing } = useQuery({
    queryKey: ["admin-domain-pricing"],
    queryFn: () => getDomainPricing(),
  });

  // Lista de Domínios do banco
  const { data: clientDomains, isLoading: isLoadingDomains } = useQuery({
    queryKey: ["admin-client-domains"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("domains")
        .select("*, profiles(*)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  // Estado local para formulário de configurações
  const [formData, setFormData] = useState<any>(null);
  const [tldList, setTldList] = useState<any[]>([]);

  // Inicializar formulários quando queries carregam
  if (settingsData && !formData) {
    setFormData(settingsData);
  }
  if (pricingData && tldList.length === 0) {
    setTldList(pricingData);
  }

  const saveSettingsMutation = useMutation({
    mutationFn: (data: any) => saveDomainSettings({ data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-domain-settings"] });
      toast.success("Configurações dos registradores salvas com sucesso!");
    },
    onError: (err: any) => {
      toast.error("Erro ao salvar: " + err.message);
    }
  });

  const savePricingMutation = useMutation({
    mutationFn: (tlds: any[]) => saveDomainPricing({ data: { tlds } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-domain-pricing"] });
      toast.success("Tabela de preços de domínios atualizada!");
    },
    onError: (err: any) => {
      toast.error("Erro ao atualizar preços: " + err.message);
    }
  });

  const handleUpdateTldPrice = (index: number, field: string, value: any) => {
    const next = [...tldList];
    next[index] = { ...next[index], [field]: value };
    setTldList(next);
  };

  const handleAddTld = () => {
    setTldList([
      ...tldList,
      {
        extension: ".com.br",
        cost_price: 40.00,
        register_price: 59.90,
        renew_price: 59.90,
        transfer_price: 59.90,
        is_active: true,
        registrar: "openprovider"
      }
    ]);
  };

  return (
    <AppShell area="admin" breadcrumb={<span>Sistema / Domínios</span>}>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">Gestão de Domínios</h1>
            <p className="text-muted-foreground mt-1">
              Gerencie domínios de clientes, precificação de TLDs e integração com Openprovider / ResellerClub.
            </p>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="bg-secondary/40 p-1 rounded-2xl">
            <TabsTrigger value="domains" className="rounded-xl gap-2">
              <Globe className="size-4" /> Domínios Registrados ({clientDomains?.length || 0})
            </TabsTrigger>
            <TabsTrigger value="pricing" className="rounded-xl gap-2">
              <Layers className="size-4" /> Tabela de Preços (TLDs)
            </TabsTrigger>
            <TabsTrigger value="settings" className="rounded-xl gap-2">
              <Settings className="size-4" /> Provedores & DNS Padrão
            </TabsTrigger>
          </TabsList>

          {/* TAB 1: Domínios de Clientes */}
          <TabsContent value="domains" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-3">
              <Card className="rounded-2xl border-none shadow-sm bg-card p-5">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-emerald-500/10 text-emerald-600 rounded-xl">
                    <Globe className="size-5" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground font-medium uppercase">Total de Domínios</p>
                    <p className="text-xl font-bold text-foreground">{clientDomains?.length || 0}</p>
                  </div>
                </div>
              </Card>
              <Card className="rounded-2xl border-none shadow-sm bg-card p-5">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-blue-500/10 text-blue-600 rounded-xl">
                    <CheckCircle2 className="size-5" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground font-medium uppercase">Domínios Ativos</p>
                    <p className="text-xl font-bold text-foreground">
                      {clientDomains?.filter((d: any) => d.status === "active").length || 0}
                    </p>
                  </div>
                </div>
              </Card>
              <Card className="rounded-2xl border-none shadow-sm bg-card p-5">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-purple-500/10 text-purple-600 rounded-xl">
                    <Shield className="size-5" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground font-medium uppercase">Registrar Ativo</p>
                    <p className="text-sm font-bold text-foreground uppercase">{settingsData?.defaultRegistrar || "Openprovider"}</p>
                  </div>
                </div>
              </Card>
            </div>

            {isLoadingDomains ? (
              <div className="h-48 bg-muted/40 rounded-3xl animate-pulse" />
            ) : clientDomains && clientDomains.length > 0 ? (
              <div className="rounded-2xl border border-border bg-card overflow-hidden">
                <table className="w-full text-left text-sm">
                  <thead className="bg-secondary/30 text-xs font-semibold text-muted-foreground uppercase">
                    <tr>
                      <th className="px-5 py-3.5">Domínio</th>
                      <th className="px-5 py-3.5">Cliente</th>
                      <th className="px-5 py-3.5">Status</th>
                      <th className="px-5 py-3.5">Registrador</th>
                      <th className="px-5 py-3.5">Expiração</th>
                      <th className="px-5 py-3.5 text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {clientDomains.map((d: any) => (
                      <tr key={d.id} className="hover:bg-secondary/10">
                        <td className="px-5 py-4 font-bold text-foreground">
                          {d.domain_name}
                        </td>
                        <td className="px-5 py-4 text-xs text-muted-foreground">
                          {d.profiles?.full_name || d.user_id}
                        </td>
                        <td className="px-5 py-4">
                          <Badge className={cn(
                            "rounded-full text-[10px] uppercase font-bold",
                            d.status === "active" ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" : "bg-warning/10 text-warning"
                          )}>
                            {d.status === "active" ? "Ativo" : d.status}
                          </Badge>
                        </td>
                        <td className="px-5 py-4 text-xs capitalize text-muted-foreground font-mono">
                          {d.registrar || "Openprovider"}
                        </td>
                        <td className="px-5 py-4 text-xs text-muted-foreground">
                          {d.expiry_date ? new Date(d.expiry_date).toLocaleDateString("pt-BR") : "---"}
                        </td>
                        <td className="px-5 py-4 text-right">
                          <Button variant="outline" size="sm" className="rounded-xl text-xs">
                            Gerenciar
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-16 bg-muted/20 rounded-3xl border-2 border-dashed border-muted">
                <Globe className="h-10 w-10 text-muted-foreground mb-3 opacity-30" />
                <p className="text-sm font-medium text-muted-foreground">Nenhum domínio cadastrado sob gestão no momento.</p>
              </div>
            )}
          </TabsContent>

          {/* TAB 2: Tabela de Preços (TLDs) */}
          <TabsContent value="pricing" className="space-y-4">
            <Card className="rounded-3xl border-none shadow-sm bg-card p-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                <div>
                  <h3 className="text-lg font-bold text-foreground">Tabela de Preços por Extensão (TLDs)</h3>
                  <p className="text-xs text-muted-foreground">
                    Defina o custo e a margem de revenda para cada extensão de domínio oferecida no painel.
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={handleAddTld} className="rounded-xl text-xs gap-1.5">
                    <Plus className="size-3.5" /> Adicionar TLD
                  </Button>
                  <Button 
                    onClick={() => savePricingMutation.mutate(tldList)} 
                    disabled={savePricingMutation.isPending}
                    className="rounded-xl text-xs gap-1.5 bg-primary text-primary-foreground"
                  >
                    <Save className="size-3.5" /> Salvar Tabela
                  </Button>
                </div>
              </div>

              <div className="overflow-x-auto rounded-2xl border border-border">
                <table className="w-full text-left text-sm">
                  <thead className="bg-secondary/30 text-xs font-semibold text-muted-foreground uppercase">
                    <tr>
                      <th className="px-4 py-3">Extensão</th>
                      <th className="px-4 py-3">Preço de Custo (R$)</th>
                      <th className="px-4 py-3">Preço de Venda (R$/ano)</th>
                      <th className="px-4 py-3">Renovação (R$)</th>
                      <th className="px-4 py-3">Registrador</th>
                      <th className="px-4 py-3 text-center">Ativo</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {tldList.map((tld, idx) => (
                      <tr key={idx} className="hover:bg-secondary/10">
                        <td className="px-4 py-3">
                          <Input 
                            value={tld.extension} 
                            onChange={(e) => handleUpdateTldPrice(idx, "extension", e.target.value)}
                            className="h-9 w-28 rounded-xl font-bold font-mono text-xs"
                          />
                        </td>
                        <td className="px-4 py-3">
                          <Input 
                            type="number"
                            step="0.01"
                            value={tld.cost_price} 
                            onChange={(e) => handleUpdateTldPrice(idx, "cost_price", Number(e.target.value))}
                            className="h-9 w-28 rounded-xl text-xs"
                          />
                        </td>
                        <td className="px-4 py-3">
                          <Input 
                            type="number"
                            step="0.01"
                            value={tld.register_price} 
                            onChange={(e) => handleUpdateTldPrice(idx, "register_price", Number(e.target.value))}
                            className="h-9 w-28 rounded-xl text-xs font-bold text-primary"
                          />
                        </td>
                        <td className="px-4 py-3">
                          <Input 
                            type="number"
                            step="0.01"
                            value={tld.renew_price} 
                            onChange={(e) => handleUpdateTldPrice(idx, "renew_price", Number(e.target.value))}
                            className="h-9 w-28 rounded-xl text-xs"
                          />
                        </td>
                        <td className="px-4 py-3">
                          <select 
                            value={tld.registrar || "openprovider"}
                            onChange={(e) => handleUpdateTldPrice(idx, "registrar", e.target.value)}
                            className="h-9 rounded-xl border border-input bg-card px-2.5 text-xs text-foreground"
                          >
                            <option value="openprovider">Openprovider</option>
                            <option value="resellerclub">ResellerClub</option>
                            <option value="registrobr">Registro.br (Manual/EPP)</option>
                          </select>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <Switch 
                            checked={tld.is_active}
                            onCheckedChange={(v) => handleUpdateTldPrice(idx, "is_active", v)}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </TabsContent>

          {/* TAB 3: Provedores e DNS */}
          <TabsContent value="settings" className="space-y-6">
            <form onSubmit={(e) => {
              e.preventDefault();
              saveSettingsMutation.mutate(formData);
            }}>
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
                        onChange={(e) => setFormData({ ...formData, openproviderUsername: e.target.value })}
                        className="rounded-xl h-10"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs font-semibold">Senha / API Token</Label>
                      <Input 
                        type="password"
                        placeholder="••••••••" 
                        value={formData?.openproviderPassword || ""}
                        onChange={(e) => setFormData({ ...formData, openproviderPassword: e.target.value })}
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
                        onCheckedChange={(v) => setFormData({ ...formData, openproviderTestMode: v })}
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
                        onChange={(e) => setFormData({ ...formData, resellerclubUserid: e.target.value })}
                        className="rounded-xl h-10"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs font-semibold">API Key</Label>
                      <Input 
                        type="password"
                        placeholder="••••••••" 
                        value={formData?.resellerclubApikey || ""}
                        onChange={(e) => setFormData({ ...formData, resellerclubApikey: e.target.value })}
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
                        onCheckedChange={(v) => setFormData({ ...formData, resellerclubTestMode: v })}
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
                        onChange={(e) => setFormData({ ...formData, defaultNs1: e.target.value })}
                        className="rounded-xl h-10"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs font-semibold">Nameserver Secundário 2</Label>
                      <Input 
                        placeholder="ns2.seuservidor.com" 
                        value={formData?.defaultNs2 || ""}
                        onChange={(e) => setFormData({ ...formData, defaultNs2: e.target.value })}
                        className="rounded-xl h-10"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs font-semibold">Nameserver Opcional 3</Label>
                      <Input 
                        placeholder="ns3.seuservidor.com" 
                        value={formData?.defaultNs3 || ""}
                        onChange={(e) => setFormData({ ...formData, defaultNs3: e.target.value })}
                        className="rounded-xl h-10"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs font-semibold">Nameserver Opcional 4</Label>
                      <Input 
                        placeholder="ns4.seuservidor.com" 
                        value={formData?.defaultNs4 || ""}
                        onChange={(e) => setFormData({ ...formData, defaultNs4: e.target.value })}
                        className="rounded-xl h-10"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end pt-4 border-t">
                    <Button 
                      type="submit" 
                      disabled={saveSettingsMutation.isPending}
                      className="rounded-xl gap-2 bg-primary text-primary-foreground"
                    >
                      <Save className="size-4" /> Salvar Configurações
                    </Button>
                  </div>
                </Card>
              </div>
            </form>
          </TabsContent>
        </Tabs>
      </div>
    </AppShell>
  );
}
