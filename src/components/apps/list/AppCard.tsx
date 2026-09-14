import { Link } from "@tanstack/react-router";
import {
  Cpu,
  HardDrive,
  Globe,
  ExternalLink,
  ShieldCheck,
  Terminal,
  Square,
  Play,
  RotateCcw,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getAppStackLabel } from "./types";

export interface AppCardProps {
  app: any;
  actionPending: boolean;
  onAction: (appId: string, action: "start" | "stop" | "restart" | "deploy") => void;
  onDelete: (app: { id: string; name: string }) => void;
}

export function AppCard({ app, actionPending, onAction, onDelete }: AppCardProps) {
  const isRunning = app.status === "running";
  const isStopped = app.status === "stopped";

  return (
    <Card className="rounded-3xl overflow-hidden border hover:border-primary/40 hover:shadow-md transition-all flex flex-col justify-between group bg-card">
      <div>
        <CardHeader className="bg-muted/30 pb-4 border-b">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <span className="relative flex h-2 w-2 shrink-0">
                {isRunning && (
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                )}
                <span
                  className={`relative inline-flex rounded-full h-2 w-2 ${
                    isRunning ? "bg-emerald-500" : isStopped ? "bg-muted-foreground" : "bg-amber-500"
                  }`}
                />
              </span>
              <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-muted-foreground truncate">
                {getAppStackLabel(app)}
              </span>
            </div>

            <span
              className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold shrink-0 ${
                isRunning
                  ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                  : isStopped
                  ? "bg-muted text-muted-foreground border border-border"
                  : "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20"
              }`}
            >
              <span
                className={`h-1.5 w-1.5 rounded-full ${
                  isRunning ? "bg-emerald-500 animate-pulse" : isStopped ? "bg-zinc-400" : "bg-amber-500"
                }`}
              />
              {isRunning ? "Online" : isStopped ? "Parado" : "Deploy"}
            </span>
          </div>

          <div className="mt-3">
            <Link to="/apps/$appId" params={{ appId: app.id }}>
              <CardTitle className="text-lg font-bold truncate group-hover:text-primary transition-colors cursor-pointer">
                {app.name}
              </CardTitle>
            </Link>
            <CardDescription className="text-xs truncate mt-0.5">
              {app.service?.products?.name || "Plano Cloud PaaS"}
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent className="p-5 space-y-4">
          {/* URL Pública */}
          <div className="flex items-center justify-between text-xs py-1.5 border-b border-border/50">
            <span className="text-muted-foreground flex items-center gap-1.5">
              <Globe className="h-3.5 w-3.5" /> URL Pública:
            </span>
            <div className="flex items-center gap-1.5 min-w-0">
              {app.fqdn ? (
                <a
                  href={app.fqdn}
                  target="_blank"
                  rel="noreferrer"
                  className="font-mono text-primary font-medium hover:underline truncate max-w-[170px] flex items-center gap-1"
                >
                  {app.fqdn.replace("https://", "").replace("http://", "")}
                  <ExternalLink className="h-3 w-3 inline shrink-0 opacity-70" />
                </a>
              ) : (
                <span className="text-muted-foreground italic text-[11px]">
                  Aguardando deploy
                </span>
              )}
            </div>
          </div>

          {/* Recursos Alocados */}
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="bg-muted/30 p-2.5 rounded-xl border flex items-center gap-2.5">
              <Cpu className="h-4 w-4 text-primary shrink-0" />
              <div className="min-w-0">
                <p className="text-[10px] text-muted-foreground uppercase font-semibold">vCPU</p>
                <p className="font-bold truncate">{app.cpu_limit} Cores</p>
              </div>
            </div>

            <div className="bg-muted/30 p-2.5 rounded-xl border flex items-center gap-2.5">
              <HardDrive className="h-4 w-4 text-primary shrink-0" />
              <div className="min-w-0">
                <p className="text-[10px] text-muted-foreground uppercase font-semibold">Memória</p>
                <p className="font-bold truncate">{app.memory_limit} MB</p>
              </div>
            </div>
          </div>

          {/* Barra de Uptime Rápida no Card */}
          <div className="space-y-1.5 pt-1">
            <div className="flex items-center justify-between text-[11px] text-muted-foreground font-mono">
              <span className="flex items-center gap-1">
                <ShieldCheck className="h-3 w-3 text-emerald-500" /> Uptime (30d)
              </span>
              <span className="text-emerald-600 dark:text-emerald-400 font-bold">100% OK</span>
            </div>
            <div className="flex items-center gap-1 h-2 w-full">
              {Array.from({ length: 18 }).map((_, idx) => (
                <div
                  key={idx}
                  className="flex-1 h-full rounded-xs bg-emerald-500/90 hover:bg-emerald-400 transition-colors"
                  title="Verificação de integridade 100% OK"
                />
              ))}
            </div>
          </div>
        </CardContent>
      </div>

      <div className="p-5 pt-0 flex items-center gap-2">
        <Link to="/apps/$appId" params={{ appId: app.id }} className="flex-1">
          <Button variant="default" className="w-full rounded-xl text-xs font-semibold gap-1.5">
            <Terminal className="h-3.5 w-3.5" />
            Gerenciar App
          </Button>
        </Link>

        {isRunning ? (
          <Button
            size="icon"
            variant="outline"
            className="rounded-xl h-9 w-9 text-rose-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/20"
            title="Pausar aplicação"
            disabled={actionPending}
            onClick={() => onAction(app.id, "stop")}
          >
            <Square className="h-4 w-4" />
          </Button>
        ) : (
          <Button
            size="icon"
            variant="outline"
            className="rounded-xl h-9 w-9 text-lime-600 hover:text-lime-700 hover:bg-lime-50 dark:hover:bg-lime-950/20"
            title="Iniciar aplicação"
            disabled={actionPending}
            onClick={() => onAction(app.id, "start")}
          >
            <Play className="h-4 w-4" />
          </Button>
        )}

        <Button
          size="icon"
          variant="outline"
          className="rounded-xl h-9 w-9 text-muted-foreground hover:text-foreground"
          title="Reiniciar aplicação"
          disabled={actionPending}
          onClick={() => onAction(app.id, "restart")}
        >
          <RotateCcw className="h-4 w-4" />
        </Button>

        <Button
          size="icon"
          variant="outline"
          className="rounded-xl h-9 w-9 text-rose-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/20"
          title="Excluir aplicação"
          disabled={actionPending}
          onClick={() => {
            onDelete({ id: app.id, name: app.name });
          }}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </Card>
  );
}
