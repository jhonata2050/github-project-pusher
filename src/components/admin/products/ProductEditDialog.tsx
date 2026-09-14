import { Server, Copy } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { CYCLE_LABELS, type EditingProduct } from "./types";

interface ProductEditDialogProps {
  editingProduct: EditingProduct | null;
  setEditingProduct: (product: EditingProduct | null) => void;
  selectedServer: string;
  setSelectedServer: (serverId: string) => void;
  productGroups?: any[] | undefined;
  servers?: any[] | undefined;
  daPackages: {
    data?: string[] | undefined;
    isLoading: boolean;
    error?: unknown;
  };
  onSave: () => void;
  isSaving: boolean;
}

export function ProductEditDialog({
  editingProduct,
  setEditingProduct,
  selectedServer,
  setSelectedServer,
  productGroups,
  servers,
  daPackages,
  onSave,
  isSaving,
}: ProductEditDialogProps) {
  if (!editingProduct) return null;

  return (
    <Dialog open={!!editingProduct} onOpenChange={(open) => !open && setEditingProduct(null)}>
      <DialogContent className="max-w-2xl rounded-3xl border-none shadow-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">
            {editingProduct.id ? "Editar Produto" : "Novo Produto"}
          </DialogTitle>
        </DialogHeader>
        
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
                  <SelectItem value="domain">Domínio</SelectItem>
                  <SelectItem value="other">Outros / Adicionais</SelectItem>
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
                  {productGroups?.map((g: any) => (
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
            <div className="flex items-center justify-between border border-border rounded-xl p-4 bg-muted/20">
              <div className="space-y-0.5">
                <Label className="text-sm font-medium">Venda Imediata</Label>
                <p className="text-[10px] text-muted-foreground">Gera link direto para checkout</p>
              </div>
              <Switch 
                checked={editingProduct.immediate_purchase} 
                onCheckedChange={val => setEditingProduct({...editingProduct, immediate_purchase: val})}
              />
            </div>
            {editingProduct.immediate_purchase && editingProduct.id && (
              <div className="flex items-center gap-2 border border-border rounded-xl p-4 bg-brand/5">
                <div className="flex-1 min-w-0">
                  <Label className="text-[10px] text-brand font-bold uppercase">Link do Plano</Label>
                  <p className="text-[10px] truncate text-muted-foreground">
                    {`/checkout/${editingProduct.id}?immediate=true&mode=signup`}
                  </p>
                </div>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="size-8"
                  onClick={() => {
                    const publicOrigin = typeof window !== 'undefined' ? window.location.origin : '';
                    const url = `${publicOrigin}/checkout/${editingProduct.id}?immediate=true&mode=signup`;
                    navigator.clipboard.writeText(url);
                    toast.success("Link copiado!");
                  }}
                >
                  <Copy className="size-4 text-brand" />
                </Button>
              </div>
            )}
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
              Integração DirectAdmin
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Servidor para Sincronização</Label>
                <Select value={selectedServer} onValueChange={setSelectedServer}>
                  <SelectTrigger className="rounded-xl">
                    <SelectValue placeholder="Selecione um servidor" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl border-none shadow-xl">
                    {servers?.map((s: any) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.hostname ?? s.name ?? s.ip_address ?? s.id}
                      </SelectItem>
                    ))}
                    {(!servers || servers.length === 0) && (
                      <div className="p-2 text-xs text-center text-muted-foreground">
                        Nenhum servidor cadastrado
                      </div>
                    )}
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
                      <div className="p-2 text-xs text-center text-muted-foreground">
                        {daPackages.error
                          ? (daPackages.error as Error).message
                          : "Selecione um servidor para carregar os pacotes"}
                      </div>
                    )}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="font-bold">Ciclos de Cobrança</Label>
            </div>
            
            <div className="grid gap-3">
              {Object.keys(CYCLE_LABELS).map(cycle => {
                const priceObj = editingProduct.prices.find((p: any) => p.cycle === cycle) || { cycle, price: 0, is_active: false };
                return (
                  <div key={cycle} className="flex items-center gap-4 rounded-xl border border-border/70 p-3 bg-card">
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
                            newPrices[idx] = { cycle, price: e.target.value, is_active: newPrices[idx]?.is_active ?? true };
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
                          newPrices[idx] = { cycle, price: newPrices[idx]?.price ?? 0, is_active: val };
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

        <DialogFooter className="mt-6 flex flex-row gap-2">
          <Button variant="outline" className="flex-1 rounded-2xl" onClick={() => setEditingProduct(null)}>
            Cancelar
          </Button>
          <Button 
            className="flex-1 rounded-2xl bg-brand text-brand-foreground hover:bg-brand/90"
            onClick={onSave}
            disabled={isSaving}
          >
            {isSaving ? "Salvando..." : "Salvar Alterações"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
