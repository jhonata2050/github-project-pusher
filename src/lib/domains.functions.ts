import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const checkDomainWhois = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: unknown) => z.object({ query: z.string().min(2) }).parse(data))
  .handler(async ({ data }) => {
    const { searchDomainWithSuggestions } = await import("./whois.server");
    return searchDomainWithSuggestions(data.query);
  });

export const getDomainSettings = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async () => {
    const { getDomainRegistrarSettings } = await import("./domains.server");
    return getDomainRegistrarSettings();
  });

export const saveDomainSettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: unknown) => z.object({
    defaultRegistrar: z.string(),
    openproviderUsername: z.string().optional(),
    openproviderPassword: z.string().optional(),
    openproviderTestMode: z.boolean().optional(),
    resellerclubUserid: z.string().optional(),
    resellerclubApikey: z.string().optional(),
    resellerclubTestMode: z.boolean().optional(),
    defaultNs1: z.string().optional(),
    defaultNs2: z.string().optional(),
    defaultNs3: z.string().optional(),
    defaultNs4: z.string().optional(),
    pricingList: z.array(z.any()).optional(),
  }).parse(data))
  .handler(async ({ data }) => {
    const { saveDomainRegistrarSettings } = await import("./domains.server");
    return saveDomainRegistrarSettings(data);
  });

export const getDomainPricing = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async () => {
    const { getDomainPricingList } = await import("./domains.server");
    return getDomainPricingList();
  });

export const saveDomainPricing = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: unknown) => z.object({ tlds: z.array(z.any()) }).parse(data))
  .handler(async ({ data }) => {
    const { saveDomainPricingList } = await import("./domains.server");
    return saveDomainPricingList(data.tlds);
  });

export const getMyDomains = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { getClientDomainsList } = await import("./domains.server");
    return getClientDomainsList(context.supabase, context.userId);
  });

export const getDomainDetails = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .validator((data: unknown) => z.object({ domainId: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    const { getDomainDetailsById } = await import("./domains.server");
    return getDomainDetailsById(context.supabase, context.userId, data.domainId);
  });

export const updateDomainNameservers = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: unknown) => z.object({
    domainId: z.string().uuid(),
    nameservers: z.array(z.string()).min(2),
  }).parse(data))
  .handler(async ({ data, context }) => {
    const { updateDomainNameserversById } = await import("./domains.server");
    return updateDomainNameserversById(context.supabase, context.userId, data.domainId, data.nameservers);
  });

export const toggleDomainLock = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: unknown) => z.object({
    domainId: z.string().uuid(),
    isLocked: z.boolean(),
  }).parse(data))
  .handler(async ({ data, context }) => {
    const { toggleDomainTransferLock } = await import("./domains.server");
    return toggleDomainTransferLock(context.supabase, context.userId, data.domainId, data.isLocked);
  });

export const getDomainAuthCode = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .validator((data: unknown) => z.object({ domainId: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    const { getDomainEPPCode } = await import("./domains.server");
    return getDomainEPPCode(context.supabase, context.userId, data.domainId);
  });

export const toggleDomainAutoRenew = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: unknown) => z.object({
    domainId: z.string().uuid(),
    autoRenew: z.boolean(),
  }).parse(data))
  .handler(async ({ data, context }) => {
    const { toggleDomainAutoRenewSetting } = await import("./domains.server");
    return toggleDomainAutoRenewSetting(context.supabase, context.userId, data.domainId, data.autoRenew);
  });

export const requestDomainOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: unknown) => z.object({
    domainName: z.string(),
    periodYears: z.number().default(1),
  }).parse(data))
  .handler(async ({ data, context }) => {
    const { orderDomainRegistration } = await import("./domains.server");
    return orderDomainRegistration(context.userId, data.domainName, data.periodYears);
  });
