import React, { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";
import { getMyApplications, applyTemplateToApp } from "@/lib/cloud-apps.functions";
import { APP_TEMPLATES, type AppTemplate } from "@/lib/templates.data";
import { checkResourceCompatibility, type DeployType, type ResourceCompatibility } from "../types";

export interface UseCreateAppOptions {
  initialMode?: DeployType | undefined;
  initialAppId?: string | undefined;
  initialCategory?: string | undefined;
}

export function useCreateApp({
  initialMode,
  initialAppId,
  initialCategory,
}: UseCreateAppOptions = {}) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user, impersonatedClientId } = useAuth();
  const effectiveUserId = impersonatedClientId || user?.id;

  const [deployType, setDeployType] = useState<DeployType>(initialMode || "zip");
  const [appName, setAppName] = useState(
    initialMode === "templates" || !initialMode ? APP_TEMPLATES[0]?.name || "" : ""
  );
  const [selectedAppId, setSelectedAppId] = useState<string>(initialAppId || "");

  // Estado para ZIP
  const [zipFile, setZipFile] = useState<File | null>(null);

  // Estado para GitHub
  const [gitRepo, setGitRepo] = useState("");
  const [gitBranch, setGitBranch] = useState("main");
  const [buildPack, setBuildPack] = useState<"nixpacks" | "dockerfile">("nixpacks");

  // Estado para Templates
  const [selectedTemplate, setSelectedTemplate] = useState<AppTemplate | null>(
    APP_TEMPLATES[0] ?? null
  );
  const [templateCategory, setTemplateCategory] = useState<string>(initialCategory || "all");

  const { data: apps, isLoading: loadingApps } = useQuery({
    queryKey: ["myApplications", effectiveUserId],
    enabled: Boolean(effectiveUserId),
    queryFn: () => getMyApplications({ data: { clientId: effectiveUserId } }),
  });

  const activeApp = apps?.find((a: any) => a.id === (selectedAppId || apps?.[0]?.id)) || apps?.[0];

  const resourceComp: ResourceCompatibility = checkResourceCompatibility(
    activeApp,
    selectedTemplate,
    deployType
  );

  const handleSelectTemplate = (tmpl: AppTemplate) => {
    setSelectedTemplate(tmpl);
    if (
      !appName.trim() ||
      APP_TEMPLATES.some(
        (t) => t.name === appName || t.name.toLowerCase().replace(/[^a-z0-9]/g, "-") === appName
      )
    ) {
      setAppName(tmpl.name);
    }
  };

  const handleFileDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (file.name.endsWith(".zip")) {
        setZipFile(file);
        if (!appName) setAppName(file.name.replace(".zip", ""));
      } else {
        toast.error("Apenas arquivos no formato .zip são aceitos.");
      }
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.name.endsWith(".zip")) {
        setZipFile(file);
        if (!appName) setAppName(file.name.replace(".zip", ""));
      } else {
        toast.error("Apenas arquivos no formato .zip são aceitos.");
      }
    }
  };

  const deployMutation = useMutation({
    mutationFn: async () => {
      if (!activeApp) throw new Error("Selecione uma aplicação/recurso para o deploy.");

      const trimmedName = appName.trim();
      if (!trimmedName) {
        throw new Error(
          "O nome da aplicação é obrigatório. Por favor, informe o nome para prosseguir."
        );
      }

      if (deployType === "templates" && selectedTemplate) {
        if (resourceComp.isTemplateUnderpowered) {
          let reason = "";
          if (resourceComp.isDiskUnderpowered) {
            reason = `seu plano contratado possui ${resourceComp.activeAppDisk} MB de disco, mas o modelo ${selectedTemplate.name} exige no mínimo ${selectedTemplate.recommended_disk} MB (+ 20% de margem de segurança para operação = ${resourceComp.requiredDiskWithMargin} MB).`;
          } else if (resourceComp.isRamUnderpowered) {
            reason = `seu plano contratado possui ${activeApp.memory_limit} MB de RAM, mas o modelo ${selectedTemplate.name} exige no mínimo ${selectedTemplate.recommended_ram} MB de RAM.`;
          } else {
            reason = `seu plano contratado possui ${activeApp.cpu_limit || 0.5} vCPU, mas o modelo ${selectedTemplate.name} exige no mínimo ${selectedTemplate.recommended_cpu} vCPU.`;
          }
          throw new Error(`Plano incompatível: ${reason} Faça upgrade do seu plano para continuar.`);
        }
        return applyTemplateToApp({
          data: {
            appId: activeApp.id,
            template: {
              id: selectedTemplate.id,
              git_repository: selectedTemplate.git_repository,
              git_branch: selectedTemplate.git_branch,
              build_pack: selectedTemplate.build_pack,
              default_envs: selectedTemplate.default_envs,
              default_port: selectedTemplate.default_port,
              name: trimmedName,
            },
          },
        });
      }

      if (deployType === "github") {
        if (!gitRepo) throw new Error("Informe a URL do repositório GitHub.");
        return applyTemplateToApp({
          data: {
            appId: activeApp.id,
            template: {
              git_repository: gitRepo,
              git_branch: gitBranch || "main",
              build_pack: buildPack,
              name: trimmedName,
            },
          },
        });
      }

      if (deployType === "zip") {
        if (!zipFile) throw new Error("Selecione um arquivo .zip para fazer o upload.");
        return applyTemplateToApp({
          data: {
            appId: activeApp.id,
            template: {
              git_repository: "https://github.com/eqsam/nodejs-starter",
              git_branch: "main",
              build_pack: "nixpacks",
              name: trimmedName,
            },
          },
        });
      }
      return null;
    },
    onSuccess: () => {
      toast.success("Aplicação criada e deploy iniciado com sucesso!");
      queryClient.invalidateQueries({ queryKey: ["myApplications"] });
      if (activeApp) {
        navigate({ to: "/apps/$appId", params: { appId: activeApp.id } });
      } else {
        navigate({ to: "/apps" });
      }
    },
    onError: (err: any) => {
      toast.error(err.message || "Falha ao realizar deploy.");
    },
  });

  return {
    deployType,
    setDeployType,
    appName,
    setAppName,
    selectedAppId,
    setSelectedAppId,
    zipFile,
    setZipFile,
    gitRepo,
    setGitRepo,
    gitBranch,
    setGitBranch,
    buildPack,
    setBuildPack,
    selectedTemplate,
    setSelectedTemplate: handleSelectTemplate,
    templateCategory,
    setTemplateCategory,
    apps,
    loadingApps,
    activeApp,
    resourceComp,
    handleFileDrop,
    handleFileSelect,
    deployMutation,
    handleDeploy: () => deployMutation.mutate(),
  };
}
