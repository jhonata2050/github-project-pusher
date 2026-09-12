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
    const { getMyApplications } = await import("./cloud-apps.server");
    return getMyApplications(effectiveUserId);
  });

export const getApplicationDetails = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .validator((data: unknown) => z.object({ appId: z.string() }).parse(data))
  .handler(async ({ data, context }) => {
    const { getCloudApplicationDetails } = await import("./cloud-apps.server");
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
    const { executeCloudAppAction } = await import("./cloud-apps.server");
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
    const { resetCloudApplication } = await import("./cloud-apps.server");
    return resetCloudApplication(data.appId, context.userId);
  });

export const getApplicationLogs = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .validator((data: unknown) => z.object({ appId: z.string() }).parse(data))
  .handler(async ({ data, context }) => {
    const { getCloudApplicationLogs } = await import("./cloud-apps.server");
    return getCloudApplicationLogs(data.appId, context.userId);
  });

export const getApplicationEnvs = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .validator((data: unknown) => z.object({ appId: z.string() }).parse(data))
  .handler(async ({ data, context }) => {
    const { getCloudApplicationEnvs } = await import("./cloud-apps.server");
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
    const { saveCloudApplicationEnvs } = await import("./cloud-apps.server");
    return saveCloudApplicationEnvs(data.appId, data.envs, context.userId);
  });

export const updateApplicationDomain = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: unknown) =>
    z.object({
      appId: z.string(),
      domain: z.string().min(3),
    }).parse(data)
  )
  .handler(async ({ data, context }) => {
    const { updateCloudApplicationDomain } = await import("./cloud-apps.server");
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
    const { resetCloudApplicationDomain } = await import("./cloud-apps.server");
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
    const { verifyApplicationDomainDns } = await import("./cloud-apps.server");
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
    const { applyTemplateToApplication } = await import("./cloud-apps.server");
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
    const { deployCloudApplicationFromGit } = await import("./cloud-apps.server");
    return deployCloudApplicationFromGit(data, context.userId);
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
    const { updateCloudApplicationName } = await import("./cloud-apps.server");
    return updateCloudApplicationName(data.appId, data.name, context.userId);
  });

export const getDeploymentStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .validator((data: unknown) =>
    z.object({
      deploymentUuid: z.string().min(1),
    }).parse(data)
  )
  .handler(async ({ data, context }) => {
    const { getCloudDeploymentStatus } = await import("./cloud-apps.server");
    return getCloudDeploymentStatus(data.deploymentUuid, context.userId);
  });

export const getApplicationFiles = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .validator((data: unknown) => z.object({ appId: z.string() }).parse(data))
  .handler(async ({ data, context }) => {
    const { getCloudApplicationFiles } = await import("./cloud-apps.server");
    return getCloudApplicationFiles(data.appId, context.userId);
  });

export const saveApplicationFile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: unknown) =>
    z.object({
      appId: z.string(),
      filePath: z.string().min(1),
      content: z.string(),
    }).parse(data)
  )
  .handler(async ({ data, context }) => {
    const { saveCloudApplicationFile } = await import("./cloud-apps.server");
    return saveCloudApplicationFile(data.appId, data.filePath, data.content, context.userId);
  });

export const saveApplicationFilesBatch = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: unknown) =>
    z.object({
      appId: z.string(),
      files: z.array(z.object({ path: z.string().min(1), content: z.string() })),
    }).parse(data)
  )
  .handler(async ({ data, context }) => {
    const { saveCloudApplicationFilesBatch } = await import("./cloud-apps.server");
    return saveCloudApplicationFilesBatch(data.appId, data.files, context.userId);
  });

export const deleteApplicationFile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: unknown) =>
    z.object({
      appId: z.string(),
      filePath: z.string().min(1),
    }).parse(data)
  )
  .handler(async ({ data, context }) => {
    const { deleteCloudApplicationFile } = await import("./cloud-apps.server");
    return deleteCloudApplicationFile(data.appId, data.filePath, context.userId);
  });

export const uploadApplicationZip = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: unknown) =>
    z.object({
      appId: z.string(),
      fileName: z.string(),
      zipBase64: z.string(),
      autoExtract: z.boolean().default(true),
    }).parse(data)
  )
  .handler(async ({ data, context }) => {
    const { uploadCloudApplicationZip } = await import("./cloud-apps.server");
    return uploadCloudApplicationZip(data.appId, data.fileName, data.zipBase64, data.autoExtract, context.userId);
  });

export const extractApplicationZip = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: unknown) =>
    z.object({
      appId: z.string(),
      filePath: z.string(),
    }).parse(data)
  )
  .handler(async ({ data, context }) => {
    const { extractCloudApplicationZip } = await import("./cloud-apps.server");
    return extractCloudApplicationZip(data.appId, data.filePath, context.userId);
  });

export const bulkDeleteApplicationFiles = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: unknown) =>
    z.object({
      appId: z.string(),
      filePaths: z.array(z.string()),
    }).parse(data)
  )
  .handler(async ({ data, context }) => {
    const { bulkDeleteCloudApplicationFiles } = await import("./cloud-apps.server");
    return bulkDeleteCloudApplicationFiles(data.appId, data.filePaths, context.userId);
  });

export const createApplicationFolder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: unknown) =>
    z.object({
      appId: z.string(),
      folderPath: z.string(),
    }).parse(data)
  )
  .handler(async ({ data, context }) => {
    const { createCloudApplicationFolder } = await import("./cloud-apps.server");
    return createCloudApplicationFolder(data.appId, data.folderPath, context.userId);
  });

export const moveApplicationFiles = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: unknown) =>
    z.object({
      appId: z.string(),
      filePaths: z.array(z.string()),
      targetFolder: z.string(),
    }).parse(data)
  )
  .handler(async ({ data, context }) => {
    const { moveCloudApplicationFiles } = await import("./cloud-apps.server");
    return moveCloudApplicationFiles(data.appId, data.filePaths, data.targetFolder, context.userId);
  });

export const copyApplicationFiles = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: unknown) =>
    z.object({
      appId: z.string(),
      filePaths: z.array(z.string()),
      targetFolder: z.string(),
    }).parse(data)
  )
  .handler(async ({ data, context }) => {
    const { copyCloudApplicationFiles } = await import("./cloud-apps.server");
    return copyCloudApplicationFiles(data.appId, data.filePaths, data.targetFolder, context.userId);
  });
