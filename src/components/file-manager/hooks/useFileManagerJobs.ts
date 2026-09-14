import { useState, useEffect, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  startExtractJobFn,
  getJobStatusFn,
  cancelJobFn,
  extractArchiveFn,
} from "@/lib/file-manager/functions";
import type { ActiveJobState } from "./types";

interface UseFileManagerJobsParams {
  appId: string;
  currentPath: string;
  refetch: () => void;
  onClearSelection?: () => void;
  onCloseCompressModal?: () => void;
}

export function useFileManagerJobs({
  appId,
  currentPath,
  refetch,
  onClearSelection,
  onCloseCompressModal,
}: UseFileManagerJobsParams) {
  const queryClient = useQueryClient();

  const [activeJob, setActiveJob] = useState<ActiveJobState | null>(null);
  const [isJobModalOpen, setIsJobModalOpen] = useState(false);
  const [isExtractConflictModalOpen, setIsExtractConflictModalOpen] = useState(false);
  const [pendingExtractPath, setPendingExtractPath] = useState<string | null>(null);

  // Monitoramento do Job em tempo real com polling de alta precisão
  useEffect(() => {
    if (
      !activeJob ||
      activeJob.status === "completed" ||
      activeJob.status === "failed" ||
      activeJob.status === "cancelled"
    ) {
      return;
    }

    const interval = setInterval(async () => {
      try {
        let jobData: any = null;
        try {
          const res = await getJobStatusFn({ data: { jobId: activeJob.id } });
          if (res?.success && res.job) {
            jobData = res.job;
          }
        } catch {
          const res = await fetch(`/api/file-manager/jobs/${activeJob.id}`, { credentials: "include" });
          if (res.ok) {
            const data = await res.json();
            if (data.job) jobData = data.job;
          }
        }

        if (jobData) {
          setActiveJob(jobData);
          if (
            jobData.status === "completed" ||
            (jobData.progress >= 100 && jobData.processedFiles >= jobData.totalFiles && jobData.totalFiles > 0)
          ) {
            toast.success(
              jobData.type === "extract"
                ? `✓ Descompactação concluída com sucesso (${jobData.resultSummary?.extractedCount || jobData.totalFiles} arquivos)!`
                : `✓ Compressão concluída com sucesso (${jobData.resultSummary?.totalPacked || jobData.totalFiles} arquivos)!`
            );
            queryClient.invalidateQueries({ queryKey: ["realFileManagerFiles", appId] });
            refetch();
            setTimeout(() => {
              setIsJobModalOpen(false);
              setActiveJob(null);
            }, 800);
          } else if (jobData.status === "failed") {
            toast.error(`✕ Falha no processamento: ${jobData.error}`);
            setTimeout(() => {
              setIsJobModalOpen(false);
              setActiveJob(null);
            }, 2500);
          } else if (jobData.status === "cancelled") {
            toast.info("Operação cancelada pelo usuário.");
            setTimeout(() => {
              setIsJobModalOpen(false);
              setActiveJob(null);
            }, 1000);
          }
        }
      } catch (err) {
        console.warn("[Job Poll Error]:", err);
      }
    }, 250);

    return () => clearInterval(interval);
  }, [activeJob?.id, activeJob?.status, appId, queryClient, refetch]);

  // Iniciar Extração Assíncrona com Job e Fallback Imediato
  const handleStartExtractJob = useCallback(
    async (
      archivePath: string,
      conflictPolicy: "overwrite" | "skip" | "abort" = "overwrite"
    ) => {
      try {
        setIsExtractConflictModalOpen(false);
        setPendingExtractPath(null);

        // 1. Tentar via Server Function segura do TanStack Start
        try {
          const res: any = await startExtractJobFn({
            data: {
              appId,
              archivePath,
              targetDir: currentPath,
              conflictPolicy,
            },
          });

          if (res?.success && res.job) {
            setActiveJob(res.job);
            setIsJobModalOpen(true);
            return;
          }
        } catch (jobErr: any) {
          console.warn("[Job ServerFn Error, falling back]:", jobErr?.message);
        }

        // 2. Fallback via API Fetch com credentials: "include"
        try {
          const { data: sessionData } = await supabase.auth.getSession();
          const token = sessionData?.session?.access_token;

          const res = await fetch("/api/file-manager/jobs/extract", {
            method: "POST",
            credentials: "include",
            headers: {
              "Content-Type": "application/json",
              ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
            body: JSON.stringify({
              appId,
              archivePath,
              targetDir: currentPath,
              conflictPolicy,
            }),
          });

          const data = await res.json();
          if (res.ok && data.success && data.job) {
            setActiveJob(data.job);
            setIsJobModalOpen(true);
            return;
          }
        } catch (fetchErr: any) {
          console.warn("[Fetch Job Error, trying direct extract]:", fetchErr?.message);
        }

        // 3. Fallback definitivo: extração direta via extractArchiveFn
        toast.loading("Descompactando arquivo e sincronizando com o cluster...", { id: "extract-sync" });
        const extractResult = await extractArchiveFn({
          data: {
            appId,
            archivePath,
            targetDir: currentPath,
          },
        });

        toast.success(
          `✓ Descompactação concluída (${extractResult.extractedCount} arquivos extraídos e sincronizados)!`,
          { id: "extract-sync" }
        );
        queryClient.invalidateQueries({ queryKey: ["realFileManagerFiles", appId] });
        refetch();
      } catch (err: any) {
        toast.error("Erro na descompactação: " + err.message, { id: "extract-sync" });
      }
    },
    [appId, currentPath, queryClient, refetch]
  );

  // Iniciar Compressão Assíncrona com Job
  const handleStartCompressJob = useCallback(
    async (paths: string[], archiveName: string) => {
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        const token = sessionData?.session?.access_token;

        const res = await fetch("/api/file-manager/jobs/compress", {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({
            appId,
            paths,
            archiveName,
            targetDir: currentPath,
          }),
        });

        const data = await res.json();
        if (!res.ok || !data.success) {
          throw new Error(data.error || "Erro ao iniciar compressão.");
        }

        setActiveJob(data.job);
        setIsJobModalOpen(true);
        onCloseCompressModal?.();
        onClearSelection?.();
      } catch (err: any) {
        toast.error("Erro ao iniciar compressão: " + err.message);
      }
    },
    [appId, currentPath, onCloseCompressModal, onClearSelection]
  );

  // Cancelar Job Ativo
  const handleCancelActiveJob = useCallback(async () => {
    if (!activeJob) return;
    try {
      try {
        await cancelJobFn({ data: { jobId: activeJob.id } });
      } catch {
        const { data: sessionData } = await supabase.auth.getSession();
        const token = sessionData?.session?.access_token;

        await fetch(`/api/file-manager/jobs/${activeJob.id}`, {
          method: "POST",
          credentials: "include",
          headers: {
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        });
      }
      toast.info("Cancelamento solicitado...");
    } catch (err: any) {
      toast.error("Erro ao solicitar cancelamento: " + err.message);
    }
  }, [activeJob]);

  // Abrir modal de extração de arquivo compactado
  const handleOpenExtract = useCallback((path: string) => {
    setPendingExtractPath(path);
    setIsExtractConflictModalOpen(true);
  }, []);

  return {
    activeJob,
    setActiveJob,
    isJobModalOpen,
    setIsJobModalOpen,
    isExtractConflictModalOpen,
    setIsExtractConflictModalOpen,
    pendingExtractPath,
    setPendingExtractPath,
    handleStartExtractJob,
    handleStartCompressJob,
    handleCancelActiveJob,
    handleOpenExtract,
  };
}
