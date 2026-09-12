/**
 * Fachada Oficial do Motor Financeiro (EQSAM Painel)
 * 
 * Em conformidade com a Lei da Preservação de Fachadas (Facade Pattern):
 * Este arquivo reexporta 100% das funções e tipos dos submódulos em src/lib/finance/,
 * garantindo compatibilidade retroativa com todas as rotas e funções do sistema.
 */

export * from "./finance/invoice-lifecycle.server";
export * from "./finance/provisioning.server";
export * from "./finance/payment-handler.server";
