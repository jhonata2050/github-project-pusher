import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const getFileManagerFiles = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: unknown) =>
    z
      .object({
        appId: z.string().min(1),
        path: z.string().default(""),
        showHidden: z.boolean().default(true),
      })
      .parse(data)
  )
  .handler(async ({ data, context }) => {
    const { listAppFiles } = await import("./server");
    return listAppFiles(data.appId, data.path, data.showHidden, context.userId);
  });

export const readFileContentFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: unknown) =>
    z
      .object({
        appId: z.string().min(1),
        filePath: z.string().min(1),
      })
      .parse(data)
  )
  .handler(async ({ data, context }) => {
    const { readAppFile } = await import("./server");
    return readAppFile(data.appId, data.filePath, context.userId);
  });

export const saveFileContentFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: unknown) =>
    z
      .object({
        appId: z.string().min(1),
        filePath: z.string().min(1),
        content: z.string(),
        expectedSha256: z.string().optional(),
        force: z.boolean().default(false),
      })
      .parse(data)
  )
  .handler(async ({ data, context }) => {
    const { writeAppFile } = await import("./server");
    return writeAppFile(data.appId, data.filePath, data.content, data.expectedSha256, data.force, context.userId);
  });

export const createFileFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: unknown) =>
    z
      .object({
        appId: z.string().min(1),
        filePath: z.string().min(1),
        content: z.string().default(""),
      })
      .parse(data)
  )
  .handler(async ({ data, context }) => {
    const { createAppFile } = await import("./server");
    return createAppFile(data.appId, data.filePath, data.content, context.userId);
  });

export const createFolderFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: unknown) =>
    z
      .object({
        appId: z.string().min(1),
        folderPath: z.string().min(1),
      })
      .parse(data)
  )
  .handler(async ({ data, context }) => {
    const { createAppDirectory } = await import("./server");
    return createAppDirectory(data.appId, data.folderPath, context.userId);
  });

export const deleteItemsFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: unknown) =>
    z
      .object({
        appId: z.string().min(1),
        paths: z.array(z.string().min(1)),
        useTrash: z.boolean().default(false),
      })
      .parse(data)
  )
  .handler(async ({ data, context }) => {
    const { deleteAppItems } = await import("./server");
    return deleteAppItems(data.appId, data.paths, data.useTrash, context.userId);
  });

export const renameItemFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: unknown) =>
    z
      .object({
        appId: z.string().min(1),
        oldPath: z.string().min(1),
        newName: z.string().min(1),
      })
      .parse(data)
  )
  .handler(async ({ data, context }) => {
    const { renameAppItem } = await import("./server");
    return renameAppItem(data.appId, data.oldPath, data.newName, context.userId);
  });

export const copyItemsFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: unknown) =>
    z
      .object({
        appId: z.string().min(1),
        paths: z.array(z.string().min(1)),
        targetDir: z.string().default(""),
      })
      .parse(data)
  )
  .handler(async ({ data, context }) => {
    const { copyAppItems } = await import("./server");
    return copyAppItems(data.appId, data.paths, data.targetDir, context.userId);
  });

export const moveItemsFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: unknown) =>
    z
      .object({
        appId: z.string().min(1),
        paths: z.array(z.string().min(1)),
        targetDir: z.string().default(""),
      })
      .parse(data)
  )
  .handler(async ({ data, context }) => {
    const { moveAppItems } = await import("./server");
    return moveAppItems(data.appId, data.paths, data.targetDir, context.userId);
  });

export const chmodItemFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: unknown) =>
    z
      .object({
        appId: z.string().min(1),
        filePath: z.string().min(1),
        modeOctal: z.string().min(1),
      })
      .parse(data)
  )
  .handler(async ({ data, context }) => {
    const { chmodAppItem } = await import("./server");
    return chmodAppItem(data.appId, data.filePath, data.modeOctal, context.userId);
  });

export const compressItemsFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: unknown) =>
    z
      .object({
        appId: z.string().min(1),
        paths: z.array(z.string().min(1)),
        archiveName: z.string().min(1),
        targetDir: z.string().default(""),
      })
      .parse(data)
  )
  .handler(async ({ data, context }) => {
    const { compressAppItems } = await import("./server");
    return compressAppItems(data.appId, data.paths, data.archiveName, data.targetDir, context.userId);
  });

export const extractArchiveFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: unknown) =>
    z
      .object({
        appId: z.string().min(1),
        archivePath: z.string().min(1),
        targetDir: z.string().default(""),
      })
      .parse(data)
  )
  .handler(async ({ data, context }) => {
    const { extractAppArchive } = await import("./server");
    return extractAppArchive(data.appId, data.archivePath, data.targetDir, context.userId);
  });

export const uploadFilesBatchFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: unknown) =>
    z
      .object({
        appId: z.string().min(1),
        targetDir: z.string().default(""),
        files: z.array(
          z.object({
            name: z.string().min(1),
            contentBase64: z.string(),
          })
        ),
      })
      .parse(data)
  )
  .handler(async ({ data, context }) => {
    const { uploadAppFilesBatch } = await import("./server");
    return uploadAppFilesBatch(data.appId, data.targetDir, data.files, context.userId);
  });

export const searchFilesFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: unknown) =>
    z
      .object({
        appId: z.string().min(1),
        query: z.string().min(1),
        startDir: z.string().default(""),
      })
      .parse(data)
  )
  .handler(async ({ data, context }) => {
    const { searchAppFiles } = await import("./server");
    return searchAppFiles(data.appId, data.query, data.startDir, context.userId);
  });
