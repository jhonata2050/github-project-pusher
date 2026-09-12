/**
 * Fachada Oficial do Motor Docker Swarm (Cluster DK1)
 *
 * Em conformidade com a Lei da Preservação de Fachadas (Facade Pattern):
 * Este arquivo reexporta 100% das funções e tipos dos submódulos em src/lib/swarm/,
 * garantindo compatibilidade total e retroativa com todas as rotas e funções do sistema.
 */

export * from "./swarm/swarm-transport.server";
export * from "./swarm/swarm-routing.server";
export * from "./swarm/swarm-deployer.server";
export * from "./swarm/swarm-services.server";
export * from "./swarm/swarm-files.server";
export * from "./swarm/swarm-metrics.server";
