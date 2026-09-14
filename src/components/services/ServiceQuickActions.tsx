import {
  Activity,
  Zap,
  Mail,
  Database,
  Globe,
  ShieldCheck,
  User,
} from "lucide-react";
import { isVPSService, getVPSInstance } from "@/lib/service-type";
import { toast } from "sonner";

export interface QuickActionCardProps {
  icon: React.ReactNode;
  title: string;
  onClick: () => void;
}

export function QuickActionCard({ icon, title, onClick }: QuickActionCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex flex-col items-center justify-center p-4 sm:p-6 rounded-3xl bg-card border border-border/50 hover:border-brand/50 hover:shadow-[var(--shadow-card)] transition-all group"
    >
      <div className="p-3 rounded-2xl bg-secondary/50 text-muted-foreground group-hover:text-brand group-hover:bg-brand/10 transition-colors mb-3">
        {icon}
      </div>
      <span className="text-sm font-semibold text-foreground text-center">{title}</span>
    </button>
  );
}

export interface ServiceQuickActionsProps {
  service: any;
  onSSO: (command?: string) => void;
  onNavigateVPS: (vpsId: string) => void;
}

export function ServiceQuickActions({
  service,
  onSSO,
  onNavigateVPS,
}: ServiceQuickActionsProps) {
  if (isVPSService(service)) {
    const handleNavigate = () => {
      const vpsId = getVPSInstance(service)?.id;
      if (vpsId) {
        onNavigateVPS(vpsId);
      } else {
        toast.error("Instância VPS não encontrada.");
      }
    };

    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4">
        <QuickActionCard
          icon={<Activity className="size-6" />}
          title="Monitorar VPS"
          onClick={handleNavigate}
        />
        <QuickActionCard
          icon={<Zap className="size-6" />}
          title="Recursos"
          onClick={handleNavigate}
        />
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4">
      <QuickActionCard
        icon={<Mail className="size-6" />}
        title="E-mails"
        onClick={() => onSSO("CMD_EMAIL_POP")}
      />
      <QuickActionCard
        icon={<Database className="size-6" />}
        title="Bancos de Dados"
        onClick={() => onSSO("CMD_DB")}
      />
      <QuickActionCard
        icon={<Globe className="size-6" />}
        title="Gerenciar DNS"
        onClick={() => onSSO("CMD_DNS_CONTROL")}
      />
      <QuickActionCard
        icon={<ShieldCheck className="size-6" />}
        title="SSL / TLS"
        onClick={() => onSSO("CMD_SSL")}
      />
      <QuickActionCard
        icon={<User className="size-6" />}
        title="Contas FTP"
        onClick={() => onSSO("CMD_FTP")}
      />
    </div>
  );
}
