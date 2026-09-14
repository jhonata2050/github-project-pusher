import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Package, Store } from "lucide-react";
import { useEffect, useState } from "react";

import { AppShell } from "@/components/app/AppShell";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { updateProduct, createProduct, getServers, getDAPackagesList, getProductGroups } from "@/lib/support.functions";
import { toast } from "sonner";
import {
  ProductCard,
  ProductsHeader,
  ProductEditDialog,
  type EditingProduct,
  type ProductItem,
} from "@/components/admin/products";

export const Route = createFileRoute("/_authenticated/admin/products")({
  head: () => ({
    meta: [
      { title: "Produtos e planos — Eqsam" },
      {
        name: "description",
        content: "Gerencie os planos de hospedagem, pacotes do DirectAdmin e preços por ciclo de cobrança.",
      },
    ],
  }),
  component: ProductsPage,
});

function ProductsPage() {
  const [term, setTerm] = useState("");
  const [editingProduct, setEditingProduct] = useState<EditingProduct | null>(null);
  const [selectedServer, setSelectedServer] = useState<string>("");
  const queryClient = useQueryClient();

  const products = useQuery({
    queryKey: ["admin-products"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select(
          "id, name, slug, description, directadmin_package, disk_quota_mb, is_visible, sort_order, product_type, group_id, product_groups(name), product_prices(cycle, price, is_active)",
        )
        .neq("product_type", "vps")
        .order("sort_order");
      if (error) throw error;
      return data as ProductItem[];
    },
  });

  const productGroups = useQuery({
    queryKey: ["admin-product-groups"],
    queryFn: () => getProductGroups(),
    staleTime: 1000 * 60 * 15,
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

  // Seleciona automaticamente o primeiro servidor disponível
  useEffect(() => {
    if (!selectedServer && servers.data && servers.data.length > 0) {
      setSelectedServer((servers.data as any[])[0].id);
    }
  }, [servers.data, selectedServer]);

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

  const handleEdit = (product: ProductItem) => {
    setEditingProduct({
      ...product,
      description: product.description || "",
      directadmin_package: product.directadmin_package || "",
      external_id: (product as any).external_id || "",
      is_visible: product.is_visible ?? true,
      sort_order: product.sort_order ?? 0,
      immediate_purchase: !!product.immediate_purchase,
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
      immediate_purchase: false,
      prices: []
    });
  };

  const handleSave = () => {
    if (!editingProduct) return;
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
      immediate_purchase: editingProduct.immediate_purchase,
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
      <ProductsHeader
        term={term}
        setTerm={setTerm}
        onCreate={handleCreate}
      />

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
          {filtered.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              onEdit={handleEdit}
            />
          ))}
        </div>
      )}

      <ProductEditDialog
        editingProduct={editingProduct}
        setEditingProduct={setEditingProduct}
        selectedServer={selectedServer}
        setSelectedServer={setSelectedServer}
        productGroups={productGroups.data}
        servers={servers.data}
        daPackages={daPackages}
        onSave={handleSave}
        isSaving={updateMutation.isPending}
      />

      <p className="mt-8 text-xs text-muted-foreground">
        Precisa ver a loja pública? <Link to="/" className="text-brand underline">Abrir catálogo</Link>
      </p>
    </AppShell>
  );
}
