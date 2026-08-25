import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { 
  Users, 
  DollarSign, 
  TrendingUp, 
  Award, 
  Package,
  Settings,
  Edit,
  Save,
  CheckCircle2,
  Percent,
  Sliders,
  Check
} from "lucide-react";
import { AppShell } from "@/components/app/AppShell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { 
  getAdminAffiliates, 
  saveAdminProductCommissions, 
  saveAdminGlobalAffiliateSettings,
  updateSingleAffiliatePercent 
} from "@/lib/affiliates.functions";
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
  const [editingAffiliate, setEditingAffiliate] = useState<any>(null);
  const [editPercent, setEditPercent] = useState<string>("10");
  const [editIsActive, setEditIsActive] = useState<boolean>(true);

  // Estado para edição de regras por produto
  const [productRules, setProductRules] = useState<Record<string, { type: "percentage" | "fixed"; value: number; isEnabled: boolean }>>({});

  // Estado para configurações globais
  const [globalDefaultPercent, setGlobalDefaultPercent] = useState<number>(10);
  const [globalCookieDays, setGlobalCookieDays] = useState<number>(30);
  const [globalMinWithdraw, setGlobalMinWithdraw] = useState<number>(10);

  const { data, isLoading } = useQuery({
    queryKey: ["adminAffiliatesData"],
    queryFn: () => getAdminAffiliates(),
  });

  const affList = data?.affiliates || [];
  const productSettings = data?.productSettings;
  const products = productSettings?.productRules || [];

  // Sincronizar estado local quando os dados chegarem da API
  useEffect(() => {
    if (productSettings) {
      const initialRules: Record<string, { type: "percentage" | "fixed"; value: number; isEnabled: boolean }> = {};
      productSettings.productRules.forEach((p: any) => {
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

  const totalSales = affList.reduce((acc: number, a: any) => acc + (Number(a.total_sales) || 0), 0);
  const totalClicks = affList.reduce((acc: number, a: any) => acc + (Number(a.total_clicks) || 0), 0);
  const totalPaid = affList.reduce((acc: number, a: any) => acc + (Number(a.paid_earnings) || 0), 0);
  const totalAvailable = affList.reduce((acc: number, a: any) => acc + (Number(a.available_balance) || 0), 0);

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
        ...prev[productId],
        [field]: val,
      },
    }));
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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
              <span className="text-sm font-medium text-muted-foreground">Total de Afiliados</span>
              <Users className="w-4 h-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{affList.length}</div>
              <p className="text-xs text-muted-foreground mt-1">Clientes com link ativo</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
              <span className="text-sm font-medium text-muted-foreground">Vendas por Indicação</span>
              <TrendingUp className="w-4 h-4 text-purple-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalSales}</div>
              <p className="text-xs text-muted-foreground mt-1">De {totalClicks} cliques rastreados</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
              <span className="text-sm font-medium text-muted-foreground">Saldo Pendente/Disponível</span>
              <DollarSign className="w-4 h-4 text-amber-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">
                R$ {totalAvailable.toFixed(2)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">Aguardando resgate</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
              <span className="text-sm font-medium text-muted-foreground">Comissões Pagas</span>
              <Award className="w-4 h-4 text-emerald-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                R$ {totalPaid.toFixed(2)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">Transferidas para carteira</p>
            </CardContent>
          </Card>
        </div>

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
            <Card>
              <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4">
                <div>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Package className="w-5 h-5 text-primary" />
                    Porcentagem de Ganho por Serviço / Produto
                  </CardTitle>
                  <CardDescription>
                    Defina individualmente quanto o afiliado ganha ao indicar cada plano (em % ou valor fixo em R$).
                  </CardDescription>
                </div>
                <Button 
                  onClick={() => saveProductRulesMutation.mutate()} 
                  disabled={saveProductRulesMutation.isPending}
                  className="gap-2 shrink-0 bg-primary"
                >
                  <Save className="w-4 h-4" />
                  {saveProductRulesMutation.isPending ? "Salvando..." : "Salvar Comissões"}
                </Button>
              </CardHeader>
              <CardContent>
                {products.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    Nenhum produto cadastrado no catálogo.
                  </div>
                ) : (
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Serviço / Produto</TableHead>
                          <TableHead>Categoria</TableHead>
                          <TableHead className="w-[180px]">Tipo de Comissão</TableHead>
                          <TableHead className="w-[180px]">Valor da Comissão</TableHead>
                          <TableHead className="text-right w-[120px]">Programa Ativo</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {products.map((p: any) => {
                          const rule = productRules[p.productId] || {
                            type: "percentage",
                            value: globalDefaultPercent,
                            isEnabled: true,
                          };

                          return (
                            <TableRow key={p.productId}>
                              <TableCell className="font-semibold text-sm">
                                {p.productName}
                              </TableCell>
                              <TableCell>
                                <Badge variant="secondary" className="text-xs">
                                  {p.groupName}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <Select
                                  value={rule.type}
                                  onValueChange={(val: "percentage" | "fixed") =>
                                    handleProductRuleChange(p.productId, "type", val)
                                  }
                                >
                                  <SelectTrigger className="h-9">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="percentage">Porcentagem (%)</SelectItem>
                                    <SelectItem value="fixed">Valor Fixo (R$)</SelectItem>
                                  </SelectContent>
                                </Select>
                              </TableCell>
                              <TableCell>
                                <div className="relative">
                                  <Input
                                    type="number"
                                    step="0.5"
                                    min="0"
                                    className="h-9 pr-8"
                                    value={rule.value}
                                    onChange={(e) =>
                                      handleProductRuleChange(
                                        p.productId,
                                        "value",
                                        Number(e.target.value)
                                      )
                                    }
                                  />
                                  <span className="absolute right-2.5 top-2 text-xs font-semibold text-muted-foreground">
                                    {rule.type === "percentage" ? "%" : "R$"}
                                  </span>
                                </div>
                              </TableCell>
                              <TableCell className="text-right">
                                <Switch
                                  checked={rule.isEnabled}
                                  onCheckedChange={(checked) =>
                                    handleProductRuleChange(p.productId, "isEnabled", checked)
                                  }
                                />
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ABA 2: LISTAGEM E EDIÇÃO DE AFILIADOS */}
          <TabsContent value="affiliates" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Award className="w-5 h-5 text-primary" />
                  Afiliados Cadastrados
                </CardTitle>
                <CardDescription>
                  Visualize o desempenho de cada parceiro e personalize a comissão individualmente se desejar.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {affList.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    Nenhum afiliado cadastrado ainda.
                  </div>
                ) : (
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Cliente</TableHead>
                          <TableHead>Código</TableHead>
                          <TableHead>Comissão Base</TableHead>
                          <TableHead>Cliques</TableHead>
                          <TableHead>Vendas</TableHead>
                          <TableHead>Saldo Disponível</TableHead>
                          <TableHead>Total Pago</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="text-right">Ação</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {affList.map((a: any) => (
                          <TableRow key={a.id}>
                            <TableCell>
                              <div className="font-medium">{a.profiles?.full_name || "Cliente"}</div>
                              <div className="text-xs text-muted-foreground">{a.profiles?.email}</div>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className="font-mono text-xs">
                                {a.code}
                              </Badge>
                            </TableCell>
                            <TableCell className="font-semibold text-sm">
                              {Number(a.commission_percent || 10)}%
                            </TableCell>
                            <TableCell className="text-sm">{a.total_clicks || 0}</TableCell>
                            <TableCell className="font-medium text-sm">{a.total_sales || 0}</TableCell>
                            <TableCell className="font-bold text-sm text-amber-600 dark:text-amber-400">
                              R$ {Number(a.available_balance || 0).toFixed(2)}
                            </TableCell>
                            <TableCell className="font-bold text-sm text-emerald-600 dark:text-emerald-400">
                              R$ {Number(a.paid_earnings || 0).toFixed(2)}
                            </TableCell>
                            <TableCell>
                              <Badge variant={a.is_active ? "default" : "destructive"}>
                                {a.is_active ? "Ativo" : "Inativo"}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-8 gap-1 text-xs"
                                onClick={() => {
                                  setEditingAffiliate(a);
                                  setEditPercent(String(a.commission_percent || 10));
                                  setEditIsActive(Boolean(a.is_active));
                                }}
                              >
                                <Edit className="w-3.5 h-3.5" />
                                Editar
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ABA 3: CONFIGURAÇÕES GERAIS */}
          <TabsContent value="settings" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Sliders className="w-5 h-5 text-primary" />
                  Configurações Globais do Programa
                </CardTitle>
                <CardDescription>
                  Parâmetros padrão aplicados quando um serviço não possui regra específica.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 max-w-lg">
                <div className="space-y-2">
                  <Label>Porcentagem Padrão de Comissão (%)</Label>
                  <div className="relative">
                    <Input
                      type="number"
                      min="1"
                      max="100"
                      value={globalDefaultPercent}
                      onChange={(e) => setGlobalDefaultPercent(Number(e.target.value))}
                    />
                    <Percent className="w-4 h-4 absolute right-3 top-2.5 text-muted-foreground" />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Taxa atribuída automaticamente aos novos afiliados e aos produtos sem regra personalizada.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>Validade do Cookie de Indicação (Dias)</Label>
                  <Input
                    type="number"
                    min="1"
                    value={globalCookieDays}
                    onChange={(e) => setGlobalCookieDays(Number(e.target.value))}
                  />
                  <p className="text-xs text-muted-foreground">
                    Tempo máximo que o visitante pode demorar para assinar após clicar no link e ainda gerar comissão.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>Valor Mínimo para Resgate (R$)</Label>
                  <Input
                    type="number"
                    min="1"
                    value={globalMinWithdraw}
                    onChange={(e) => setGlobalMinWithdraw(Number(e.target.value))}
                  />
                  <p className="text-xs text-muted-foreground">
                    Saldo mínimo acumulado exigido para o cliente transferir para a carteira.
                  </p>
                </div>

                <Button 
                  onClick={() => saveGlobalSettingsMutation.mutate()} 
                  disabled={saveGlobalSettingsMutation.isPending}
                  className="gap-2 mt-2"
                >
                  <Save className="w-4 h-4" />
                  {saveGlobalSettingsMutation.isPending ? "Salvando..." : "Salvar Configurações Globais"}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Modal de Edição de Comissão Individual */}
      <Dialog open={Boolean(editingAffiliate)} onOpenChange={(open) => !open && setEditingAffiliate(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Editar Comissão do Afiliado</DialogTitle>
            <DialogDescription>
              Personalize a porcentagem base de ganho para o cliente <strong>{editingAffiliate?.profiles?.full_name || editingAffiliate?.code}</strong>.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Porcentagem de Comissão (%)</Label>
              <div className="relative">
                <Input
                  type="number"
                  min="0"
                  max="100"
                  step="0.5"
                  value={editPercent}
                  onChange={(e) => setEditPercent(e.target.value)}
                />
                <Percent className="w-4 h-4 absolute right-3 top-2.5 text-muted-foreground" />
              </div>
            </div>

            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div>
                <div className="text-sm font-medium">Status da Conta de Afiliado</div>
                <div className="text-xs text-muted-foreground">Permitir que este cliente continue acumulando comissões</div>
              </div>
              <Switch checked={editIsActive} onCheckedChange={setEditIsActive} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setEditingAffiliate(null)}>
              Cancelar
            </Button>
            <Button 
              onClick={() => updateAffiliateMutation.mutate()} 
              disabled={updateAffiliateMutation.isPending}
              className="gap-2"
            >
              {updateAffiliateMutation.isPending ? "Salvando..." : "Salvar Alterações"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
