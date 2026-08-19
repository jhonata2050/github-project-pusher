import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export const getOSOptions = createServerFn({ method: "GET" })
  .handler(async () => {
    return [
      { id: "ubuntu-22-04", name: "Ubuntu 22.04 LTS" },
      { id: "ubuntu-24-04", name: "Ubuntu 24.04 LTS" },
      { id: "debian-12", name: "Debian 12" },
      { id: "centos-7", name: "CentOS 7" },
      { id: "almalinux-9", name: "AlmaLinux 9" },
      { id: "windows-2022", name: "Windows Server 2022" },
    ];
  });

export const getLocations = createServerFn({ method: "GET" })
  .handler(async () => {
    return [
      { id: "us-east", name: "EUA - Leste (Nova York)" },
      { id: "us-west", name: "EUA - Oeste (Los Angeles)" },
      { id: "br-sp", name: "Brasil - São Paulo" },
      { id: "eu-ger", name: "Europa - Alemanha" },
    ];
  });

const BLOCKED_DOMAINS = [
  "eqsam.com",
  "eqsam.com.br",
  "google.com",
  "google.com.br",
  "whatsapp.com",
  "facebook.com",
  "instagram.com",
  "admin.com",
  "hostboss.com",
];

export const validateDomain = createServerFn({ method: "POST" })
  .inputValidator((data) => z.object({ domain: z.string() }).parse(data))
  .handler(async ({ data }) => {
    const domain = data.domain.toLowerCase().trim();

    // 1. Check blocked terms
    const isBlocked = BLOCKED_DOMAINS.some(blocked => 
      domain === blocked || domain.endsWith("." + blocked) || domain.includes("eqsam")
    );
    
    if (isBlocked) {
      // Monitoramento: Registrar tentativa de uso de domínio bloqueado
      try {
        const { logPublicAuthEvent } = await import("./audit.functions");
        await logPublicAuthEvent({
          data: {
            action: "domain_validation_blocked",
            email: null,
            description: `Tentativa de validar domínio bloqueado: ${domain}`
          }
        });
      } catch (e) {
        console.warn("[Checkout] Falha ao registrar log de auditoria para domínio bloqueado");
      }
      
      return { valid: false, message: "Este domínio é reservado e não pode ser utilizado." };
    }

    // 2. Check if already in use in services table
    const { data: existing, error } = await supabaseAdmin
      .from("services")
      .select("id")
      .eq("domain", domain)
      .maybeSingle();

    if (error) {
      console.error("Error checking domain:", error);
      throw new Error("Erro ao validar domínio");
    }

    if (existing) {
      return { valid: false, message: "Este domínio já está sendo utilizado por outro cliente." };
    }

    return { valid: true };
  });

export const checkEmailExists = createServerFn({ method: "POST" })
  .inputValidator((data) => z.object({ email: z.string().email() }).parse(data))
  .handler(async ({ data }) => {
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("id")
      .eq("email", data.email)
      .maybeSingle();

    return { exists: !!profile };
  });
