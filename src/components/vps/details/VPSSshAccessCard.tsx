import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Terminal, Eye, EyeOff } from "lucide-react";
import type { VPSInstanceDetails } from "./types";

interface VPSSshAccessCardProps {
  vps: VPSInstanceDetails;
  ipAddress?: string | null;
  showPassword: boolean;
  setShowPassword: (val: boolean) => void;
}

export function VPSSshAccessCard({
  vps,
  ipAddress,
  showPassword,
  setShowPassword,
}: VPSSshAccessCardProps) {
  return (
    <Card className="rounded-3xl border-2 overflow-hidden">
      <CardHeader className="bg-muted/20 border-b pb-4">
        <CardTitle className="flex items-center gap-2 text-base font-semibold">
          <Terminal className="h-5 w-5 text-primary" /> Acesso SSH
        </CardTitle>
        <CardDescription className="text-xs">
          Dados para conexão via terminal (SSH)
        </CardDescription>
      </CardHeader>
      <CardContent className="p-6 space-y-6">
        <div className="grid grid-cols-2 gap-x-6 gap-y-4">
          <div className="space-y-1.5">
            <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest block opacity-70">
              Host / IP
            </span>
            <div className="font-mono text-sm bg-muted/40 p-3 rounded-xl border border-border text-foreground">
              {vps.ssh_host || ipAddress || "N/A"}
            </div>
          </div>
          <div className="space-y-1.5">
            <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest block opacity-70">
              Porta
            </span>
            <div className="font-mono text-sm bg-muted/40 p-3 rounded-xl border border-border text-foreground">
              {vps.ssh_port || 22}
            </div>
          </div>
          <div className="space-y-1.5">
            <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest block opacity-70">
              Usuário
            </span>
            <div className="font-mono text-sm bg-muted/40 p-3 rounded-xl border border-border text-foreground">
              {vps.ssh_user || "root"}
            </div>
          </div>
          <div className="space-y-1.5">
            <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest block opacity-70">
              Senha
            </span>
            <div className="font-mono text-sm bg-muted/40 p-3 rounded-xl border border-border text-foreground flex items-center justify-between">
              <span className="truncate">
                {showPassword ? vps.ssh_password || "********" : "••••••••"}
              </span>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 hover:bg-muted text-muted-foreground hover:text-foreground"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? (
                  <EyeOff className="h-3.5 w-3.5" />
                ) : (
                  <Eye className="h-3.5 w-3.5" />
                )}
              </Button>
            </div>
          </div>
        </div>
        <div className="pt-2 border-t mt-2">
          <code className="text-[10px] text-muted-foreground font-mono">
            ssh {vps.ssh_user || "root"}@{vps.ssh_host || ipAddress} -p {vps.ssh_port || 22}
          </code>
        </div>
      </CardContent>
    </Card>
  );
}
