import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const getApplicationFiles = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .validator((data: unknown) => z.object({ appId: z.string() }).parse(data))
  .handler(async ({ data, context }) => {
    const { getCloudApplicationFiles } = await import("../../cloud-apps.server");
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
    const { saveCloudApplicationFile } = await import("../../cloud-apps.server");
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
    const { saveCloudApplicationFilesBatch } = await import("../../cloud-apps.server");
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
    const { deleteCloudApplicationFile } = await import("../../cloud-apps.server");
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
    const { uploadCloudApplicationZip } = await import("../../cloud-apps.server");
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
    const { extractCloudApplicationZip } = await import("../../cloud-apps.server");
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
    const { bulkDeleteCloudApplicationFiles } = await import("../../cloud-apps.server");
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
    const { createCloudApplicationFolder } = await import("../../cloud-apps.server");
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
    const { moveCloudApplicationFiles } = await import("../../cloud-apps.server");
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
    const { copyCloudApplicationFiles } = await import("../../cloud-apps.server");
    return copyCloudApplicationFiles(data.appId, data.filePaths, data.targetFolder, context.userId);
  });
