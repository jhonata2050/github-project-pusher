import { supabaseAdmin } from "@/integrations/supabase/client.server";

export interface DomainCheckResult {
  domain: string;
  extension: string;
  available: boolean;
  price: number;
  renewPrice?: number;
  periodYears?: number;
  expiresAt?: string | null;
  nameservers?: string[];
  statusText?: string;
  suggestion?: boolean;
}

const DEFAULT_PRICING: Record<string, { cost: number; price: number; renew: number }> = {
  ".com.br": { cost: 40.00, price: 59.90, renew: 59.90 },
  ".com": { cost: 55.00, price: 69.90, renew: 69.90 },
  ".net": { cost: 65.00, price: 79.90, renew: 79.90 },
  ".org": { cost: 65.00, price: 79.90, renew: 79.90 },
  ".site": { cost: 15.00, price: 29.90, renew: 59.90 },
  ".online": { cost: 15.00, price: 29.90, renew: 69.90 },
  ".store": { cost: 20.00, price: 39.90, renew: 79.90 },
  ".tech": { cost: 30.00, price: 49.90, renew: 89.90 },
  ".io": { cost: 220.00, price: 289.90, renew: 289.90 },
  ".app": { cost: 80.00, price: 99.90, renew: 99.90 },
  ".dev": { cost: 80.00, price: 99.90, renew: 99.90 },
};

/**
 * Consulta a disponibilidade de um domínio específico via RDAP (Registro.br / ICANN)
 */
export async function checkSingleDomain(domainName: string): Promise<DomainCheckResult> {
  const cleanDomain = domainName.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/.*$/, '');
  
  // Extrair extensão
  let extension = "";
  if (cleanDomain.endsWith(".com.br")) {
    extension = ".com.br";
  } else if (cleanDomain.includes(".")) {
    extension = "." + cleanDomain.split(".").slice(1).join(".");
  } else {
    extension = ".com.br";
  }

  // Obter preço configurado no sistema ou fallback
  let price = DEFAULT_PRICING[extension]?.price || 69.90;
  let renewPrice = DEFAULT_PRICING[extension]?.renew || price;

  try {
    const { data: dbPricing } = await supabaseAdmin
      .from("system_settings")
      .select("value")
      .eq("key", `domain_pricing_${extension}`)
      .maybeSingle();

    if (dbPricing?.value) {
      const parsed = typeof dbPricing.value === "string" ? JSON.parse(dbPricing.value) : dbPricing.value;
      if (parsed.price) price = Number(parsed.price);
      if (parsed.renew) renewPrice = Number(parsed.renew);
    }
  } catch (e) {
    // fallback to defaults
  }

  // 1. Verificação para domínios .br (Registro.br RDAP oficial gratuito)
  if (cleanDomain.endsWith(".br")) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 4000);
      
      const res = await fetch(`https://rdap.registro.br/domain/${cleanDomain}`, {
        signal: controller.signal,
        headers: { "Accept": "application/rdap+json, application/json" }
      });
      clearTimeout(timeout);

      if (res.status === 404) {
        return {
          domain: cleanDomain,
          extension,
          available: true,
          price,
          renewPrice,
          periodYears: 1,
          statusText: "Disponível para registro"
        };
      }

      if (res.ok) {
        const json = await res.json();
        const events = json.events || [];
        const expEvent = events.find((e: any) => e.eventAction === "expiration");
        const nameservers = (json.nameservers || []).map((ns: any) => ns.ldhName || ns.name);

        return {
          domain: cleanDomain,
          extension,
          available: false,
          price,
          renewPrice,
          periodYears: 1,
          expiresAt: expEvent?.eventDate || null,
          nameservers,
          statusText: "Já registrado"
        };
      }
    } catch (e: any) {
      console.warn(`[Whois] Falha no RDAP Registro.br para ${cleanDomain}:`, e.message);
    }
  }

  // 2. Verificação para domínios internacionais via RDAP.org / DNS
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4500);

    const res = await fetch(`https://rdap.org/domain/${cleanDomain}`, {
      signal: controller.signal,
      headers: { "Accept": "application/rdap+json, application/json" }
    });
    clearTimeout(timeout);

    if (res.status === 404) {
      return {
        domain: cleanDomain,
        extension,
        available: true,
        price,
        renewPrice,
        periodYears: 1,
        statusText: "Disponível para registro"
      };
    }

    if (res.ok) {
      const json = await res.json();
      const events = json.events || [];
      const expEvent = events.find((e: any) => e.eventAction === "expiration");
      const nameservers = (json.nameservers || []).map((ns: any) => ns.ldhName || ns.name);

      return {
        domain: cleanDomain,
        extension,
        available: false,
        price,
        renewPrice,
        periodYears: 1,
        expiresAt: expEvent?.eventDate || null,
        nameservers,
        statusText: "Já registrado"
      };
    }
  } catch (e: any) {
    console.warn(`[Whois] Falha no RDAP genérico para ${cleanDomain}:`, e.message);
  }

  // Fallback via Cloudflare DNS-over-HTTPS (Se possui registros NS, está ocupado)
  try {
    const dnsRes = await fetch(`https://cloudflare-dns.com/dns-query?name=${cleanDomain}&type=NS`, {
      headers: { "Accept": "application/dns-json" }
    });
    if (dnsRes.ok) {
      const dnsJson = await dnsRes.json();
      const hasRecords = dnsJson.Answer && dnsJson.Answer.length > 0;
      return {
        domain: cleanDomain,
        extension,
        available: !hasRecords,
        price,
        renewPrice,
        periodYears: 1,
        statusText: hasRecords ? "Já registrado" : "Disponível para registro"
      };
    }
  } catch (e) {
    // Ignora
  }

  return {
    domain: cleanDomain,
    extension,
    available: false,
    price,
    renewPrice,
    periodYears: 1,
    statusText: "Status desconhecido"
  };
}

/**
 * Consulta de Domínio com Sugestões de Extensões Múltiplas
 */
export async function searchDomainWithSuggestions(query: string) {
  let clean = query.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/.*$/, '');
  let baseName = clean;

  // Remover extensão conhecida se o usuário digitou
  const knownExts = Object.keys(DEFAULT_PRICING);
  for (const ext of knownExts) {
    if (clean.endsWith(ext)) {
      baseName = clean.substring(0, clean.length - ext.length);
      break;
    }
  }
  // Se ainda tiver ponto
  if (baseName.includes(".")) {
    baseName = baseName.split(".")[0];
  }

  const primaryDomain = clean.includes(".") ? clean : `${clean}.com.br`;
  const primaryResult = await checkSingleDomain(primaryDomain);

  // Lista de extensões para sugestão
  const popularExts = [".com.br", ".com", ".net", ".site", ".store", ".online", ".tech"].filter(
    (ext) => !primaryDomain.endsWith(ext)
  );

  const suggestionsPromises = popularExts.slice(0, 5).map(async (ext) => {
    const sugDomain = `${baseName}${ext}`;
    const res = await checkSingleDomain(sugDomain);
    return { ...res, suggestion: true };
  });

  const suggestions = await Promise.all(suggestionsPromises);

  return {
    primary: primaryResult,
    suggestions: suggestions.sort((a, b) => (a.available === b.available ? 0 : a.available ? -1 : 1)),
  };
}
