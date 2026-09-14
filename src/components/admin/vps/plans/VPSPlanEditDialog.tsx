import { Server } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { CYCLE_LABELS } from "./constants";
import type { VPSPlanEditDialogProps } from "./types";

export function VPSPlanEditDialog({
  editing,
  onClose,
  onSave,
  isSaving,
  productGroups = [],
  contaboPlans = [],
  isLoadingContabo = false,
  onChange,
}: VPSPlanEditDialogProps) {
  return (
    <Dialog open={!!editing} onOpenChange={(open) => !open && onClose()}>
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
                  onChange={(e) => onChange({ ...editing, name: e.target.value })}
                  placeholder="Ex: VPS Cloud 4GB"
                  className="rounded-xl"
                />
              </div>
              <div className="space-y-2">
                <Label>Grupo</Label>
                <Select
                  value={editing.group_id || ""}
                  onValueChange={(val) => onChange({ ...editing, group_id: val })}
                >
                  <SelectTrigger className="rounded-xl">
                    <SelectValue placeholder="Selecione um grupo" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl border-none shadow-xl">
                    {productGroups.map((g: any) => (
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
                  value={editing.disk_quota_mb ?? ""}
                  onChange={(e) => onChange({ ...editing, disk_quota_mb: Number(e.target.value) })}
                  placeholder="Ex: 51200 para 50GB"
                  className="rounded-xl"
                />
              </div>
              <div className="space-y-2">
                <Label>Ordem de exibição</Label>
                <Input
                  type="number"
                  value={editing.sort_order ?? 0}
                  onChange={(e) => onChange({ ...editing, sort_order: Number(e.target.value) })}
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
                  checked={!!editing.immediate_purchase}
                  onCheckedChange={(val) => onChange({ ...editing, immediate_purchase: val })}
                />
              </div>
              <div className="flex items-center justify-between rounded-xl border border-border bg-muted/20 p-4">
                <Label className="text-sm font-medium">Plano visível na loja</Label>
                <Switch
                  checked={!!editing.is_visible}
                  onCheckedChange={(val) => onChange({ ...editing, is_visible: val })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Descrição</Label>
              <Textarea
                value={editing.description || ""}
                onChange={(e) => onChange({ ...editing, description: e.target.value })}
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
                  onValueChange={(val) => onChange({ ...editing, external_id: val })}
                >
                  <SelectTrigger className="rounded-xl">
                    <SelectValue
                      placeholder={
                        isLoadingContabo
                          ? "Carregando planos do provedor..."
                          : "Selecione o plano do provedor"
                      }
                    />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl border-none shadow-xl">
                    {contaboPlans?.map((cat: any) => (
                      <div key={cat.category}>
                        <div className="sticky top-0 bg-brand/5 px-2 py-1.5 text-xs font-bold uppercase tracking-wider text-brand">
                          {cat.category}
                        </div>
                        {cat.items?.map((p: any) => (
                          <SelectItem key={p.productId} value={p.productId}>
                            {p.name} — {p.vCpu} / {p.ramTitle} / {p.diskGb}
                          </SelectItem>
                        ))}
                      </div>
                    ))}
                    {(!contaboPlans || contaboPlans.length === 0) && !isLoadingContabo && (
                      <div className="p-4 text-center text-xs text-muted-foreground">
                        Catálogo do provedor indisponível. Você pode informar o identificador manualmente abaixo.
                      </div>
                    )}
                  </SelectContent>
                </Select>
                <Input
                  value={editing.external_id || ""}
                  onChange={(e) => onChange({ ...editing, external_id: e.target.value })}
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
                        <Label className="text-xs capitalize">{CYCLE_LABELS[cycle] || cycle}</Label>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold">R$</span>
                        <Input
                          type="number"
                          value={priceObj.price}
                          onChange={(e) => {
                            const newPrices = [...(editing.prices ?? [])];
                            const idx = newPrices.findIndex((p: any) => p.cycle === cycle);
                            if (idx > -1) {
                              newPrices[idx] = {
                                cycle,
                                price: e.target.value,
                                is_active: newPrices[idx]?.is_active ?? true,
                              };
                            } else {
                              newPrices.push({ cycle, price: e.target.value, is_active: true });
                            }
                            onChange({ ...editing, prices: newPrices });
                          }}
                          className="h-8 w-24 rounded-lg"
                        />
                      </div>
                      <Switch
                        checked={priceObj.is_active}
                        onCheckedChange={(val) => {
                          const newPrices = [...(editing.prices ?? [])];
                          const idx = newPrices.findIndex((p: any) => p.cycle === cycle);
                          if (idx > -1) {
                            newPrices[idx] = {
                              cycle,
                              price: newPrices[idx]?.price ?? 0,
                              is_active: val,
                            };
                          } else {
                            newPrices.push({ cycle, price: 0, is_active: val });
                          }
                          onChange({ ...editing, prices: newPrices });
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
          <Button variant="outline" className="flex-1 rounded-2xl" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            className="flex-1 rounded-2xl bg-brand text-brand-foreground hover:bg-brand/90"
            onClick={onSave}
            disabled={isSaving}
          >
            {isSaving ? "Salvando..." : "Salvar plano VPS"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
