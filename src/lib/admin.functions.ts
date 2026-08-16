import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { BrandingSettings } from "./branding";

export type { BrandingSettings };

export const getBranding = createServerFn({ method: "GET" }).handler(async () => {
  try {
    const { getBrandingImplementation } = await import("./admin.server");
    return await getBrandingImplementation();
  } catch (error) {
    console.error("Error in getBranding server function:", error);
    return {
      logo_url: null,
      app_name: "HostPanel",
      primary_color: "oklch(0.88 0.19 128)",
      brand_color: "oklch(0.72 0.19 148)",
      favicon_url: null,
    };
  }
});

export const updateBranding = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: any) => data)
  .handler(async ({ data, context }) => {
    try {
      const { updateBrandingImplementation } = await import("./admin.server");
      // Passamos o contexto completo que contém supabase, userId e claims
      const result = await updateBrandingImplementation(data.data, context);
      return result;
    } catch (error) {
      console.error("Error in updateBranding server function:", error);
      throw error;
    }
  });

export const impersonateClient = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ clientId: z.string().uuid() }).parse(data))
  .handler(async ({ data }) => {
    return { success: true, clientId: data.clientId };
  });

export const updateClientProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({
        id: z.string().uuid(),
        full_name: z.string().optional(),
        company_name: z.string().optional(),
        tax_id: z.string().optional(),
        phone: z.string().optional(),
        address_line: z.string().optional(),
        city: z.string().optional(),
        state: z.string().optional(),
        postal_code: z.string().optional(),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    const { updateClientProfileImplementation } = await import("./admin.server");
    return updateClientProfileImplementation(data, context);
  });

export const bulkDeleteClients = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z.object({ clientIds: z.array(z.string().uuid()) }).parse(data),
  )
  .handler(async ({ data, context }) => {
    const { bulkDeleteClientsImplementation } = await import("./admin.server");
    return bulkDeleteClientsImplementation(data.clientIds, context);
  });
