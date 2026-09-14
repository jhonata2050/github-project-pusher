import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  executeAppAction,
  resetCloudApp,
  deployApplicationFromGit,
  updateApplicationName,
  saveApplicationEnvs,
  applyTemplateToApp,
} from "@/lib/cloud-apps.functions";
import { type AppTemplate, getRequiredDiskWithMargin } from "@/lib/templates.data";
import type { AppEnvItem, DeploymentLog, DeploymentStatus } from "./types";

interface UseAppOperationsParams {
  appId: string;
  app: any;
  envsData: AppEnvItem[] | undefined;
  refetchApp: () => void;
  refetchLogs: () => void;
  setIsStopAppConfirmOpen: (open: boolean) => void;
  setIsEditingName: (editing: boolean) => void;
  setIsDeployModalOpen: (open: boolean) => void;
  setIsTemplateModalOpen: (open: boolean) => void;
  setActiveDeploymentUuid: (uuid: string | null) => void;
  setDeploymentStatus: (status: DeploymentStatus) => void;
  setDeploymentLogs: React.Dispatch<React.SetStateAction<DeploymentLog[]>>;
  setDeployStep: (step: number) => void;
  setDeployAppTitle: (title: string) => void;
}

export function useAppOperations({
  appId,
  app,
  envsData,
  refetchApp,
  refetchLogs,
  setIsStopAppConfirmOpen,
  setIsEditingName,
  setIsDeployModalOpen,
  setIsTemplateModalOpen,
  setActiveDeploymentUuid,
  setDeploymentStatus,
  setDeploymentLogs,
  setDeployStep,
  setDeployAppTitle,
}: UseAppOperationsParams) {
  const queryClient = useQueryClient();

  const [gitRepoInput, setGitRepoInput] = useState("");
  const [gitBranchInput, setGitBranchInput] = useState("main");
  const [envsList, setEnvsList] = useState<AppEnvItem[]>([]);

  // Sincronizar inputs Git com o app
  useEffect(() => {
    if (app) {
      if (app.git_repository) setGitRepoInput(app.git_repository);
      if (app.git_branch) setGitBranchInput(app.git_branch);
    }
  }, [app]);

  // Sincronizar variáveis de ambiente
  useEffect(() => {
    if (envsData) {
      setEnvsList(envsData);
    }
  }, [envsData]);

  // Ações de Ciclo de Vida do Container (Start, Stop, Restart, Deploy)
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

  // Mutation dedicada para Deploy a partir do Git / GitHub (com reset do container)
  const deployGitMutation = useMutation({
    mutationFn: async ({ gitRepository, gitBranch }: { gitRepository: string; gitBranch?: string }) => {
      const cleanBranch = (gitBranch || "main").trim();
      const cleanRepo = gitRepository.trim();
      const targetName = cleanRepo.split("/").pop()?.replace(/\.git$/i, "") || app?.name || "Repositório Git";

      setDeployAppTitle(targetName);
      setDeployStep(1);
      setDeploymentLogs([
        { output: `[1/6] Conectando ao repositório Git: ${cleanRepo} (branch: ${cleanBranch})...`, type: "stdout" },
        { output: `Alocando recursos dedicados (${app?.memory_limit || 512}MB RAM, ${app?.cpu_limit || 1} vCPU)...`, type: "stdout" },
      ]);
      setDeploymentStatus("in_progress");
      setIsDeployModalOpen(true);

      return deployApplicationFromGit({
        data: {
          appId,
          gitRepository: cleanRepo,
          gitBranch: cleanBranch,
          resetContainer: true,
        },
      });
    },
    onSuccess: (res: any) => {
      if (res?.deploymentUuid) {
        setActiveDeploymentUuid(res.deploymentUuid);
      } else {
        setTimeout(() => {
          setDeploymentLogs((prev) => [
            ...prev,
            { output: "Sincronizando arquivos no host do Swarm...", type: "stdout" },
            { output: "Iniciando container no Docker Swarm...", type: "stdout" },
            { output: "Configurando proxy Traefik e certificado SSL...", type: "stdout" },
            { output: "✅ Container pronto e respondendo requisições!", type: "stdout" },
          ]);
          setDeploymentStatus("finished");
          setDeployStep(4);
          queryClient.invalidateQueries({ queryKey: ["applicationDetails", appId] });
          queryClient.invalidateQueries({ queryKey: ["realFileManagerFiles", appId] });
          queryClient.invalidateQueries({ queryKey: ["myApplications"] });
          refetchApp();
        }, 3000);
      }
      toast.success("Deploy do repositório Git realizado com sucesso!");
      queryClient.invalidateQueries({ queryKey: ["applicationDetails", appId] });
      queryClient.invalidateQueries({ queryKey: ["realFileManagerFiles", appId] });
      queryClient.invalidateQueries({ queryKey: ["myApplications"] });
      refetchApp();
    },
    onError: (err: any) => {
      setDeploymentStatus("failed");
      setDeploymentLogs((prev) => [
        ...prev,
        { output: `FALHA NO DEPLOY DO GIT: ${err.message}`, type: "stderr" },
      ]);
      toast.error(err.message || "Erro ao realizar deploy do Git.");
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

  const saveEnvsMutation = useMutation({
    mutationFn: async ({ shouldRestart }: { shouldRestart?: boolean } = {}) => {
      await saveApplicationEnvs({ data: { appId, envs: envsList } });
      if (shouldRestart) {
        await executeAppAction({ data: { appId, action: "restart" } });
      }
      return { shouldRestart };
    },
    onSuccess: (res) => {
      if (res?.shouldRestart) {
        toast.success("🎉 Variáveis salvas e aplicação reiniciada com sucesso!");
        queryClient.invalidateQueries({ queryKey: ["applicationDetails", appId] });
        refetchApp();
      } else {
        toast.success("Variáveis salvas! Reinicie ou faça Re-Deploy da aplicação para carregá-las.", {
          duration: 7000,
          action: {
            label: "Reiniciar Agora",
            onClick: () => actionMutation.mutate("restart"),
          },
        });
      }
      queryClient.invalidateQueries({ queryKey: ["applicationEnvs", appId] });
    },
    onError: (err: any) => {
      toast.error(err.message || "Erro ao salvar variáveis.");
    },
  });

  // Instalação de Template 1-Clique
  const applyTemplateMutation = useMutation({
    mutationFn: async (template: AppTemplate) => {
      const appDisk = (app as any)?.service?.products?.disk_quota_mb || app?.disk_limit_mb || 1536;
      const requiredDisk = getRequiredDiskWithMargin(template.recommended_disk);

      if (appDisk < requiredDisk) {
        throw new Error(
          `Plano incompatível com armazenamento: seu plano possui ${appDisk} MB de disco, mas o modelo "${template.name}" exige no mínimo ${template.recommended_disk} MB (+ 20% de margem de segurança para operação = ${requiredDisk} MB). Faça upgrade do seu plano para continuar.`
        );
      }

      if (app?.memory_limit && app.memory_limit < template.recommended_ram) {
        throw new Error(
          `Plano incompatível com memória: seu plano possui ${app.memory_limit} MB de RAM, mas o modelo "${template.name}" exige no mínimo ${template.recommended_ram} MB de RAM. Faça upgrade do seu plano.`
        );
      }

      if (app?.cpu_limit && template.recommended_cpu && app.cpu_limit < template.recommended_cpu) {
        throw new Error(
          `Plano incompatível com processamento: seu plano possui ${app.cpu_limit} vCPU, mas o modelo "${template.name}" exige no mínimo ${template.recommended_cpu} vCPU. Faça upgrade do seu plano.`
        );
      }

      setDeployAppTitle(template.name);
      setDeployStep(1);
      setDeploymentLogs([
        { output: `🚀 Selecionado modelo 1-Clique: ${template.name}`, type: "stdout" },
        { output: `📦 Alocando container com ${app?.memory_limit || 512}MB RAM e ${app?.cpu_limit || 1} vCPU...`, type: "stdout" },
        { output: `🔗 Conectando ao repositório: ${template.git_repository} (${template.git_branch})...`, type: "stdout" },
        { output: `⚙️ Configurando Buildpack (${template.build_pack.toUpperCase()}) e porta interna ${template.default_port}...`, type: "stdout" },
      ]);
      setDeploymentStatus("in_progress");
      setIsTemplateModalOpen(false);
      setIsDeployModalOpen(true);

      return applyTemplateToApp({
        data: {
          appId,
          template: {
            id: template.id,
            name: template.name,
            git_repository: template.git_repository,
            git_branch: template.git_branch,
            build_pack: template.build_pack,
            default_envs: template.default_envs?.map((e) => ({ key: e.key, value: e.value })),
            default_port: template.default_port,
          },
        },
      });
    },
    onSuccess: (res: any) => {
      if (res?.deploymentUuid) {
        setActiveDeploymentUuid(res.deploymentUuid);
      } else {
        setTimeout(() => {
          setDeploymentLogs((prev) => [
            ...prev,
            { output: "Injetando variáveis de ambiente...", type: "stdout" },
            { output: "Executando build da imagem Docker / Nixpacks...", type: "stdout" },
            { output: "Gerando certificado SSL Let's Encrypt...", type: "stdout" },
            { output: "Aplicação online com sucesso 24/7!", type: "stdout" },
          ]);
          setDeploymentStatus("finished");
          setDeployStep(4);
          queryClient.invalidateQueries({ queryKey: ["applicationDetails", appId] });
          refetchApp();
        }, 3000);
      }
    },
    onError: (err: any) => {
      setDeploymentStatus("failed");
      setDeploymentLogs((prev) => [
        ...prev,
        { output: `ERRO CRÍTICO NO DEPLOY: ${err.message}`, type: "stderr" },
      ]);
      toast.error(err.message || "Erro ao instalar modelo.");
    },
  });

  return {
    gitRepoInput,
    setGitRepoInput,
    gitBranchInput,
    setGitBranchInput,
    envsList,
    setEnvsList,
    actionMutation,
    resetMutation,
    deployGitMutation,
    updateNameMutation,
    saveEnvsMutation,
    applyTemplateMutation,
  };
}
