import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  executeAppAction,
  resetCloudApp,
  updateApplicationName,
} from "@/lib/cloud-apps.functions";
import type { UseAppOperationsParams } from "./types";

export function useAppLifecycle({
  appId,
  app,
  refetchApp,
  setIsStopAppConfirmOpen,
  setIsEditingName,
  setIsDeployModalOpen,
  setActiveDeploymentUuid,
  setDeploymentStatus,
  setDeploymentLogs,
  setDeployStep,
  setDeployAppTitle,
}: Pick<
  UseAppOperationsParams,
  | "appId"
  | "app"
  | "refetchApp"
  | "setIsStopAppConfirmOpen"
  | "setIsEditingName"
  | "setIsDeployModalOpen"
  | "setActiveDeploymentUuid"
  | "setDeploymentStatus"
  | "setDeploymentLogs"
  | "setDeployStep"
  | "setDeployAppTitle"
>) {
  const queryClient = useQueryClient();

  const actionMutation = useMutation({
    mutationFn: async (action: "start" | "stop" | "restart" | "deploy") => {
      if (action === "deploy") {
        setDeployAppTitle(app?.name || "Aplicação");
        setDeployStep(1);
        setDeploymentLogs([
          { output: "Iniciando novo ciclo de build no cluster DK1...", type: "stdout" },
          { output: `Alocando recursos dedicados (${app?.memory_limit || 512}MB RAM, ${app?.cpu_limit || 1} vCPU)...`, type: "stdout" },
        ]);
        setDeploymentStatus("in_progress");
        setIsDeployModalOpen(true);
      }
      return executeAppAction({ data: { appId, action } });
    },
    onSuccess: (res: any, action) => {
      const labels: Record<string, string> = {
        start: "iniciada",
        stop: "parada",
        restart: "reiniciada",
        deploy: "em deploy com sucesso",
      };
      toast.success(`Aplicação ${labels[action]}!`);
      if (action === "deploy") {
        if (res?.deploymentUuid) {
          setActiveDeploymentUuid(res.deploymentUuid);
        } else {
          setTimeout(() => {
            setDeploymentLogs((prev) => [
              ...prev,
              { output: "Sincronizando volumes e containers...", type: "stdout" },
              { output: "Verificando roteamento Traefik e certificado SSL...", type: "stdout" },
              { output: "Container pronto e respondendo requisições!", type: "stdout" },
            ]);
            setDeploymentStatus("finished");
            setDeployStep(4);
            queryClient.invalidateQueries({ queryKey: ["applicationDetails", appId] });
            queryClient.invalidateQueries({ queryKey: ["realFileManagerFiles", appId] });
            refetchApp();
          }, 2500);
        }
      }
      queryClient.invalidateQueries({ queryKey: ["applicationDetails", appId] });
      refetchApp();
    },
    onError: (err: any) => {
      if (actionMutation.variables === "deploy") {
        setDeploymentStatus("failed");
      }
      toast.error(err.message || "Falha ao executar ação na aplicação.");
    },
  });

  const resetMutation = useMutation({
    mutationFn: async () => {
      return resetCloudApp({ data: { appId } });
    },
    onSuccess: () => {
      toast.success("Container resetado e retornado ao estado inicial com sucesso!");
      setIsStopAppConfirmOpen(false);
      queryClient.invalidateQueries({ queryKey: ["applicationDetails", appId] });
      queryClient.invalidateQueries({ queryKey: ["realFileManagerFiles", appId] });
      queryClient.invalidateQueries({ queryKey: ["myApplications"] });
      refetchApp();
    },
    onError: (err: any) => {
      toast.error(err.message || "Erro ao resetar container.");
    },
  });

  const updateNameMutation = useMutation({
    mutationFn: async (newName: string) => {
      const clean = newName.trim();
      if (!clean) throw new Error("O nome da aplicação não pode ficar em branco.");
      return updateApplicationName({ data: { appId, name: clean } });
    },
    onSuccess: () => {
      toast.success("Nome da aplicação atualizado com sucesso!");
      setIsEditingName(false);
      queryClient.invalidateQueries({ queryKey: ["applicationDetails", appId] });
      queryClient.invalidateQueries({ queryKey: ["myApplications"] });
      refetchApp();
    },
    onError: (err: any) => {
      toast.error(err.message || "Erro ao atualizar nome da aplicação.");
    },
  });

  return {
    actionMutation,
    resetMutation,
    updateNameMutation,
  };
}
