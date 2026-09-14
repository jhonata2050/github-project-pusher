import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { Users, Package, Settings } from "lucide-react";
import { AppShell } from "@/components/app/AppShell";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  getAdminAffiliates,
  saveAdminProductCommissions,
  saveAdminGlobalAffiliateSettings,
  updateSingleAffiliatePercent,
} from "@/lib/affiliates.functions";
import {
  AffiliatesKpiCards,
  ProductCommissionsTab,
  AffiliatesListTab,
  GlobalSettingsTab,
  EditAffiliateModal,
  type ProductRuleMap,
} from "@/components/admin/affiliates";
import type { AffiliateAccount } from "@/lib/affiliates/types";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/affiliates")({
  head: () => ({
    meta: [{ title: "Gestão de Afiliados — Administração" }],
  }),
  component: AdminAffiliatesPage,
});

function AdminAffiliatesPage() {
  const queryClient = useQueryClient();
  const [selectedTab, setSelectedTab] = useState("products");

  // Estado para edição de comissão individual
  const [editingAffiliate, setEditingAffiliate] = useState<AffiliateAccount | null>(null);
  const [editPercent, setEditPercent] = useState<string>("10");
  const [editIsActive, setEditIsActive] = useState<boolean>(true);

  // Estado para edição de regras por produto
  const [productRules, setProductRules] = useState<ProductRuleMap>({});

  // Estado para configurações globais
  const [globalDefaultPercent, setGlobalDefaultPercent] = useState<number>(10);
  const [globalCookieDays, setGlobalCookieDays] = useState<number>(30);
  const [globalMinWithdraw, setGlobalMinWithdraw] = useState<number>(10);

  const { data } = useQuery({
    queryKey: ["adminAffiliatesData"],
    queryFn: () => getAdminAffiliates(),
  });

  const affList = (data?.affiliates || []) as AffiliateAccount[];
  const productSettings = data?.productSettings;
  const products = productSettings?.productRules || [];

  // Sincronizar estado local quando os dados chegarem da API
  useEffect(() => {
    if (productSettings) {
      const initialRules: ProductRuleMap = {};
      productSettings.productRules.forEach((p) => {
        initialRules[p.productId] = {
          type: p.type || "percentage",
          value: p.value !== undefined ? p.value : 10,
          isEnabled: p.isEnabled ?? true,
        };
      });
      setProductRules(initialRules);

      if (productSettings.globalSettings) {
        setGlobalDefaultPercent(productSettings.globalSettings.defaultPercent || 10);
        setGlobalCookieDays(productSettings.globalSettings.cookieDurationDays || 30);
        setGlobalMinWithdraw(productSettings.globalSettings.minWithdrawAmount || 10);
      }
    }
  }, [productSettings]);

  // Mutações
  const saveProductRulesMutation = useMutation({
    mutationFn: async () => {
      return saveAdminProductCommissions({ data: { rules: productRules } });
    },
    onSuccess: () => {
      toast.success("Regras de comissões por serviço salvas com sucesso!");
      queryClient.invalidateQueries({ queryKey: ["adminAffiliatesData"] });
    },
    onError: (err: any) => {
      toast.error(err.message || "Erro ao salvar comissões.");
    },
  });

  const saveGlobalSettingsMutation = useMutation({
    mutationFn: async () => {
      return saveAdminGlobalAffiliateSettings({
        data: {
          defaultPercent: globalDefaultPercent,
          cookieDurationDays: globalCookieDays,
          minWithdrawAmount: globalMinWithdraw,
          autoApprove: true,
        },
      });
    },
    onSuccess: () => {
      toast.success("Configurações globais salvas com sucesso!");
      queryClient.invalidateQueries({ queryKey: ["adminAffiliatesData"] });
    },
    onError: (err: any) => {
      toast.error(err.message || "Erro ao salvar configurações.");
    },
  });

  const updateAffiliateMutation = useMutation({
    mutationFn: async () => {
      if (!editingAffiliate) return;
      return updateSingleAffiliatePercent({
        data: {
          affiliateId: editingAffiliate.id,
          commissionPercent: Number(editPercent),
          isActive: editIsActive,
        },
      });
    },
    onSuccess: () => {
      toast.success("Comissão do afiliado atualizada com sucesso!");
      setEditingAffiliate(null);
      queryClient.invalidateQueries({ queryKey: ["adminAffiliatesData"] });
    },
    onError: (err: any) => {
      toast.error(err.message || "Erro ao atualizar afiliado.");
    },
  });

  const handleProductRuleChange = (productId: string, field: "type" | "value" | "isEnabled", val: any) => {
    setProductRules((prev) => ({
      ...prev,
      [productId]: {
        type: "percentage",
        value: 10,
        isEnabled: false,
        ...prev[productId],
        [field]: val,
      },
    }));
  };

  const handleOpenEdit = (affiliate: AffiliateAccount) => {
    setEditingAffiliate(affiliate);
    setEditPercent(String(affiliate.commission_percent || 10));
    setEditIsActive(Boolean(affiliate.is_active));
  };

  return (
    <AppShell breadcrumbs={[{ label: "Administração", href: "/admin" }, { label: "Gestão de Afiliados" }]}>
      <div className="space-y-6 max-w-6xl mx-auto pb-12">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Gestão do Programa de Afiliados</h1>
            <p className="text-muted-foreground text-sm">
              Configure as porcentagens de ganho por serviço, comissões globais e gerencie afiliados.
            </p>
          </div>
        </div>

        {/* Estatísticas Gerais */}
        <AffiliatesKpiCards affList={affList} />

        {/* Abas de Navegação */}
        <Tabs value={selectedTab} onValueChange={setSelectedTab} className="space-y-6">
          <TabsList className="grid w-full sm:w-auto grid-cols-3 max-w-md">
            <TabsTrigger value="products" className="gap-2">
              <Package className="w-4 h-4" />
              Comissão por Serviço
            </TabsTrigger>
            <TabsTrigger value="affiliates" className="gap-2">
              <Users className="w-4 h-4" />
              Afiliados ({affList.length})
            </TabsTrigger>
            <TabsTrigger value="settings" className="gap-2">
              <Settings className="w-4 h-4" />
              Configurações
            </TabsTrigger>
          </TabsList>

          {/* ABA 1: CONFIGURAÇÃO DE COMISSÃO POR SERVIÇO / PLANO */}
          <TabsContent value="products" className="space-y-4">
            <ProductCommissionsTab
              products={products}
              productRules={productRules}
              globalDefaultPercent={globalDefaultPercent}
              onProductRuleChange={handleProductRuleChange}
              onSave={() => saveProductRulesMutation.mutate()}
              isSaving={saveProductRulesMutation.isPending}
            />
          </TabsContent>

          {/* ABA 2: LISTAGEM E EDIÇÃO DE AFILIADOS */}
          <TabsContent value="affiliates" className="space-y-4">
            <AffiliatesListTab
              affList={affList}
              onEditAffiliate={handleOpenEdit}
            />
          </TabsContent>

          {/* ABA 3: CONFIGURAÇÕES GERAIS */}
          <TabsContent value="settings" className="space-y-4">
            <GlobalSettingsTab
              globalDefaultPercent={globalDefaultPercent}
              setGlobalDefaultPercent={setGlobalDefaultPercent}
              globalCookieDays={globalCookieDays}
              setGlobalCookieDays={setGlobalCookieDays}
              globalMinWithdraw={globalMinWithdraw}
              setGlobalMinWithdraw={setGlobalMinWithdraw}
              onSave={() => saveGlobalSettingsMutation.mutate()}
              isSaving={saveGlobalSettingsMutation.isPending}
            />
          </TabsContent>
        </Tabs>
      </div>

      {/* Modal de Edição de Comissão Individual */}
      <EditAffiliateModal
        editingAffiliate={editingAffiliate}
        onClose={() => setEditingAffiliate(null)}
        editPercent={editPercent}
        setEditPercent={setEditPercent}
        editIsActive={editIsActive}
        setEditIsActive={setEditIsActive}
        onSave={() => updateAffiliateMutation.mutate()}
        isSaving={updateAffiliateMutation.isPending}
      />
    </AppShell>
  );
}
export default AdminAffiliatesPage;
