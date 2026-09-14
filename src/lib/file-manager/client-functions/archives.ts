import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

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
    const { compressAppItems } = await import("../server");
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
    const { extractAppArchive } = await import("../server");
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
    const { uploadAppFilesBatch } = await import("../server");
    return uploadAppFilesBatch(data.appId, data.targetDir, data.files, context.userId);
  });
