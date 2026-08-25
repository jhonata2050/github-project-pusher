import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Monitor, Plus, Search, Server, Edit2, Copy, Cpu } from "lucide-react";
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
import { updateProduct, createProduct, getProductGroups } from "@/lib/support.functions";
import { getContaboPlansFn } from "@/lib/vps-admin.functions";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/vps/plans")({
  head: () => ({
    meta: [
      { title: "Planos VPS — Eqsam" },
      {
        name: "description",
        content: "Área exclusiva para criar e gerenciar planos de servidores VPS, separada da hospedagem web.",
      },
    ],
  }),
  component: VPSPlansPage,
});

const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

const CYCLE_LABELS: Record<string, string> = {
  monthly: "mês",
  quarterly: "trimestre",
  semiannually: "semestre",
  annually: "ano",
  biennially: "2 anos",
};

const PUBLIC_ORIGIN = "https://easy-push1231231sa1d131dscxsc.lovable.app";

function VPSPlansPage() {
  const [term, setTerm] = useState("");
  const [editing, setEditing] = useState<any>(null);
  const queryClient = useQueryClient();

  const plans = useQuery({
    queryKey: ["admin-vps-plans"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select(
          "id, name, slug, description, external_id, disk_quota_mb, bandwidth_quota_mb, is_visible, sort_order, product_type, group_id, immediate_purchase, product_groups(name), product_prices(cycle, price, is_active)",
        )
        .eq("product_type", "vps")
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
    enabled: !!editing,
    staleTime: 1000 * 60 * 30,
  });

  const saveMutation = useMutation({
    mutationFn: async (data: any) => (data.id ? updateProduct({ data }) : createProduct({ data })),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-vps-plans"] });
      toast.success(editing?.id ? "Plano VPS atualizado!" : "Plano VPS criado!");
      setEditing(null);
    },
    onError: (err: any) => toast.error("Erro ao salvar: " + err.message),
  });

  const filtered = (plans.data ?? []).filter((p: any) =>
    p.name.toLowerCase().includes(term.trim().toLowerCase()),
  );

  const handleCreate = () => {
    setEditing({
      name: "",
      slug: "",
      description: "",
      product_type: "vps",
      group_id: productGroups.data?.[0]?.id || "",
      external_id: "",
      is_visible: true,
      sort_order: 0,
      disk_quota_mb: 0,
      immediate_purchase: false,
      prices: [],
    });
  };

  const handleEdit = (plan: any) => {
    setEditing({
      ...plan,
      external_id: plan.external_id || "",
      immediate_purchase: !!plan.immediate_purchase,
      prices: plan.product_prices || [],
    });
  };

  const handleSave = () => {
    if (!editing.name?.trim()) {
      toast.error("Informe o nome do plano.");
      return;
    }
    saveMutation.mutate({
      id: editing.id,
      name: editing.name,
      slug: editing.slug || editing.name.toLowerCase().replace(/\s+/g, "-"),
      group_id: editing.group_id,
      product_type: "vps",
      description: editing.description,
      // Planos VPS nunca usam pacotes de hospedagem web
      directadmin_package: null,
      external_id: editing.external_id || null,
      is_visible: editing.is_visible,
      sort_order: editing.sort_order,
      disk_quota_mb: editing.disk_quota_mb,
      immediate_purchase: editing.immediate_purchase,
      prices: (editing.prices ?? []).map((p: any) => ({
        cycle: p.cycle,
        price: Number(p.price),
        is_active: p.is_active,
      })),
    });
  };

  return (
    <AppShell
      area="admin"
      breadcrumb={
        <>
          <span className="flex items-center gap-2">
            <Monitor className="size-4" />
            VPS
          </span>
          <span>/</span>
          <span className="flex items-center gap-2 font-medium text-foreground">
            <Cpu className="size-4" />
            Planos VPS
          </span>
        </>
      }
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Planos VPS</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Área exclusiva de planos de servidores VPS. Planos de hospedagem web ficam em{" "}
            <Link to="/admin/products" className="text-brand underline">
              Produtos e planos
            </Link>
            .
          </p>
        </div>
        <Button className="h-11 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90" onClick={handleCreate}>
          <Plus className="mr-1 size-4" />
          Novo plano VPS
        </Button>
      </div>

      <div className="mt-6 relative max-w-md">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={term}
          onChange={(e) => setTerm(e.target.value)}
          placeholder="Pesquisar plano VPS"
          className="h-11 rounded-xl pl-9"
        />
      </div>

      {plans.isLoading ? (
        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-40 rounded-2xl" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="mt-6 rounded-2xl border border-dashed border-border p-16 text-center text-sm text-muted-foreground">
          Nenhum plano VPS cadastrado ainda.
        </div>
      ) : (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((plan: any) => {
            const monthly = plan.product_prices?.find((p: any) => p.cycle === "monthly" && p.is_active);
            return (
              <article
                key={plan.id}
                className="group relative rounded-2xl border border-border p-5 transition-all hover:shadow-[var(--shadow-card)]"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h2 className="flex items-center gap-2 font-semibold">
                      <Monitor className="size-4 text-brand" />
                      {plan.name}
                    </h2>
                    <p className="text-xs text-muted-foreground">{plan.product_groups?.name ?? "Sem grupo"}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={plan.is_visible ? "default" : "secondary"}>
                      {plan.is_visible ? "Visível" : "Oculto"}
                    </Badge>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-8 rounded-lg opacity-0 transition-opacity group-hover:opacity-100"
                      onClick={() => handleEdit(plan)}
                    >
                      <Edit2 className="size-4" />
                    </Button>
                  </div>
                </div>
                <p className="mt-3 line-clamp-2 text-sm text-muted-foreground">{plan.description}</p>
                <dl className="mt-4 space-y-1 text-xs text-muted-foreground">
                  <div className="flex justify-between">
                    <dt>Plano no provedor</dt>
                    <dd className="text-foreground">{plan.external_id ?? "—"}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt>Disco</dt>
                    <dd className="text-foreground">
                      {plan.disk_quota_mb ? `${Math.round(plan.disk_quota_mb / 1024)} GB` : "—"}
                    </dd>
                  </div>
                  <div className="flex justify-between">
                    <dt>Preços ativos</dt>
                    <dd className="text-foreground">
                      {plan.product_prices?.filter((p: any) => p.is_active).length ?? 0}
                    </dd>
                  </div>
                  {plan.immediate_purchase && (
                    <div className="mt-1 flex items-center justify-between">
                      <dt className="font-medium text-brand">Link de venda</dt>
                      <dd>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-6 h-6 w-6"
                          onClick={() => {
                            navigator.clipboard.writeText(
                              `${PUBLIC_ORIGIN}/checkout/${plan.id}?immediate=true&mode=signup`,
                            );
                            toast.success("Link copiado!");
                          }}
                        >
                          <Copy className="size-3" />
                        </Button>
                      </dd>
                    </div>
                  )}
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

      <Dialog open={!!editing} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto rounded-3xl border-none shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold">
              {editing?.id ? "Editar plano VPS" : "Novo plano VPS"}
            </DialogTitle>
          </DialogHeader>

          {editing && (
            <div className="space-y-6 py-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Nome do plano</Label>
                  <Input
                    value={editing.name}
                    onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                    placeholder="Ex: VPS Cloud 4GB"
                    className="rounded-xl"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Grupo</Label>
                  <Select
                    value={editing.group_id || ""}
                    onValueChange={(val) => setEditing({ ...editing, group_id: val })}
                  >
                    <SelectTrigger className="rounded-xl">
                      <SelectValue placeholder="Selecione um grupo" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl border-none shadow-xl">
                      {productGroups.data?.map((g: any) => (
                        <SelectItem key={g.id} value={g.id}>
                          {g.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Espaço em disco (MB)</Label>
                  <Input
                    type="number"
                    value={editing.disk_quota_mb || ""}
                    onChange={(e) => setEditing({ ...editing, disk_quota_mb: Number(e.target.value) })}
                    placeholder="Ex: 51200 para 50GB"
                    className="rounded-xl"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Ordem de exibição</Label>
                  <Input
                    type="number"
                    value={editing.sort_order}
                    onChange={(e) => setEditing({ ...editing, sort_order: Number(e.target.value) })}
                    className="rounded-xl"
                  />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="flex items-center justify-between rounded-xl border border-border bg-muted/20 p-4">
                  <div className="space-y-0.5">
                    <Label className="text-sm font-medium">Venda imediata</Label>
                    <p className="text-[10px] text-muted-foreground">Gera link direto para checkout</p>
                  </div>
                  <Switch
                    checked={editing.immediate_purchase}
                    onCheckedChange={(val) => setEditing({ ...editing, immediate_purchase: val })}
                  />
                </div>
                <div className="flex items-center justify-between rounded-xl border border-border bg-muted/20 p-4">
                  <Label className="text-sm font-medium">Plano visível na loja</Label>
                  <Switch
                    checked={editing.is_visible}
                    onCheckedChange={(val) => setEditing({ ...editing, is_visible: val })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Descrição</Label>
                <Textarea
                  value={editing.description || ""}
                  onChange={(e) => setEditing({ ...editing, description: e.target.value })}
                  className="min-h-[80px] rounded-xl"
                />
              </div>

              <div className="rounded-2xl border border-border bg-muted/30 p-4">
                <div className="mb-4 flex items-center gap-2 text-sm font-bold uppercase text-muted-foreground">
                  <Server className="size-4" />
                  Provisionamento automático
                </div>
                <div className="space-y-2">
                  <Label>Plano do provedor</Label>
                  <Select
                    value={editing.external_id || ""}
                    onValueChange={(val) => setEditing({ ...editing, external_id: val })}
                  >
                    <SelectTrigger className="rounded-xl">
                      <SelectValue
                        placeholder={
                          contaboPlans.isLoading
                            ? "Carregando planos do provedor..."
                            : "Selecione o plano do provedor"
                        }
                      />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl border-none shadow-xl">
                      {contaboPlans.data?.map((cat: any) => (
                        <div key={cat.category}>
                          <div className="sticky top-0 bg-brand/5 px-2 py-1.5 text-xs font-bold uppercase tracking-wider text-brand">
                            {cat.category}
                          </div>
                          {cat.items.map((p: any) => (
                            <SelectItem key={p.productId} value={p.productId}>
                              {p.name} — {p.vCpu} / {p.ramTitle} / {p.diskGb}
                            </SelectItem>
                          ))}
                        </div>
                      ))}
                      {(!contaboPlans.data || contaboPlans.data.length === 0) && !contaboPlans.isLoading && (
                        <div className="p-4 text-center text-xs text-muted-foreground">
                          Catálogo do provedor indisponível. Você pode informar o identificador manualmente abaixo.
                        </div>
                      )}
                    </SelectContent>
                  </Select>
                  <Input
                    value={editing.external_id || ""}
                    onChange={(e) => setEditing({ ...editing, external_id: e.target.value })}
                    placeholder="Identificador do plano no provedor"
                    className="rounded-xl"
                  />
                  <p className="mt-1 text-[10px] text-muted-foreground">
                    Usado no provisionamento automático da VPS. Deixe em branco para provisionamento manual pelo admin.
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                <Label className="font-bold">Ciclos de cobrança</Label>
                <div className="grid gap-3">
                  {Object.keys(CYCLE_LABELS).map((cycle) => {
                    const priceObj =
                      (editing.prices ?? []).find((p: any) => p.cycle === cycle) || {
                        cycle,
                        price: 0,
                        is_active: false,
                      };
                    return (
                      <div key={cycle} className="flex items-center gap-4 rounded-xl border border-border bg-card p-3">
                        <div className="flex-1">
                          <Label className="text-xs capitalize">{CYCLE_LABELS[cycle]}</Label>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold">R$</span>
                          <Input
                            type="number"
                            value={priceObj.price}
                            onChange={(e) => {
                              const newPrices = [...(editing.prices ?? [])];
                              const idx = newPrices.findIndex((p: any) => p.cycle === cycle);
                              if (idx > -1) newPrices[idx] = { ...newPrices[idx], price: e.target.value };
                              else newPrices.push({ cycle, price: e.target.value, is_active: true });
                              setEditing({ ...editing, prices: newPrices });
                            }}
                            className="h-8 w-24 rounded-lg"
                          />
                        </div>
                        <Switch
                          checked={priceObj.is_active}
                          onCheckedChange={(val) => {
                            const newPrices = [...(editing.prices ?? [])];
                            const idx = newPrices.findIndex((p: any) => p.cycle === cycle);
                            if (idx > -1) newPrices[idx] = { ...newPrices[idx], is_active: val };
                            else newPrices.push({ cycle, price: 0, is_active: val });
                            setEditing({ ...editing, prices: newPrices });
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
            <Button variant="outline" className="flex-1 rounded-2xl" onClick={() => setEditing(null)}>
              Cancelar
            </Button>
            <Button
              className="flex-1 rounded-2xl bg-brand text-brand-foreground hover:bg-brand/90"
              onClick={handleSave}
              disabled={saveMutation.isPending}
            >
              {saveMutation.isPending ? "Salvando..." : "Salvar plano VPS"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
