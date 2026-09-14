import { getContaboToken } from "./auth.server";

export async function getContaboProductTypes() {
  try {
    const token = await getContaboToken();
    console.log("[Contabo] Buscando catálogo de produtos via /v1/products...");

    // O endpoint /v1/compute/instances/products está retornando 400 (instanceId missing)
    // na API atual da Contabo. Usaremos o endpoint global /v1/products que funciona.
    const res = await fetch("https://api.contabo.com/v1/products?size=100", {
      headers: {
        Authorization: `Bearer ${token}`,
        "x-request-id": crypto.randomUUID(),
      },
    });

    if (!res.ok) {
      const errorText = await res.text().catch(() => "Unknown error");
      console.error(`[Contabo] Erro ao buscar produtos (${res.status}):`, errorText);
      throw new Error(`Falha ao buscar tipos de produtos na Contabo (${res.status}): ${errorText}`);
    }

    const response = await res.json();
    const allProducts = response.data || [];

    // Mapear e categorizar produtos
    const categorized: Record<string, any[]> = {};

    allProducts.forEach((p: any) => {
      const priceItem = p.priceItem || {};
      const specs = priceItem.specs || [];

      const cpuSpec = specs.find(
        (s: any) => s.type === "cpu" || s.title?.toLowerCase().includes("cpu")
      );
      const ramSpec = specs.find(
        (s: any) => s.type === "ram" || s.title?.toLowerCase().includes("ram")
      );
      const diskSpec = specs.find(
        (s: any) =>
          s.type === "storage" ||
          s.title?.toLowerCase().includes("ssd") ||
          s.title?.toLowerCase().includes("nvme") ||
          s.title?.toLowerCase().includes("disk")
      );

      const ramTitle = ramSpec?.title || "";
      const ramMbMatch = ramTitle.match(/(\d+)\s*GB/i);
      const ramMb = ramMbMatch ? parseInt(ramMbMatch[1]) * 1024 : 0;

      const product = {
        productId: priceItem.itemId || priceItem.key,
        name: priceItem.name,
        vCpu: cpuSpec?.title || "N/A",
        ramMb: ramMb,
        ramTitle: ramTitle || "N/A",
        diskGb: diskSpec?.title || "N/A",
      };

      if (!product.productId || !product.name) return;

      // Determinar categoria pelo nome
      let category = "Outros";
      const name = product.name.toLowerCase();
      if (name.includes("vds")) category = "VDS (Dedicated Servers)";
      else if (name.includes("vps") && name.includes("storage")) category = "Storage VPS";
      else if (name.includes("vps")) category = "Cloud VPS";

      if (!categorized[category]) categorized[category] = [];
      categorized[category]?.push(product);
    });

    // Converter para array ordenado por categoria
    const result = Object.entries(categorized)
      .map(([category, items]) => ({
        category,
        items: items.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true })),
      }))
      .sort((a, b) => a.category.localeCompare(b.category));

    console.log(`[Contabo] ${allProducts.length} produtos processados em ${result.length} categorias.`);
    return result;
  } catch (err: any) {
    console.error("[Contabo] Exceção em getContaboProductTypes:", err.message);
    throw err;
  }
}
