export const brl = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

// Helper to convert color strings (hex, rgb, oklch) to RGB array
export function parseColorToRGB(
  colorStr?: string,
  defaultRGB: [number, number, number] = [30, 41, 59]
): [number, number, number] {
  if (!colorStr) return defaultRGB;

  // Hex format #RRGGBB
  if (colorStr.startsWith("#")) {
    const hex = colorStr.replace("#", "");
    if (hex.length === 6) {
      const r = parseInt(hex.substring(0, 2), 16);
      const g = parseInt(hex.substring(2, 4), 16);
      const b = parseInt(hex.substring(4, 6), 16);
      if (!isNaN(r) && !isNaN(g) && !isNaN(b)) return [r, g, b];
    }
  }

  // RGB format rgb(r, g, b)
  if (colorStr.startsWith("rgb")) {
    const parts = colorStr.replace(/rgba?\(|\)/g, "").split(",");
    if (parts.length >= 3) {
      const p0 = parts[0] ?? "0";
      const p1 = parts[1] ?? "0";
      const p2 = parts[2] ?? "0";
      const r = parseInt(p0.trim(), 10);
      const g = parseInt(p1.trim(), 10);
      const b = parseInt(p2.trim(), 10);
      if (!isNaN(r) && !isNaN(g) && !isNaN(b)) return [r, g, b];
    }
  }

  // Se for o verde característico Eqsam / Tailwind Lime/Emerald
  if (
    colorStr.includes("148") ||
    colorStr.includes("128") ||
    colorStr.includes("lime") ||
    colorStr.includes("brand")
  ) {
    return [101, 163, 13]; // lime-600 #65a30d
  }

  return defaultRGB;
}

// Load image helper
export async function loadImageAsBase64(url: string): Promise<string | null> {
  return new Promise((resolve) => {
    try {
      const img = new Image();
      img.crossOrigin = "Anonymous";
      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = img.naturalWidth || img.width;
        canvas.height = img.naturalHeight || img.height;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          resolve(null);
          return;
        }
        ctx.drawImage(img, 0, 0);
        resolve(canvas.toDataURL("image/png"));
      };
      img.onerror = () => resolve(null);
      img.src = url;
    } catch {
      resolve(null);
    }
  });
}
