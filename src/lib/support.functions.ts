/**
 * @file support.functions.ts
 * @description Fachada retrocompatível para os serviços de Suporte, Servidores, Produtos e Catálogo.
 * Mantém 100% de compatibilidade com as rotas históricas (Lei #6 de Engenharia).
 */

export * from "./support/system-settings.functions";
export * from "./support/tickets.functions";
export * from "./support/servers-da.functions";
export * from "./support/products.functions";
export * from "./support/services.functions";
