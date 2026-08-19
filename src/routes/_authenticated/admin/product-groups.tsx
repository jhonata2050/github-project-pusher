import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { LayoutPanelLeft, Plus, Edit2, Trash2, Save, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { AppShell } from "@/components/app/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { getProductGroups, createProductGroup, updateProductGroup, deleteProductGroup } from "@/lib/support.functions";

export const Route = createFileRoute("/_authenticated/admin/product-groups")({
  head: () => ({
    meta: [
      { title: "Grupos de Produtos — Eqsam" },
      {
        name: "description",
        content: "Gerencie as categorias e grupos de produtos da sua loja.",
      },
    ],
  }),
  component: ProductGroupsPage,
});

function ProductGroupsPage() {
  const queryClient = useQueryClient();
  const [editingGroup, setEditingGroup] = useState<any>(null);

  const { data: groups, isLoading } = useQuery({
    queryKey: ["admin-product-groups-full"],
    queryFn: () => getProductGroups(),
  });

  const mutation = useMutation({
    mutationFn: async (data: any) => {
      if (data.id) {
        return await updateProductGroup({ data });
      } else {
        return await createProductGroup({ data });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-product-groups-full"] });
      queryClient.invalidateQueries({ queryKey: ["admin-product-groups"] });
      setEditingGroup(null);
      toast.success("Grupo salvo com sucesso!");
    },
    onError: (err: any) => {
      toast.error("Erro ao salvar: " + err.message);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteProductGroup({ data: id }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-product-groups-full"] });
      queryClient.invalidateQueries({ queryKey: ["admin-product-groups"] });
      toast.success("Grupo excluído com sucesso!");
    },
    onError: (err: any) => {
      toast.error("Erro ao excluir: " + err.message);
    }
  });

  const handleEdit = (group: any) => {
    setEditingGroup({ ...group });
  };

  const handleCreate = () => {
    setEditingGroup({
      name: "",
      description: "",
      sort_order: 0,
      is_visible: true
    });
  };

  const handleSave = () => {
    mutation.mutate(editingGroup);
  };

  return (
    <AppShell
      area="admin"
      breadcrumb={
        <>
          <span className="flex items-center gap-2">
            <LayoutPanelLeft className="size-4" />
            Catálogo
          </span>
          <span>/</span>
          <span className="flex items-center gap-2 font-medium text-foreground">
            Grupos de produtos
          </span>
        </>
      }
    >
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Grupos de produtos</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Categorize seus produtos para facilitar a navegação do cliente.
          </p>
        </div>
        <Button 
          className="rounded-xl bg-primary text-primary-foreground hover:bg-primary/90"
          onClick={handleCreate}
        >
          <Plus className="mr-1 size-4" />
          Novo Grupo
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {isLoading ? (
          [0, 1, 2].map(i => <div key={i} className="h-32 rounded-2xl bg-muted animate-pulse" />)
        ) : groups?.length === 0 ? (
          <div className="col-span-full py-12 text-center text-muted-foreground border-2 border-dashed rounded-3xl">
            Nenhum grupo cadastrado.
          </div>
        ) : (
          groups?.map((group: any) => (
            <article key={group.id} className="group relative rounded-2xl border border-border p-5 transition-all hover:shadow-sm">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold">{group.name}</h3>
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{group.description || "Sem descrição"}</p>
                </div>
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="icon" className="size-8 rounded-lg" onClick={() => handleEdit(group)}>
                    <Edit2 className="size-4" />
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="size-8 rounded-lg text-destructive hover:bg-destructive/10"
                    onClick={() => {
                      if (confirm("Deseja realmente excluir este grupo?")) {
                        deleteMutation.mutate(group.id);
                      }
                    }}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              </div>
              <div className="mt-4 flex items-center justify-between text-[10px] uppercase font-bold tracking-wider text-muted-foreground">
                <span>Ordem: {group.sort_order}</span>
                <span className={group.is_visible ? "text-primary" : "text-muted-foreground"}>
                  {group.is_visible ? "Visível" : "Oculto"}
                </span>
              </div>
            </article>
          ))
        )}
      </div>

      <Dialog open={!!editingGroup} onOpenChange={(open) => !open && setEditingGroup(null)}>
        <DialogContent className="rounded-3xl border-none shadow-2xl max-w-md">
          <DialogHeader>
            <DialogTitle>{editingGroup?.id ? "Editar Grupo" : "Novo Grupo"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Nome do Grupo</Label>
              <Input 
                value={editingGroup?.name || ""} 
                onChange={e => setEditingGroup({...editingGroup, name: e.target.value})}
                placeholder="Ex: Hospedagem Cloud"
                className="rounded-xl"
              />
            </div>
            <div className="space-y-2">
              <Label>Descrição</Label>
              <Textarea 
                value={editingGroup?.description || ""} 
                onChange={e => setEditingGroup({...editingGroup, description: e.target.value})}
                placeholder="Uma breve descrição do que este grupo contém"
                className="rounded-xl"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Ordem</Label>
                <Input 
                  type="number"
                  value={editingGroup?.sort_order || 0} 
                  onChange={e => setEditingGroup({...editingGroup, sort_order: Number(e.target.value)})}
                  className="rounded-xl"
                />
              </div>
              <div className="flex items-center justify-between pt-8 px-2">
                <Label>Visível</Label>
                <Switch 
                  checked={editingGroup?.is_visible || false} 
                  onCheckedChange={val => setEditingGroup({...editingGroup, is_visible: val})}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setEditingGroup(null)} className="rounded-xl">Cancelar</Button>
            <Button onClick={handleSave} disabled={mutation.isPending} className="rounded-xl bg-primary text-primary-foreground hover:bg-primary/90">
              {mutation.isPending ? "Salvando..." : "Salvar Grupo"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
