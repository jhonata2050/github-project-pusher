import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/app/AppShell";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Globe, Settings, Layers } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { 
  getDomainSettings, 
  saveDomainSettings, 
  getDomainPricing, 
  saveDomainPricing 
} from "@/lib/domains.functions";
import { supabase } from "@/integrations/supabase/client";
import {
  DomainsListTab,
  DomainPricingTab,
  DomainProvidersTab,
  type ClientDomain,
  type TldPricing,
  type DomainSettings,
} from "@/components/admin/domains";

export const Route = createFileRoute("/_authenticated/admin/domains")({
  component: AdminDomainsPage,
});

function AdminDomainsPage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("domains");

  // Configurações e TLDs
  const { data: settingsData } = useQuery({
    queryKey: ["admin-domain-settings"],
    queryFn: () => getDomainSettings(),
  });

  const { data: pricingData } = useQuery({
    queryKey: ["admin-domain-pricing"],
    queryFn: () => getDomainPricing(),
  });

  // Lista de Domínios do banco
  const { data: clientDomains, isLoading: isLoadingDomains } = useQuery({
    queryKey: ["admin-client-domains"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("domains")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;

      if (data && data.length > 0) {
        const userIds = Array.from(new Set(data.map((d: any) => d.user_id).filter(Boolean)));
        if (userIds.length > 0) {
          const { data: profiles } = await supabase
            .from("profiles")
            .select("id, full_name, email, phone")
            .in("id", userIds);
          const pMap = new Map((profiles || []).map((p: any) => [p.id, p]));
          return data.map((d: any) => ({
            ...d,
            profiles: pMap.get(d.user_id) || null
          })) as ClientDomain[];
        }
      }
      return (data || []) as ClientDomain[];
    },
  });

  // Estado local para formulário de configurações
  const [formData, setFormData] = useState<DomainSettings | null>(null);
  const [tldList, setTldList] = useState<TldPricing[]>([]);

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
    const current = next[index];
    if (current) {
      next[index] = { ...current, [field]: value } as TldPricing;
      setTldList(next);
    }
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

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    saveSettingsMutation.mutate(formData);
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
            <DomainsListTab
              clientDomains={clientDomains}
              isLoadingDomains={isLoadingDomains}
              defaultRegistrar={settingsData?.defaultRegistrar}
            />
          </TabsContent>

          {/* TAB 2: Tabela de Preços (TLDs) */}
          <TabsContent value="pricing" className="space-y-4">
            <DomainPricingTab
              tldList={tldList}
              onUpdateTldPrice={handleUpdateTldPrice}
              onAddTld={handleAddTld}
              onSavePricing={() => savePricingMutation.mutate(tldList)}
              isSavingPricing={savePricingMutation.isPending}
            />
          </TabsContent>

          {/* TAB 3: Provedores e DNS */}
          <TabsContent value="settings" className="space-y-6">
            <DomainProvidersTab
              formData={formData}
              setFormData={setFormData}
              onSaveSettings={handleSaveSettings}
              isSavingSettings={saveSettingsMutation.isPending}
            />
          </TabsContent>
        </Tabs>
      </div>
    </AppShell>
  );
}
