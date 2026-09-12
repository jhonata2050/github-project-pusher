import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Database } from "@/integrations/supabase/types";

export const getAllProducts = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
    if (!isAdmin) throw new Error("Unauthorized");

    const { data, error } = await context.supabase
      .from("products")
      .select("id, name, product_type, directadmin_package")
      .order("name");

    if (error) {
      console.warn("[getAllProducts] Warning:", error.message);
      return [];
    }
    return data ?? [];
  });


export const getProductGroups = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    // Public routes use this, but authenticated ones also do.
    // If it's a security risk to list all groups to any client, we should restrict.
    // However, product groups are usually public.
    const { data, error } = await context.supabase
      .from("product_groups")
      .select("*")
      .order("sort_order");

    if (error) throw new Error(error.message);
    return data;
  });

export const createProductGroup = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => 
    z.object({
      name: z.string().min(1),
      description: z.string().nullable(),
      sort_order: z.number().default(0),
      is_visible: z.boolean().default(true)
    }).parse(data)
  )
  .handler(async ({ data: input, context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
    if (!isAdmin) throw new Error("Unauthorized");

    const { data, error } = await supabaseAdmin
      .from("product_groups")
      .insert({
        name: input.name,
        slug: input.name.toLowerCase().replace(/\s+/g, '-'),
        description: input.description,
        sort_order: input.sort_order,
        is_visible: input.is_visible
      })
      .select()
      .single();

    if (error) throw new Error(error.message);
    return data;
  });

export const updateProductGroup = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => 
    z.object({
      id: z.string().uuid(),
      name: z.string().min(1),
      description: z.string().nullable(),
      sort_order: z.number(),
      is_visible: z.boolean()
    }).parse(data)
  )
  .handler(async ({ data: input, context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
    if (!isAdmin) throw new Error("Unauthorized");

    const { data, error } = await supabaseAdmin
      .from("product_groups")
      .update({
        name: input.name,
        slug: input.name.toLowerCase().replace(/\s+/g, '-'),
        description: input.description,
        sort_order: input.sort_order,
        is_visible: input.is_visible
      })
      .eq("id", input.id)
      .select()
      .single();

    if (error) throw new Error(error.message);
    return data;
  });

export const deleteProductGroup = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.string().uuid().parse(data))
  .handler(async ({ data: groupId, context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
    if (!isAdmin) throw new Error("Unauthorized");

    // Verificar se há produtos no grupo
    const { count, error: countError } = await context.supabase
      .from("products")
      .select("id", { count: 'exact', head: true })
      .eq("group_id", groupId);

    if (countError) throw new Error(countError.message);
    if (count && count > 0) {
      throw new Error("Não é possível excluir um grupo que contém produtos.");
    }

    const { error } = await supabaseAdmin
      .from("product_groups")
      .delete()
      .eq("id", groupId);

    if (error) throw new Error(error.message);
    return { success: true };
  });

export const createProduct = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => 
    z.object({
      name: z.string(),
      slug: z.string(),
      group_id: z.string().uuid(),
      description: z.string().nullable(),
      product_type: z.string().default("hosting"),
      directadmin_package: z.string().nullable(),
      external_id: z.string().nullable(),
      is_visible: z.boolean().default(true),
      sort_order: z.number().default(0),
      disk_quota_mb: z.number().nullable().optional(),
      immediate_purchase: z.boolean().optional(),
      prices: z.array(z.object({
        cycle: z.enum(["monthly", "quarterly", "semiannually", "annually", "biennially"]),
        price: z.number(),
        is_active: z.boolean()
      }))
    }).parse(data)
  )
  .handler(async ({ data: input, context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
    if (!isAdmin) throw new Error("Unauthorized");

    const { data: product, error: prodError } = await context.supabase
      .from("products")
      .insert({
        name: input.name,
        slug: input.slug,
        group_id: input.group_id,
        description: input.description,
        product_type: input.product_type,
        directadmin_package: input.directadmin_package || null,
        is_visible: input.is_visible,
        sort_order: input.sort_order,
        disk_quota_mb: input.disk_quota_mb || null,
        is_featured: false
      })
      .select()
      .single();

    if (prodError) throw new Error(prodError.message);

    const pricesToInsert = input.prices.map((p: any) => ({
      product_id: product.id,
      cycle: p.cycle,
      price: p.price,
      is_active: p.is_active
    }));

    const { error: priceError } = await context.supabase
      .from("product_prices")
      .insert(pricesToInsert);

    if (priceError) throw new Error(priceError.message);

    return product;
  });

export const updateProduct = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => 
    z.object({
      id: z.string(),
      name: z.string(),
      group_id: z.string().uuid(),
      product_type: z.string(),
      description: z.string().nullable(),
      directadmin_package: z.string().nullable(),
      external_id: z.string().nullable(),
      is_visible: z.boolean(),
      sort_order: z.number(),
      disk_quota_mb: z.number().nullable(),
      immediate_purchase: z.boolean().optional(),
      prices: z.array(z.object({
        cycle: z.enum(["monthly", "quarterly", "semiannually", "annually", "biennially"]),
        price: z.number(),
        is_active: z.boolean()
      }))
    }).parse(data)
  )
  .handler(async ({ data: input, context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
    if (!isAdmin) throw new Error("Unauthorized");

    const { error: prodError } = await context.supabase
      .from("products")
      .update({
        name: input.name,
        group_id: input.group_id,
        product_type: input.product_type,
        description: input.description,
        directadmin_package: input.directadmin_package || null,
        is_visible: input.is_visible,
        sort_order: input.sort_order,
        disk_quota_mb: input.disk_quota_mb
      })
      .eq("id", input.id);

    if (prodError) throw new Error(prodError.message);

    // Update prices - delete and re-insert for simplicity in this turn
    await context.supabase
      .from("product_prices")
      .delete()
      .eq("product_id", input.id);

    const pricesToInsert = input.prices.map((p: any) => ({
      product_id: input.id,
      cycle: p.cycle,
      price: p.price,
      is_active: p.is_active
    }));

    const { error: priceError } = await context.supabase
      .from("product_prices")
      .insert(pricesToInsert);

    if (priceError) throw new Error(priceError.message);

    return { success: true, id: input.id };
  });

