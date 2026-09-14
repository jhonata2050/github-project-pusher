import { Globe, Rocket, Monitor, type LucideIcon } from "lucide-react";
import type { ServiceKey } from "../types";

export interface ServiceConfig {
  key: ServiceKey;
  title: string;
  shortTitle: string;
  badge: string;
  description: string;
  icon: LucideIcon;
  accentColor: string;
  bgAccent: string;
  borderAccent: string;
  startingPrice: number;
  features: string[];
  group?: any;
}

export function getStartingPrice(group?: any): number | null {
  if (!group?.products?.length) return null;
  const prices = group.products
    .flatMap((p: any) =>
      (p.product_prices || [])
        .filter((pr: any) => pr.cycle === "monthly" && pr.is_active)
        .map((pr: any) => Number(pr.price))
    )
    .filter((pr: number) => pr > 0);
  if (!prices.length) return null;
  return Math.min(...prices);
}

export function buildServiceConfigs(
  hostingGroup?: any,
  containersGroup?: any,
  vpsGroup?: any
): Record<ServiceKey, ServiceConfig> {
  return {
    directadmin: {
      key: "directadmin",
      title: "DirectAdmin",
      shortTitle: "DirectAdmin",
      badge: "Hospedagem Web",
      description:
        "Hospedagem profissional com painel DirectAdmin em português, PHP 8.x, MySQL, e-mails corporativos e instalador WordPress.",
      icon: Globe,
      accentColor: "text-blue-500",
      bgAccent: "bg-blue-500/10",
      borderAccent: "border-blue-500/40",
      startingPrice: getStartingPrice(hostingGroup) ?? 14.9,
      features: [
        "Painel DirectAdmin Completo em Português",
        "PHP 8.1, 8.2, 8.3 & Banco de Dados MySQL",
        "Contas de E-mail Corporativo com Webmail",
        "Instalador 1-Clique (WordPress, etc.) e SSL",
      ],
      group: hostingGroup,
    },
    containers: {
      key: "containers",
      title: "Containers",
      shortTitle: "Containers",
      badge: "Mais Popular",
      description:
        "Deploy ágil e isolado para bots de WhatsApp (Baileys, Evolution API), Discord, APIs Node.js/Python e Docker 24/7.",
      icon: Rocket,
      accentColor: "text-primary",
      bgAccent: "bg-primary/10",
      borderAccent: "border-primary",
      startingPrice: getStartingPrice(containersGroup) ?? 9.9,
      features: [
        "Cluster Docker Swarm de Alta Disponibilidade",
        "Otimizado para Bots de WhatsApp & Discord 24/7",
        "Deploy Automático com Git / GitHub",
        "Templates em 1-Clique com SSL Grátis",
      ],
      group: containersGroup,
    },
    vps: {
      key: "vps",
      title: "VPS",
      shortTitle: "VPS",
      badge: "Performance Dedicada",
      description:
        "Instâncias de nuvem com processadores modernos, discos 100% NVMe, IP próprio dedicado e acesso root SSH irrestrito.",
      icon: Monitor,
      accentColor: "text-amber-500",
      bgAccent: "bg-amber-500/10",
      borderAccent: "border-amber-500/40",
      startingPrice: getStartingPrice(vpsGroup) ?? 69.9,
      features: [
        "Acesso Root Total via Terminal SSH",
        "Endereço IPv4 Dedicado Próprio Incluso",
        "Armazenamento 100% NVMe Ultra-rápido",
        "Proteção Anti-DDoS Avançada Inclusa",
      ],
      group: vpsGroup,
    },
  };
}
