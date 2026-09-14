import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const updateApplicationDomain = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: unknown) =>
    z.object({
      appId: z.string(),
      domain: z.string().min(3),
    }).parse(data)
  )
  .handler(async ({ data, context }) => {
    const { updateCloudApplicationDomain } = await import("../../cloud-apps.server");
    return updateCloudApplicationDomain(data.appId, data.domain, context.userId);
  });

export const resetApplicationDomain = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: unknown) =>
    z.object({
      appId: z.string(),
    }).parse(data)
  )
  .handler(async ({ data, context }) => {
    const { resetCloudApplicationDomain } = await import("../../cloud-apps.server");
    return resetCloudApplicationDomain(data.appId, context.userId);
  });

export const verifyApplicationDomainDns = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: unknown) =>
    z.object({
      domain: z.string().min(2),
    }).parse(data)
  )
  .handler(async ({ data }) => {
    const { verifyApplicationDomainDns } = await import("../../cloud-apps.server");
    return verifyApplicationDomainDns(data.domain);
  });

export const applyTemplateToApp = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: unknown) =>
    z.object({
      appId: z.string(),
      template: z.object({
        id: z.string().optional(),
        template_id: z.string().optional(),
        git_repository: z.string().url(),
        git_branch: z.string().min(1),
        build_pack: z.enum(["nixpacks", "dockerfile", "dockercompose", "static"]),
        default_envs: z.array(z.object({ key: z.string(), value: z.string() })).optional(),
        default_port: z.number().optional(),
        name: z.string().optional(),
      }),
    }).parse(data)
  )
  .handler(async ({ data, context }) => {
    const { applyTemplateToApplication } = await import("../../cloud-apps.server");
    return applyTemplateToApplication(data.appId, data.template, context.userId);
  });

export const deployApplicationFromGit = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: unknown) =>
    z.object({
      appId: z.string(),
      gitRepository: z.string().min(3),
      gitBranch: z.string().optional(),
      resetContainer: z.boolean().optional(),
    }).parse(data)
  )
  .handler(async ({ data, context }) => {
    const { deployCloudApplicationFromGit } = await import("../../cloud-apps.server");
    return deployCloudApplicationFromGit(data, context.userId);
  });

export const getDeploymentStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .validator((data: unknown) =>
    z.object({
      deploymentUuid: z.string().min(1),
    }).parse(data)
  )
  .handler(async ({ data, context }) => {
    const { getCloudDeploymentStatus } = await import("../../cloud-apps.server");
    return getCloudDeploymentStatus(data.deploymentUuid, context.userId);
  });
