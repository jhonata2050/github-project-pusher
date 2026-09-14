import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Power, RotateCcw, ShieldAlert } from "lucide-react";

interface VPSAgentAndPowerCardProps {
  installCommand: string;
  isActionPending: boolean;
  onAction: (action: "start" | "stop" | "restart") => void;
}

export function VPSAgentAndPowerCard({
  installCommand,
  isActionPending,
  onAction,
}: VPSAgentAndPowerCardProps) {
  return (
    <div className="grid gap-6 md:grid-cols-2">
      {/* Agente */}
      <Card className="rounded-3xl border-2">
        <CardHeader>
          <CardTitle>EQSAM CLOUD: Agente</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-xs text-muted-foreground leading-relaxed">
            Instale o agente para obter métricas em tempo real e histórico de uso.
          </p>
          <div className="bg-slate-950 p-4 rounded-xl font-mono text-[10px] text-slate-300 border border-slate-800 overflow-x-auto">
            <code>{installCommand}</code>
          </div>
        </CardContent>
      </Card>

      {/* Controles de Energia */}
      <Card className="rounded-3xl border-2">
        <CardHeader>
          <CardTitle>Estado de Energia</CardTitle>
        </CardHeader>
        <CardContent className="flex gap-4">
          <Button
            variant="outline"
            disabled={isActionPending}
            className="flex-1 h-20 rounded-2xl flex-col gap-2 border-lime-500/20 hover:bg-lime-500/10 hover:border-lime-500/40"
            onClick={() => onAction("start")}
          >
            <Power className="h-5 w-5 text-lime-500" /> Ligar
          </Button>
          <Button
            variant="outline"
            disabled={isActionPending}
            className="flex-1 h-20 rounded-2xl flex-col gap-2 border-blue-500/20 hover:bg-blue-500/10 hover:border-blue-500/40"
            onClick={() => onAction("restart")}
          >
            <RotateCcw className="h-5 w-5 text-blue-500" /> Reiniciar
          </Button>
          <Button
            variant="outline"
            disabled={isActionPending}
            className="flex-1 h-20 rounded-2xl flex-col gap-2 border-red-500/20 hover:bg-red-500/10 hover:border-red-500/40"
            onClick={() => onAction("stop")}
          >
            <ShieldAlert className="h-5 w-5 text-red-500" /> Parar
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
