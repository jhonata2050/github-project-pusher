import { useQuery } from "@tanstack/react-query";
import { getBranding, type BrandingSettings } from "@/lib/admin.functions";
import { useEffect } from "react";

export function getContrastForeground(colorStr: string): string {
  if (!colorStr) return "oklch(0.24 0.02 150)";
  const trimmed = colorStr.trim().toLowerCase();

  // Se for OKLCH, ex: oklch(0.5956 0.1011 12) ou oklch(59.56% ...)
  const oklchMatch = trimmed.match(/oklch\(\s*([\d.]+)(%?)/);
  if (oklchMatch && oklchMatch[1]) {
    let l = parseFloat(oklchMatch[1]);
    if (oklchMatch[2] === "%") l = l / 100;
    return l < 0.68 ? "oklch(0.99 0 0)" : "oklch(0.24 0.02 150)";
  }

  // Se for Hex, ex: #b2646f ou #fff
  const hexMatch = trimmed.match(/^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i) ||
                   trimmed.match(/^#?([a-f\d])([a-f\d])([a-f\d])$/i);
  if (hexMatch && hexMatch[1] && hexMatch[2] && hexMatch[3]) {
    const h1 = hexMatch[1];
    const h2 = hexMatch[2];
    const h3 = hexMatch[3];
    const r = h1.length === 1 ? parseInt(h1 + h1, 16) : parseInt(h1, 16);
    const g = h2.length === 1 ? parseInt(h2 + h2, 16) : parseInt(h2, 16);
    const b = h3.length === 1 ? parseInt(h3 + h3, 16) : parseInt(h3, 16);
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    return luminance < 0.60 ? "#ffffff" : "oklch(0.24 0.02 150)";
  }

  return "oklch(0.99 0 0)";
}

export function applyBrandingToDom(settings: BrandingSettings) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;

  if (settings.primary_color) {
    root.style.setProperty("--primary", settings.primary_color);
    root.style.setProperty("--color-primary", settings.primary_color);
    root.style.setProperty("--sidebar-primary", settings.primary_color);
    root.style.setProperty("--ring", settings.primary_color);
    root.style.setProperty("--color-ring", settings.primary_color);

    const fg = getContrastForeground(settings.primary_color);
    root.style.setProperty("--primary-foreground", fg);
    root.style.setProperty("--color-primary-foreground", fg);
    root.style.setProperty("--sidebar-primary-foreground", fg);
  }

  if (settings.brand_color) {
    root.style.setProperty("--brand", settings.brand_color);
    root.style.setProperty("--color-brand", settings.brand_color);

    const fg = getContrastForeground(settings.brand_color);
    root.style.setProperty("--brand-foreground", fg);
    root.style.setProperty("--color-brand-foreground", fg);
  }

  if (settings.favicon_url) {
    const links = document.querySelectorAll("link[rel*='icon']");
    if (links.length > 0) {
      links.forEach((link) => {
        (link as HTMLLinkElement).href = settings.favicon_url!;
      });
    } else {
      const link = document.createElement("link");
      link.rel = "icon";
      link.href = settings.favicon_url;
      document.head.appendChild(link);
    }
  }

  try {
    localStorage.setItem(
      "eqsam_branding",
      JSON.stringify({
        primary_color: settings.primary_color,
        brand_color: settings.brand_color,
      })
    );
  } catch {}
}

export function useBranding() {
  const { data: branding } = useQuery({
    queryKey: ["branding"],
    queryFn: async () => {
      try {
        const response = await fetch(`/api/public/branding?t=${Date.now()}`, { cache: "no-store" });
        if (!response.ok) throw new Error("Failed to fetch branding from API");
        return await response.json();
      } catch (error) {
        console.error("Error fetching branding via public API, falling back to server function:", error);
        return getBranding();
      }
    },
    staleTime: 1000 * 30, // 30 segundos
  });

  const settings: BrandingSettings = {
    logo_url: branding?.logo_url || "/images/logo-branco.webp",
    app_name: branding?.app_name ?? "Eqsam",
    primary_color: branding?.primary_color ?? "oklch(0.88 0.19 128)",
    brand_color: branding?.brand_color ?? "oklch(0.72 0.19 148)",
    favicon_url: branding?.favicon_url || "/images/logo.png",
  };

  useEffect(() => {
    applyBrandingToDom(settings);
  }, [settings.primary_color, settings.brand_color, settings.favicon_url]);

  return settings;
}

