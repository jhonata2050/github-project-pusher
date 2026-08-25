import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const getCoolifyServersAdmin = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: isStaff } = await context.supabase.rpc("is_staff", { _user_id: context.userId });
    if (!isStaff) throw new Error("Acesso negado");

    const { getCoolifyServers, getAdminCoolifyApplicationsList } = await import("./coolify.server");
    const [servers, applications] = await Promise.all([
      getCoolifyServers(),
      getAdminCoolifyApplicationsList(),
    ]);

    return {
      servers,
      applications,
    };
  });

export const saveCoolifyServerAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: unknown) =>
    z
      .object({
        id: z.string().optional(),
        name: z.string().min(1),
        apiUrl: z.string().url(),
        apiToken: z.string().min(1),
        wildcardDomain: z.string().min(1),
        isActive: z.boolean(),
        maxApplications: z.number().min(1),
        serverIp: z.string().optional(),
      })
      .parse(data)
  )
  .handler(async ({ data, context }) => {
    const { data: isStaff } = await context.supabase.rpc("is_staff", { _user_id: context.userId });
    if (!isStaff) throw new Error("Acesso negado");

    const { getCoolifyServers, saveCoolifyServers } = await import("./coolify.server");
    const servers = await getCoolifyServers();

    const serverId = data.id || crypto.randomUUID();
    const existingIndex = servers.findIndex((s) => s.id === serverId);

    const updatedServer = {
      id: serverId,
      name: data.name,
      apiUrl: data.apiUrl,
      apiToken: data.apiToken,
      wildcardDomain: data.wildcardDomain,
      isActive: data.isActive,
      maxApplications: data.maxApplications,
      serverIp: data.serverIp || "",
      created_at: existingIndex >= 0 ? servers[existingIndex].created_at : new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    if (existingIndex >= 0) {
      servers[existingIndex] = updatedServer;
    } else {
      servers.push(updatedServer);
    }

    await saveCoolifyServers(servers);
    return updatedServer;
  });

export const deleteCoolifyServerAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: unknown) => z.object({ serverId: z.string() }).parse(data))
  .handler(async ({ data, context }) => {
    const { data: isStaff } = await context.supabase.rpc("is_staff", { _user_id: context.userId });
    if (!isStaff) throw new Error("Acesso negado");

    const { getCoolifyServers, saveCoolifyServers } = await import("./coolify.server");
    const servers = await getCoolifyServers();
    const filtered = servers.filter((s) => s.id !== data.serverId);
    await saveCoolifyServers(filtered);

    return { success: true };
  });

export const testCoolifyConnectionAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: unknown) =>
    z
      .object({
        apiUrl: z.string().url(),
        apiToken: z.string().min(1),
      })
      .parse(data)
  )
  .handler(async ({ data, context }) => {
    const { data: isStaff } = await context.supabase.rpc("is_staff", { _user_id: context.userId });
    if (!isStaff) throw new Error("Acesso negado");

    const { testCoolifyServerConnection } = await import("./coolify.server");
    return testCoolifyServerConnection(data.apiUrl, data.apiToken);
  });

export const getMyApplications = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .validator((data: unknown) => z.object({ clientId: z.string().uuid().optional() }).optional().parse(data))
  .handler(async ({ data, context }) => {
    const effectiveUserId = data?.clientId || context.userId;
    if (effectiveUserId !== context.userId) {
      const { data: isStaff } = await context.supabase.rpc("is_staff", { _user_id: context.userId });
      if (!isStaff) throw new Error("Acesso negado");
    }

    const { getMyCoolifyApplications } = await import("./coolify.server");
    return getMyCoolifyApplications(effectiveUserId);
  });

export const getApplicationDetails = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .validator((data: unknown) => z.object({ appId: z.string() }).parse(data))
  .handler(async ({ data, context }) => {
    const { getCoolifyApplicationDetails } = await import("./coolify.server");
    return getCoolifyApplicationDetails(data.appId, context.userId);
  });

export const executeAppAction = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: unknown) =>
    z
      .object({
        appId: z.string(),
        action: z.enum(["start", "stop", "restart", "deploy"]),
      })
      .parse(data)
  )
  .handler(async ({ data, context }) => {
    const { executeCoolifyAppAction } = await import("./coolify.server");
    return executeCoolifyAppAction(data.appId, data.action, context.userId);
  });

export const getApplicationLogs = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .validator((data: unknown) => z.object({ appId: z.string() }).parse(data))
  .handler(async ({ data, context }) => {
    const { getCoolifyApplicationLogs } = await import("./coolify.server");
    return getCoolifyApplicationLogs(data.appId, context.userId);
  });

export const getApplicationEnvs = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .validator((data: unknown) => z.object({ appId: z.string() }).parse(data))
  .handler(async ({ data, context }) => {
    const { getCoolifyApplicationEnvs } = await import("./coolify.server");
    return getCoolifyApplicationEnvs(data.appId, context.userId);
  });

export const saveApplicationEnvs = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: unknown) =>
    z
      .object({
        appId: z.string(),
        envs: z.array(
          z.object({
            key: z.string().min(1),
            value: z.string(),
            is_build_time: z.boolean().optional(),
            is_literal: z.boolean().optional(),
          })
        ),
      })
      .parse(data)
  )
  .handler(async ({ data, context }) => {
    const { saveCoolifyApplicationEnvs } = await import("./coolify.server");
    return saveCoolifyApplicationEnvs(data.appId, data.envs, context.userId);
  });

