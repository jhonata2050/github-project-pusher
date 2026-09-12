/**
 * @file cloud-apps.server.ts
 * @description Fachada retrocompatível para o subsistema de Cloud Applications (Eqsam Cloud PaaS).
 * Mantém 100% de compatibilidade com todos os consumidores históricos (Lei #6 de Engenharia).
 */

export * from "./cloud-apps/types";
export * from "./cloud-apps/store.server";
export * from "./cloud-apps/lifecycle.server";
export * from "./cloud-apps/files.server";
export * from "./cloud-apps/envs.server";
export * from "./cloud-apps/domains.server";
export * from "./cloud-apps/deployer.server";
export * from "./cloud-apps/admin.server";
