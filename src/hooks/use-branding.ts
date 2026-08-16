import { useQuery } from "@tanstack/react-query";
import { getBranding, type BrandingSettings } from "@/lib/admin.functions";
import { useEffect } from "react";

export function useBranding() {
  const { data: branding } = useQuery({
    queryKey: ["branding"],
    queryFn: async () => {
      try {
        const response = await fetch("/api/public/branding");
        if (!response.ok) throw new Error("Failed to fetch branding from API");
        return await response.json();
      } catch (error) {
        console.error("Error fetching branding via public API, falling back to server function:", error);
        return getBranding();
      }
    },
    staleTime: 1000 * 60 * 60, // 1 hora
  });

  const settings: BrandingSettings = branding || {
    logo_url: null,
    app_name: "HostPanel",
    primary_color: "oklch(0.88 0.19 128)",
    brand_color: "oklch(0.72 0.19 148)",
    favicon_url: null,
  };

  useEffect(() => {
    if (typeof document === "undefined") return;

    // Atualiza o título da página se necessário (opcional, o route head cuida disso)
    // document.title = settings.app_name;

    // Atualiza variáveis CSS no :root
    const root = document.documentElement;
    if (settings.primary_color) {
      root.style.setProperty("--primary", settings.primary_color);
    }
    if (settings.brand_color) {
      root.style.setProperty("--brand", settings.brand_color);
    }
    
    // Atualiza favicon
    if (settings.favicon_url) {
      const links = document.querySelectorAll("link[rel*='icon']");
      if (links.length > 0) {
        links.forEach(link => {
          (link as HTMLLinkElement).href = settings.favicon_url!;
        });
      } else {
        const link = document.createElement("link");
        link.rel = "icon";
        link.href = settings.favicon_url;
        document.head.appendChild(link);
      }
    }
  }, [settings]);

  return settings;
}
