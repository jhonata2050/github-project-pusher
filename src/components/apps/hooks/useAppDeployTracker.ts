import { useState, useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { getDeploymentStatus } from "@/lib/cloud-apps.functions";
import type { DeploymentLog, DeploymentStatus } from "./types";

interface UseAppDeployTrackerParams {
  appId: string;
  refetchApp: () => void;
  refetchLogs: () => void;
}

export function useAppDeployTracker({
  appId,
  refetchApp,
  refetchLogs,
}: UseAppDeployTrackerParams) {
  const queryClient = useQueryClient();

  const [isDeployModalOpen, setIsDeployModalOpen] = useState(false);
  const [activeDeploymentUuid, setActiveDeploymentUuid] = useState<string | null>(null);
  const [deploymentStatus, setDeploymentStatus] = useState<DeploymentStatus>(null);
  const [deploymentLogs, setDeploymentLogs] = useState<DeploymentLog[]>([]);
  const [deployStep, setDeployStep] = useState<number>(1);
  const [deployAppTitle, setDeployAppTitle] = useState<string>("");
  const terminalLogsEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll do terminal de deploy ao vivo
  useEffect(() => {
    if (isDeployModalOpen && terminalLogsEndRef.current) {
      terminalLogsEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [deploymentLogs, isDeployModalOpen]);

  // Polling contínuo do status de deploy enquanto estiver ativo
  useEffect(() => {
    if (
      !isDeployModalOpen ||
      !activeDeploymentUuid ||
      deploymentStatus === "finished" ||
      deploymentStatus === "failed"
    ) {
      return;
    }

    const interval = setInterval(async () => {
      try {
        const res = await getDeploymentStatus({ data: { appId, deploymentUuid: activeDeploymentUuid } });
        if (res) {
          if (res.status === "finished") {
            setDeploymentStatus("finished");
            setDeployStep(4);
            toast.success("🚀 Aplicação implantada e online com sucesso!");
            queryClient.invalidateQueries({ queryKey: ["applicationDetails", appId] });
            queryClient.invalidateQueries({ queryKey: ["realFileManagerFiles", appId] });
            refetchApp();
            refetchLogs();
          } else if (res.status === "failed") {
            setDeploymentStatus("failed");
            toast.error("❌ Falha na implantação da aplicação. Verifique os logs.");
          } else {
            setDeploymentStatus("in_progress");
            if (res.step) setDeployStep(res.step);
          }

          if (res.logs && Array.isArray(res.logs)) {
            setDeploymentLogs(res.logs);
          }
        }
      } catch (e) {
        console.error("Erro ao consultar status do deploy:", e);
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [
    isDeployModalOpen,
    activeDeploymentUuid,
    deploymentStatus,
    appId,
    queryClient,
    refetchApp,
    refetchLogs,
  ]);

  return {
    isDeployModalOpen,
    setIsDeployModalOpen,
    activeDeploymentUuid,
    setActiveDeploymentUuid,
    deploymentStatus,
    setDeploymentStatus,
    deploymentLogs,
    setDeploymentLogs,
    deployStep,
    setDeployStep,
    deployAppTitle,
    setDeployAppTitle,
    terminalLogsEndRef,
  };
}
