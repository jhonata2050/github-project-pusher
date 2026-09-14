import { type AppTemplate, getRequiredDiskWithMargin } from "@/lib/templates.data";

export type DeployType = "zip" | "github" | "templates";

export type CreateAppSearchParams = {
  mode?: DeployType;
  appId?: string;
  category?: string;
};

export interface ResourceCompatibility {
  isRamUnderpowered: boolean;
  isCpuUnderpowered: boolean;
  isDiskUnderpowered: boolean;
  isTemplateUnderpowered: boolean;
  activeAppDisk: number;
  requiredDiskWithMargin: number;
}

export function checkResourceCompatibility(
  activeApp: any,
  selectedTemplate: AppTemplate | null,
  deployType: DeployType
): ResourceCompatibility {
  const activeAppDisk =
    Number((activeApp as any)?.service?.products?.disk_quota_mb) ||
    Number(activeApp?.disk_limit_mb) ||
    1536;

  const requiredDiskWithMargin = selectedTemplate
    ? getRequiredDiskWithMargin(selectedTemplate.recommended_disk)
    : 0;

  const isRamUnderpowered = Boolean(
    deployType === "templates" &&
      activeApp &&
      selectedTemplate &&
      Number(activeApp.memory_limit) < selectedTemplate.recommended_ram
  );

  const isCpuUnderpowered = Boolean(
    deployType === "templates" &&
      activeApp &&
      selectedTemplate &&
      activeApp.cpu_limit &&
      Number(activeApp.cpu_limit) < selectedTemplate.recommended_cpu
  );

  const isDiskUnderpowered = Boolean(
    deployType === "templates" &&
      activeApp &&
      selectedTemplate &&
      requiredDiskWithMargin > 0 &&
      activeAppDisk < requiredDiskWithMargin
  );

  const isTemplateUnderpowered = isRamUnderpowered || isCpuUnderpowered || isDiskUnderpowered;

  return {
    isRamUnderpowered,
    isCpuUnderpowered,
    isDiskUnderpowered,
    isTemplateUnderpowered,
    activeAppDisk,
    requiredDiskWithMargin,
  };
}
