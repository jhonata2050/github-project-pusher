import type { ApplicationRecord, ClusterServerConfig } from "../../cloud-apps.server";

export async function runPostDeployHooks(
  _conn: any,
  _templateId: string,
  _app: ApplicationRecord,
  _server: ClusterServerConfig,
  _cleanId: string,
  _stackName: string,
  _cleanHost: string
): Promise<void> {
  // Post-deploy hooks for complex multi-container stacks (e.g. OpenStatus LibSQL migrations) removed.
  // Standard and single-container applications initialize natively via Docker entrypoints and envs.
}
