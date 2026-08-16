import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Package, Plus, Search, Store, Edit2, Save, X, Server } from "lucide-react";
import { useState } from "react";

import { AppShell } from "@/components/app/AppShell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { updateProduct, createProduct, getServers, getDAPackagesList, getProductGroups } from "@/lib/support.functions";
import { getContaboPlansFn } from "@/lib/vps-admin.functions";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/products")({
  head: () => ({
    meta: [
      { title: "Produtos e planos — HostPanel" },
      {
        name: "description",
        content: "Gerencie os planos de hospedagem, pacotes do DirectAdmin e preços por ciclo de cobrança.",
      },
    ],
  }),
  component: ProductsPage,
});

const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

const CYCLE_LABELS: Record<string, string> = {
  monthly: "mês",
  quarterly: "trimestre",
  semiannually: "semestre",
  annually: "ano",
  biennially: "2 anos",
};

function ProductsPage() {
  const [term, setTerm] = useState("");
  const [editingProduct, setEditingProduct] = useState<any>(null);
  const [selectedServer, setSelectedServer] = useState<string>("");
  const queryClient = useQueryClient();

  const products = useQuery({
    queryKey: ["admin-products"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select(
          "id, name, slug, description, directadmin_package, external_id, disk_quota_mb, is_visible, sort_order, product_type, group_id, product_groups(name), product_prices(cycle, price, is_active)",
        )
        .order("sort_order");
      if (error) throw error;
      return data;
    },
  });

  const productGroups = useQuery({
    queryKey: ["admin-product-groups"],
    queryFn: () => getProductGroups(),
    staleTime: 1000 * 60 * 15,
  });

  const contaboPlans = useQuery({
    queryKey: ["contabo-plans"],
    queryFn: () => getContaboPlansFn(),
    // Só busca o catálogo externo quando o editor de um produto VPS está aberto
    enabled: editingProduct?.product_type === "vps",
    staleTime: 1000 * 60 * 30,
  });

  const servers = useQuery({
    queryKey: ["admin-servers"],
    queryFn: () => getServers(),
    staleTime: 1000 * 60 * 15,
  });

  const daPackages = useQuery({
    queryKey: ["da-packages", selectedServer],
    queryFn: () => getDAPackagesList({ data: selectedServer }),
    enabled: !!selectedServer,
  });

  const updateMutation = useMutation({
    mutationFn: async (data: any) => {
      if (data.id) {
        return await updateProduct({ data });
      } else {
        return await createProduct({ data });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-products"] });
      setEditingProduct(null);
      toast.success(editingProduct?.id ? "Produto atualizado com sucesso!" : "Produto criado com sucesso!");
    },
    onError: (err: any) => {
      toast.error("Erro ao salvar: " + err.message);
    }
  });

  const filtered = (products.data ?? []).filter((p) =>
    p.name.toLowerCase().includes(term.trim().toLowerCase()),
  );

  const handleEdit = (product: any) => {
    setEditingProduct({
      ...product,
      directadmin_package: product.directadmin_package || "",
      external_id: product.external_id || "",
      prices: product.product_prices || []
    });
  };

  const handleCreate = () => {
    setEditingProduct({
      name: "",
      slug: "",
      description: "",
      product_type: "hosting",
      group_id: productGroups.data?.[0]?.id || "",
      directadmin_package: "",
      external_id: "",
      is_visible: true,
      sort_order: 0,
      disk_quota_mb: 0,
      prices: []
    });
  };

  const handleSave = () => {
    updateMutation.mutate({
      id: editingProduct.id,
      name: editingProduct.name,
      slug: editingProduct.slug || editingProduct.name.toLowerCase().replace(/\s+/g, '-'),
      group_id: editingProduct.group_id,
      product_type: editingProduct.product_type,
      description: editingProduct.description,
      directadmin_package: editingProduct.directadmin_package || null,
      external_id: editingProduct.external_id || null,
      is_visible: editingProduct.is_visible,
      sort_order: editingProduct.sort_order,
      disk_quota_mb: editingProduct.disk_quota_mb,
      prices: editingProduct.prices.map((p: any) => ({
        cycle: p.cycle,
        price: Number(p.price),
        is_active: p.is_active
      }))
    });
  };

  return (
    <AppShell
      area="admin"
      breadcrumb={
        <>
          <span className="flex items-center gap-2">
            <Store className="size-4" />
            Sua Loja
          </span>
          <span>/</span>
          <span className="flex items-center gap-2 font-medium text-foreground">
            <Package className="size-4" />
            Produtos
          </span>
        </>
      }
    >
      <h1 className="text-2xl font-semibold tracking-tight">Seus produtos</h1>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-56">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={term}
            onChange={(e) => setTerm(e.target.value)}
            placeholder="Pesquisar"
            className="h-11 rounded-xl pl-9"
          />
        </div>
        <Button 
          className="h-11 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90"
          onClick={handleCreate}
        >
          <Plus className="mr-1 size-4" />
          Novo
        </Button>
      </div>

      {products.isLoading ? (
        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-40 rounded-2xl" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <p className="py-24 text-center text-sm text-muted-foreground">Nenhum produto encontrado</p>
      ) : (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((product) => {
            const monthly = product.product_prices?.find((p) => p.cycle === "monthly" && p.is_active);
            return (
              <article key={product.id} className="group relative rounded-2xl border border-border p-5 transition-all hover:shadow-[var(--shadow-card)]">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h2 className="font-semibold">{product.name}</h2>
                    <p className="text-xs text-muted-foreground">
                      {product.product_groups?.name ?? "Sem grupo"}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={product.is_visible ? "default" : "secondary"}>
                      {product.is_visible ? "Visível" : "Oculto"}
                    </Badge>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="size-8 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => handleEdit(product)}
                    >
                      <Edit2 className="size-4" />
                    </Button>
                  </div>
                </div>
                <p className="mt-3 line-clamp-2 text-sm text-muted-foreground">{product.description}</p>
                <dl className="mt-4 space-y-1 text-xs text-muted-foreground">
                  <div className="flex justify-between">
                    <dt>Pacote DirectAdmin</dt>
                    <dd className="text-foreground">{product.directadmin_package ?? "—"}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt>Disco</dt>
                    <dd className="text-foreground">
                      {product.disk_quota_mb ? `${Math.round(product.disk_quota_mb / 1024)} GB` : "—"}
                    </dd>
                  </div>
                  <div className="flex justify-between">
                    <dt>Preços ativos</dt>
                    <dd className="text-foreground">{product.product_prices?.filter(p => p.is_active).length ?? 0}</dd>
                  </div>
                </dl>
                <p className="mt-4 text-lg font-semibold">
                  {monthly ? brl.format(Number(monthly.price)) : "Sem preço mensal"}
                  <span className="text-sm font-normal text-muted-foreground">
                    {monthly ? ` /${CYCLE_LABELS[monthly.cycle]}` : ""}
                  </span>
                </p>
              </article>
            );
          })}
        </div>
      )}

      <Dialog open={!!editingProduct} onOpenChange={(open) => !open && setEditingProduct(null)}>
        <DialogContent className="max-w-2xl rounded-3xl border-none shadow-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold">
              {editingProduct?.id ? "Editar Produto" : "Novo Produto"}
            </DialogTitle>
          </DialogHeader>
          
          {editingProduct && (
            <div className="space-y-6 py-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Nome do Plano</Label>
                  <Input 
                    value={editingProduct.name} 
                    onChange={e => setEditingProduct({...editingProduct, name: e.target.value})}
                    placeholder="Ex: Hospedagem Start"
                    className="rounded-xl"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Tipo de Produto</Label>
                  <Select 
                    value={editingProduct.product_type} 
                    onValueChange={val => setEditingProduct({...editingProduct, product_type: val})}
                  >
                    <SelectTrigger className="rounded-xl">
                      <SelectValue placeholder="Selecione o tipo" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl border-none shadow-xl">
                      <SelectItem value="hosting">Hospedagem (DirectAdmin)</SelectItem>
                      <SelectItem value="vps">VPS (Contabo)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Grupo</Label>
                  <Select 
                    value={editingProduct.group_id || ""} 
                    onValueChange={val => setEditingProduct({...editingProduct, group_id: val})}
                  >
                    <SelectTrigger className="rounded-xl">
                      <SelectValue placeholder="Selecione um grupo" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl border-none shadow-xl">
                      {productGroups.data?.map((g: any) => (
                        <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Ordem de Exibição</Label>
                  <Input 
                    type="number"
                    value={editingProduct.sort_order} 
                    onChange={e => setEditingProduct({...editingProduct, sort_order: Number(e.target.value)})}
                    className="rounded-xl"
                  />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Espaço em Disco (MB)</Label>
                  <Input 
                    type="number"
                    value={editingProduct.disk_quota_mb || ""} 
                    onChange={e => setEditingProduct({...editingProduct, disk_quota_mb: Number(e.target.value)})}
                    placeholder="Ex: 1024 para 1GB"
                    className="rounded-xl"
                  />
                </div>
                <div className="flex items-center justify-between pt-8">
                  <Label>Produto Visível</Label>
                  <Switch 
                    checked={editingProduct.is_visible} 
                    onCheckedChange={val => setEditingProduct({...editingProduct, is_visible: val})}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Descrição</Label>
                <Textarea 
                  value={editingProduct.description || ""} 
                  onChange={e => setEditingProduct({...editingProduct, description: e.target.value})}
                  className="rounded-xl min-h-[80px]"
                />
              </div>

              <div className="rounded-2xl border border-border p-4 bg-muted/30">
                <div className="flex items-center gap-2 mb-4 text-sm font-bold uppercase text-muted-foreground">
                  <Server className="size-4" />
                  {editingProduct.product_type === 'vps' ? 'Integração Contabo' : 'Integração DirectAdmin'}
                </div>
                
                {editingProduct.product_type === 'vps' ? (
                  <div className="space-y-2">
                    <Label>Plano Contabo (Product ID)</Label>
                    <Select 
                      value={editingProduct.external_id || ""} 
                      onValueChange={val => setEditingProduct({...editingProduct, external_id: val, directadmin_package: val})}
                    >
                      <SelectTrigger className="rounded-xl">
                        <SelectValue placeholder={
                          contaboPlans.isLoading ? "Carregando planos da Contabo..." : 
                          contaboPlans.error ? "Erro ao carregar (verifique API)" : 
                          "Selecione o plano VPS"
                        } />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl border-none shadow-xl">
                        {contaboPlans.data?.map((plan: any) => (
                          <SelectItem key={plan.productId} value={plan.productId}>
                            {plan.name} ({plan.productId}) — {plan.vCpu} / {plan.ramTitle} / {plan.diskGb}
                          </SelectItem>
                        ))}
                        {(!contaboPlans.data || contaboPlans.data.length === 0) && !contaboPlans.isLoading && (
                          <div className="p-4 text-xs text-center text-muted-foreground">
                            {contaboPlans.error ? (
                              <div className="text-destructive font-medium">
                                Falha na API Contabo. <br/>
                                Certifique-se de que as credenciais em Financeiro estão corretas.
                              </div>
                            ) : "Nenhum plano encontrado na API"}
                          </div>
                        )}
                      </SelectContent>
                    </Select>
                    <p className="text-[10px] text-muted-foreground mt-1">
                      Este ID será enviado à Contabo durante o provisionamento automático.
                    </p>
                  </div>
                ) : (
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Servidor para Sincronização</Label>
                      <Select value={selectedServer} onValueChange={setSelectedServer}>
                        <SelectTrigger className="rounded-xl">
                          <SelectValue placeholder="Selecione um servidor" />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl border-none shadow-xl">
                          {servers.data?.map((s: any) => (
                            <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Pacote no Servidor</Label>
                      <Select 
                        value={editingProduct.directadmin_package || ""} 
                        onValueChange={val => setEditingProduct({...editingProduct, directadmin_package: val})}
                      >
                        <SelectTrigger className="rounded-xl">
                          <SelectValue placeholder={daPackages.isLoading ? "Carregando..." : "Selecione um pacote"} />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl border-none shadow-xl">
                          {daPackages.data?.map((pkg: string) => (
                            <SelectItem key={pkg} value={pkg}>{pkg}</SelectItem>
                          ))}
                          {(!daPackages.data || daPackages.data.length === 0) && !daPackages.isLoading && (
                            <div className="p-2 text-xs text-center text-muted-foreground">Nenhum pacote encontrado ou servidor não selecionado</div>
                          )}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label className="font-bold">Ciclos de Cobrança</Label>
                </div>
                
                <div className="grid gap-3">
                  {Object.keys(CYCLE_LABELS).map(cycle => {
                    const priceObj = editingProduct.prices.find((p: any) => p.cycle === cycle) || { cycle, price: 0, is_active: false };
                    return (
                      <div key={cycle} className="flex items-center gap-4 rounded-xl border border-border p-3 bg-white">
                        <div className="flex-1">
                          <Label className="capitalize text-xs">{CYCLE_LABELS[cycle]}</Label>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold">R$</span>
                          <Input 
                            type="number" 
                            value={priceObj.price}
                            onChange={e => {
                              const newPrices = [...editingProduct.prices];
                              const idx = newPrices.findIndex(p => p.cycle === cycle);
                              if (idx > -1) {
                                newPrices[idx] = {...newPrices[idx], price: e.target.value};
                              } else {
                                newPrices.push({ cycle, price: e.target.value, is_active: true });
                              }
                              setEditingProduct({...editingProduct, prices: newPrices});
                            }}
                            className="w-24 h-8 rounded-lg"
                          />
                        </div>
                        <Switch 
                          checked={priceObj.is_active}
                          onCheckedChange={val => {
                            const newPrices = [...editingProduct.prices];
                            const idx = newPrices.findIndex(p => p.cycle === cycle);
                            if (idx > -1) {
                              newPrices[idx] = {...newPrices[idx], is_active: val};
                            } else {
                              newPrices.push({ cycle, price: 0, is_active: val });
                            }
                            setEditingProduct({...editingProduct, prices: newPrices});
                          }}
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="mt-6 flex flex-row gap-2">
            <Button variant="outline" className="flex-1 rounded-2xl" onClick={() => setEditingProduct(null)}>
              Cancelar
            </Button>
            <Button 
              className="flex-1 rounded-2xl bg-brand text-brand-foreground hover:bg-brand/90"
              onClick={handleSave}
              disabled={updateMutation.isPending}
            >
              {updateMutation.isPending ? "Salvando..." : "Salvar Alterações"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <p className="mt-8 text-xs text-muted-foreground">
        Precisa ver a loja pública? <Link to="/" className="text-brand underline">Abrir catálogo</Link>
      </p>
    </AppShell>
  );
}
