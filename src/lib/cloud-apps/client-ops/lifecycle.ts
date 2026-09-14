import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const getMyApplications = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .validator((data: unknown) => z.object({ clientId: z.string().uuid().optional() }).optional().parse(data))
  .handler(async ({ data, context }) => {
    const effectiveUserId = data?.clientId || context.userId;
    if (effectiveUserId !== context.userId) {
      const { data: isStaff } = await context.supabase.rpc("is_staff", { _user_id: context.userId });
      if (!isStaff) throw new Error("Acesso negado");
    }
    const { getMyApplications } = await import("../../cloud-apps.server");
    return getMyApplications(effectiveUserId);
  });

export const getApplicationDetails = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .validator((data: unknown) => z.object({ appId: z.string() }).parse(data))
  .handler(async ({ data, context }) => {
    const { getCloudApplicationDetails } = await import("../../cloud-apps.server");
    return getCloudApplicationDetails(data.appId, context.userId);
  });

export const executeAppAction = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: unknown) =>
    z.object({
      appId: z.string(),
      action: z.enum(["start", "stop", "restart", "deploy"]),
    }).parse(data)
  )
  .handler(async ({ data, context }) => {
    const { executeCloudAppAction } = await import("../../cloud-apps.server");
    return executeCloudAppAction(data.appId, data.action, context.userId);
  });

export const triggerApplicationAction = executeAppAction;

export const resetCloudApp = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: unknown) =>
    z.object({
      appId: z.string(),
    }).parse(data)
  )
  .handler(async ({ data, context }) => {
    const { resetCloudApplication } = await import("../../cloud-apps.server");
    return resetCloudApplication(data.appId, context.userId);
  });

export const getApplicationLogs = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .validator((data: unknown) => z.object({ appId: z.string() }).parse(data))
  .handler(async ({ data, context }) => {
    const { getCloudApplicationLogs } = await import("../../cloud-apps.server");
    return getCloudApplicationLogs(data.appId, context.userId);
  });

export const getApplicationEnvs = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .validator((data: unknown) => z.object({ appId: z.string() }).parse(data))
  .handler(async ({ data, context }) => {
    const { getCloudApplicationEnvs } = await import("../../cloud-apps.server");
    return getCloudApplicationEnvs(data.appId, context.userId);
  });

export const saveApplicationEnvs = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: unknown) =>
    z.object({
      appId: z.string(),
      envs: z.array(
        z.object({
          key: z.string().min(1),
          value: z.string(),
          is_build_time: z.boolean().optional(),
          is_literal: z.boolean().optional(),
        })
      ),
    }).parse(data)
  )
  .handler(async ({ data, context }) => {
    const { saveCloudApplicationEnvs } = await import("../../cloud-apps.server");
    return saveCloudApplicationEnvs(data.appId, data.envs, context.userId);
  });

export const updateApplicationName = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: unknown) =>
    z.object({
      appId: z.string(),
      name: z.string().trim().min(1, "Nome da aplicação é obrigatório"),
    }).parse(data)
  )
  .handler(async ({ data, context }) => {
    const { updateCloudApplicationName } = await import("../../cloud-apps.server");
    return updateCloudApplicationName(data.appId, data.name, context.userId);
  });
