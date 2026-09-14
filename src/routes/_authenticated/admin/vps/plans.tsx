import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Monitor, Cpu } from "lucide-react";
import { useState } from "react";
import { AppShell } from "@/components/app/AppShell";
import { supabase } from "@/integrations/supabase/client";
import { updateProduct, createProduct, getProductGroups } from "@/lib/support.functions";
import { getContaboPlansFn } from "@/lib/vps-admin.functions";
import { toast } from "sonner";
import {
  VPSPlansHeader,
  VPSPlansList,
  VPSPlanEditDialog,
  type VPSPlan,
  type EditingVPSPlan,
} from "@/components/admin/vps/plans";

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

function VPSPlansPage() {
  const [term, setTerm] = useState("");
  const [editing, setEditing] = useState<EditingVPSPlan | null>(null);
  const queryClient = useQueryClient();

  const plans = useQuery({
    queryKey: ["admin-vps-plans"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select(
          "id, name, slug, description, disk_quota_mb, bandwidth_quota_mb, is_visible, sort_order, product_type, group_id, product_groups(name), product_prices(cycle, price, is_active)",
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

  const filtered = ((plans.data as VPSPlan[] | null) ?? []).filter((p: VPSPlan) =>
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

  const handleEdit = (plan: VPSPlan) => {
    setEditing({
      ...plan,
      product_type: "vps",
      external_id: plan.external_id || "",
      immediate_purchase: !!plan.immediate_purchase,
      prices: (plan.product_prices as any[]) || [],
    });
  };

  const handleSave = () => {
    if (!editing?.name?.trim()) {
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
      <VPSPlansHeader
        term={term}
        onTermChange={setTerm}
        onCreate={handleCreate}
      />

      <VPSPlansList
        plans={filtered}
        isLoading={plans.isLoading}
        onEdit={handleEdit}
      />

      <VPSPlanEditDialog
        editing={editing}
        onClose={() => setEditing(null)}
        onSave={handleSave}
        isSaving={saveMutation.isPending}
        productGroups={productGroups.data}
        contaboPlans={contaboPlans.data}
        isLoadingContabo={contaboPlans.isLoading}
        onChange={setEditing}
      />
    </AppShell>
  );
}
