import type { AppEnvItem, DeploymentLog, DeploymentStatus } from "../types";

export interface UseAppOperationsParams {
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
