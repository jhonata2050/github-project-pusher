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
      logo_url: "/images/logo-branco.webp",
      app_name: "Eqsam",
      primary_color: "oklch(0.88 0.19 128)",
      brand_color: "oklch(0.72 0.19 148)",
      favicon_url: "/images/logo.png",
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
        email: z.string().email().optional(),
        full_name: z.string().optional(),
        company_name: z.string().optional(),
        tax_id: z.string().optional(),
        identification_type: z.string().optional(),
        country: z.string().optional(),
        phone: z.string().optional(),
        address_line: z.string().optional(),
        address_line2: z.string().optional(),
        city: z.string().optional(),
        state: z.string().optional(),
        postal_code: z.string().optional(),
        status: z.string().optional(),
        notes: z.string().optional(),
        block_directadmin: z.boolean().optional(),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    const { updateClientProfileImplementation } = await import("./admin.server");
    return updateClientProfileImplementation(data, context);
  });

export const adminChangeUserPassword = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({
        userId: z.string().uuid(),
        newPassword: z.string().min(6),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    const { adminChangeUserPasswordImplementation } = await import("./admin.server");
    return adminChangeUserPasswordImplementation(data, context);
  });

export const adminSendPasswordReset = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({
        userId: z.string().uuid(),
        email: z.string().email(),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    const { adminSendPasswordResetImplementation } = await import("./admin.server");
    return adminSendPasswordResetImplementation(data, context);
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