export const updateApplicationDomain = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: unknown) =>
    z
      .object({
        appId: z.string(),
        domain: z.string().min(3),
      })
      .parse(data)
  )
  .handler(async ({ data, context }) => {
    const { updateCoolifyApplicationDomain } = await import("./coolify.server");
    return updateCoolifyApplicationDomain(data.appId, data.domain, context.userId);
  });

export const applyTemplateToApp = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: unknown) =>
    z
      .object({
        appId: z.string(),
        template: z.object({
          git_repository: z.string().url(),
          git_branch: z.string().min(1),
          build_pack: z.enum(["nixpacks", "dockerfile", "dockercompose", "static"]),
          default_envs: z.array(z.object({ key: z.string(), value: z.string() })).optional(),
          default_port: z.number().optional(),
        }),
      })
      .parse(data)
  )
  .handler(async ({ data, context }) => {
    const { applyTemplateToApplication } = await import("./coolify.server");
    return applyTemplateToApplication(data.appId, data.template, context.userId);
  });

export const getDeploymentStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .validator((data: unknown) =>
    z
      .object({
        deploymentUuid: z.string().min(1),
      })
      .parse(data)
  )
  .handler(async ({ data, context }) => {
    const { getCoolifyDeploymentStatus } = await import("./coolify.server");
    return getCoolifyDeploymentStatus(data.deploymentUuid, context.userId);
  });

export const getApplicationFiles = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .validator((data: unknown) => z.object({ appId: z.string() }).parse(data))
  .handler(async ({ data, context }) => {
    const { getCoolifyApplicationFiles } = await import("./coolify.server");
    return getCoolifyApplicationFiles(data.appId, context.userId);
  });

export const saveApplicationFile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: unknown) =>
    z
      .object({
        appId: z.string(),
        filePath: z.string().min(1),
        content: z.string(),
      })
      .parse(data)
  )
  .handler(async ({ data, context }) => {
    const { saveCoolifyApplicationFile } = await import("./coolify.server");
    return saveCoolifyApplicationFile(data.appId, data.filePath, data.content, context.userId);
  });

export const saveApplicationFilesBatch = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: unknown) =>
    z
      .object({
        appId: z.string(),
        files: z.array(z.object({ path: z.string().min(1), content: z.string() })),
      })
      .parse(data)
  )
  .handler(async ({ data, context }) => {
    const { saveCoolifyApplicationFilesBatch } = await import("./coolify.server");
    return saveCoolifyApplicationFilesBatch(data.appId, data.files, context.userId);
  });

export const deleteApplicationFile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: unknown) =>
    z
      .object({
        appId: z.string(),
        filePath: z.string().min(1),
      })
      .parse(data)
  )
  .handler(async ({ data, context }) => {
    const { deleteCoolifyApplicationFile } = await import("./coolify.server");
    return deleteCoolifyApplicationFile(data.appId, data.filePath, context.userId);
  });

export const uploadApplicationZip = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: unknown) =>
    z
      .object({
        appId: z.string(),
        fileName: z.string(),
        zipBase64: z.string(),
        autoExtract: z.boolean().default(true),
      })
      .parse(data)
  )
  .handler(async ({ data, context }) => {
    const { uploadCoolifyApplicationZip } = await import("./coolify.server");
    return uploadCoolifyApplicationZip(data.appId, data.fileName, data.zipBase64, data.autoExtract, context.userId);
  });

export const extractApplicationZip = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: unknown) =>
    z
      .object({
        appId: z.string(),
        filePath: z.string(),
      })
      .parse(data)
  )
  .handler(async ({ data, context }) => {
    const { extractCoolifyApplicationZip } = await import("./coolify.server");
    return extractCoolifyApplicationZip(data.appId, data.filePath, context.userId);
  });

export const bulkDeleteApplicationFiles = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: unknown) =>
    z
      .object({
        appId: z.string(),
        filePaths: z.array(z.string()),
      })
      .parse(data)
  )
  .handler(async ({ data, context }) => {
    const { bulkDeleteCoolifyApplicationFiles } = await import("./coolify.server");
    return bulkDeleteCoolifyApplicationFiles(data.appId, data.filePaths, context.userId);
  });

export const createApplicationFolder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: unknown) =>
    z
      .object({
        appId: z.string(),
        folderPath: z.string(),
      })
      .parse(data)
  )
  .handler(async ({ data, context }) => {
    const { createCoolifyApplicationFolder } = await import("./coolify.server");
    return createCoolifyApplicationFolder(data.appId, data.folderPath, context.userId);
  });

export const moveApplicationFiles = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: unknown) =>
    z
      .object({
        appId: z.string(),
        filePaths: z.array(z.string()),
        targetFolder: z.string(),
      })
      .parse(data)
  )
  .handler(async ({ data, context }) => {
    const { moveCoolifyApplicationFiles } = await import("./coolify.server");
    return moveCoolifyApplicationFiles(data.appId, data.filePaths, data.targetFolder, context.userId);
  });

export const copyApplicationFiles = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: unknown) =>
    z
      .object({
        appId: z.string(),
        filePaths: z.array(z.string()),
        targetFolder: z.string(),
      })
      .parse(data)
  )
  .handler(async ({ data, context }) => {
    const { copyCoolifyApplicationFiles } = await import("./coolify.server");
    return copyCoolifyApplicationFiles(data.appId, data.filePaths, data.targetFolder, context.userId);
  });

