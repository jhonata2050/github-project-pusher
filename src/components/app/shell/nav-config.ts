import {
  Cog,
  Database,
  Globe,
  LayoutPanelLeft,
  LifeBuoy,
  History,
  Mail,
  MessageSquare,
  Monitor,
  Package,
  Receipt,
  RefreshCw,
  Server,
  ShoppingBag,
  Ticket,
  User as UserIcon,
  Users,
  Wallet,
  Palette,
  Search,
  Share2,
  Box,
} from "lucide-react";

export type IconType = typeof Package;
export type NavLink = { label: string; to: string; icon?: IconType | undefined };
export type NavSection = { label: string; icon: IconType; links: NavLink[] };

export const ADMIN_SECTIONS: NavSection[] = [
  {
    label: "Catálogo",
    icon: ShoppingBag,
    links: [
      { label: "Produtos e planos", to: "/admin/products", icon: Package },
      { label: "Planos VPS", to: "/admin/vps/plans", icon: Monitor },
      { label: "Grupos de produtos", to: "/admin/product-groups", icon: LayoutPanelLeft },
      { label: "Cupons e promoções", to: "/admin/coupons", icon: Ticket },
    ],
  },
  {
    label: "Financeiro",
    icon: Wallet,
    links: [{ label: "Faturas", to: "/admin/invoices", icon: Receipt }],
  },
  {
    label: "Clientes",
    icon: Users,
    links: [
      { label: "Contas de clientes", to: "/admin/clients", icon: Users },
      { label: "Servidores VPS", to: "/admin/vps", icon: Monitor },
    ],
  },
  {
    label: "Atendimento",
    icon: LifeBuoy,
    links: [{ label: "Tickets", to: "/admin/tickets", icon: LifeBuoy }],
  },
  {
    label: "Sistema",
    icon: Cog,
    links: [
      { label: "Servidores DirectAdmin", to: "/admin/servers", icon: Server },
      { label: "Financeiro e Gateways", to: "/admin/finance", icon: Wallet },
      { label: "Gestão de Afiliados", to: "/admin/affiliates", icon: Share2 },
      { label: "E-mails e SMTP", to: "/admin/emails", icon: Mail },
      { label: "Domínios", to: "/admin/domains", icon: Globe },
      { label: "Logs do Sistema", to: "/admin/logs", icon: History },
      { label: "Banco de Dados", to: "/admin/database", icon: Database },
      { label: "WhatsApp e Notificações", to: "/admin/whatsapp", icon: MessageSquare },
      { label: "Branding e Visual", to: "/admin/branding", icon: Palette },
      { label: "Importador WHMCS", to: "/admin/import", icon: RefreshCw },
    ],
  },
];

export const CLIENT_SECTIONS: NavSection[] = [
  {
    label: "Meus serviços",
    icon: Server,
    links: [
      { label: "DirectAdmin", to: "/services", icon: Globe },
      { label: "Containers", to: "/apps", icon: Box },
      { label: "VPS", to: "/vps", icon: Monitor },
      { label: "Meus domínios", to: "/domains", icon: Globe },
      { label: "Registrar domínio", to: "/domains/search", icon: Search },
    ],
  },
  {
    label: "Financeiro",
    icon: Wallet,
    links: [
      { label: "Minha carteira", to: "/wallet", icon: Wallet },
      { label: "Minhas faturas", to: "/invoices", icon: Receipt },
      { label: "Indique e Ganhe (Afiliados)", to: "/affiliates", icon: Share2 },
    ],
  },
  {
    label: "Minha conta",
    icon: UserIcon,
    links: [
      { label: "Meus dados", to: "/profile", icon: UserIcon },
      { label: "Suporte", to: "/tickets", icon: LifeBuoy },
    ],
  },
];
