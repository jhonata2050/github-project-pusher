import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const startExtractJobFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: unknown) =>
    z
      .object({
        appId: z.string().min(1),
        archivePath: z.string().min(1),
        targetDir: z.string().default(""),
        conflictPolicy: z.enum(["overwrite", "skip", "abort"]).default("overwrite"),
      })
      .parse(data)
  )
  .handler(async ({ data, context }) => {
    const { verifyAppAuthorization } = await import("../security");
    await verifyAppAuthorization(data.appId, context.userId);
    const { jobManager } = await import("../jobs");
    const job = await jobManager.startExtractJob({
      appId: data.appId,
      userId: context.userId,
      archivePath: data.archivePath,
      targetDir: data.targetDir,
      conflictPolicy: data.conflictPolicy,
    });
    return { success: true, job };
  });

export const getJobStatusFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: unknown) =>
    z
      .object({
        jobId: z.string().min(1),
      })
      .parse(data)
  )
  .handler(async ({ data, context }) => {
    const { jobManager } = await import("../jobs");
    const job = jobManager.getJob(data.jobId);
    if (!job) {
      throw new Error("Job não encontrado.");
    }
    if (job.userId !== context.userId) {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { data: isStaff } = await supabaseAdmin.rpc("is_staff", { _user_id: context.userId });
      if (!isStaff) throw new Error("Acesso negado ao job.");
    }
    return {
      success: true,
      job: {
        id: job.id,
        appId: job.appId,
        type: job.type,
        status: job.status,
        progress: job.progress,
        totalFiles: job.totalFiles,
        processedFiles: job.processedFiles,
        currentFile: job.currentFile,
        error: job.error,
        resultSummary: job.resultSummary,
      },
    };
  });

export const cancelJobFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: unknown) =>
    z
      .object({
        jobId: z.string().min(1),
      })
      .parse(data)
  )
  .handler(async ({ data, context }) => {
    const { jobManager } = await import("../jobs");
    const job = jobManager.getJob(data.jobId);
    if (!job) throw new Error("Job não encontrado.");
    if (job.userId !== context.userId) {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { data: isStaff } = await supabaseAdmin.rpc("is_staff", { _user_id: context.userId });
      if (!isStaff) throw new Error("Acesso negado ao job.");
    }
    const success = jobManager.cancelJob(data.jobId, job.userId);
    return { success };
  });

export const forcePullFilesFromSwarmFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: unknown) =>
    z
      .object({
        appId: z.string().min(1),
      })
      .parse(data)
  )
  .handler(async ({ data, context }) => {
    const { verifyAppAuthorization, resolveClientRoot } = await import("../security");
    await verifyAppAuthorization(data.appId, context.userId);
    await resolveClientRoot(data.appId, true);
    return { success: true };
  });
