import {
  useAppLifecycle,
  useAppDeployOperations,
  useAppEnvsOperations,
  type UseAppOperationsParams,
} from "./operations";

export type { UseAppOperationsParams };

export function useAppOperations(params: UseAppOperationsParams) {
  const {
    appId,
    app,
    envsData,
    refetchApp,
    setIsStopAppConfirmOpen,
    setIsEditingName,
    setIsDeployModalOpen,
    setIsTemplateModalOpen,
    setActiveDeploymentUuid,
    setDeploymentStatus,
    setDeploymentLogs,
    setDeployStep,
    setDeployAppTitle,
  } = params;

  const {
    actionMutation,
    resetMutation,
    updateNameMutation,
  } = useAppLifecycle({
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
  });

  const {
    gitRepoInput,
    setGitRepoInput,
    gitBranchInput,
    setGitBranchInput,
    deployGitMutation,
    applyTemplateMutation,
  } = useAppDeployOperations({
    appId,
    app,
    refetchApp,
    setIsDeployModalOpen,
    setIsTemplateModalOpen,
    setActiveDeploymentUuid,
    setDeploymentStatus,
    setDeploymentLogs,
    setDeployStep,
    setDeployAppTitle,
  });

  const {
    envsList,
    setEnvsList,
    saveEnvsMutation,
  } = useAppEnvsOperations({
    appId,
    envsData,
    refetchApp,
    onRestartRequest: () => actionMutation.mutate("restart"),
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
