import { Link } from "@tanstack/react-router";
import { AlertTriangle, CheckCircle2, Sparkles, Zap, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { type AppTemplate, getRequiredDiskWithMargin } from "@/lib/templates.data";

export interface InstallTemplateModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedTemplate: AppTemplate | null;
  apps: any[] | undefined;
  selectedAppId: string;
  setSelectedAppId: (id: string) => void;
  isInstalling: boolean;
  onConfirmInstall: (appId: string, template: AppTemplate) => void;
}

export function InstallTemplateModal({
  open,
  onOpenChange,
  selectedTemplate,
  apps,
  selectedAppId,
  setSelectedAppId,
  isInstalling,
  onConfirmInstall,
}: InstallTemplateModalProps) {
  if (!selectedTemplate) return null;

  const targetApp = apps?.find((a: any) => a.id === (selectedAppId || apps?.[0]?.id)) || apps?.[0];
  const targetDisk = (targetApp as any)?.service?.products?.disk_quota_mb || targetApp?.disk_limit_mb || 1536;
  const requiredDisk = getRequiredDiskWithMargin(selectedTemplate.recommended_disk);
  const isRamUnder = targetApp && targetApp.memory_limit < selectedTemplate.recommended_ram;
  const isCpuUnder = targetApp && targetApp.cpu_limit && targetApp.cpu_limit < selectedTemplate.recommended_cpu;
  const isDiskUnder = targetApp && targetDisk < requiredDisk;
  const isUnderpowered = Boolean(targetApp && (isRamUnder || isCpuUnder || isDiskUnder));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-3xl max-w-lg">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="h-10 w-10 rounded-xl bg-muted p-2 flex items-center justify-center border">
              <img
                src={selectedTemplate.icon}
                alt={selectedTemplate.name}
                className="h-full w-full object-contain"
              />
            </div>
            <div>
              <DialogTitle className="text-xl font-bold">
                Instalar {selectedTemplate.name}
              </DialogTitle>
              <DialogDescription className="text-xs">
                Deploy automatizado no seu container com SSL e Docker.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-2 text-xs">
          {/* Seleção da Aplicação Alvo */}
          {apps && apps.length > 0 ? (
            <div className="space-y-2">
              <label className="font-semibold text-foreground">Instalar em qual aplicação ativa?</label>
              <select
                className="w-full h-10 px-3 rounded-xl border bg-background font-medium text-xs focus:ring-1 focus:ring-primary"
                value={selectedAppId || apps[0]?.id}
                onChange={(e) => setSelectedAppId(e.target.value)}
              >
                {apps.map((a: any) => (
                  <option key={a.id} value={a.id}>
                    {a.name} ({a.memory_limit} MB RAM • {a.cpu_limit} vCPU)
                  </option>
                ))}
              </select>
            </div>
          ) : null}

          {/* Box de Alerta se os Recursos Forem Inferiores ao Mínimo */}
          {isUnderpowered ? (
            <div className="bg-rose-500/10 border-2 border-rose-500/40 p-4 rounded-2xl space-y-2 text-rose-800 dark:text-rose-300 animate-in fade-in">
              <div className="flex items-center gap-2 font-bold text-sm text-rose-700 dark:text-rose-400">
                <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                Upgrade Obrigatório de Recursos
              </div>
              <p className="leading-relaxed text-[11px]">
                Sua aplicação possui <strong>{targetApp?.memory_limit} MB de RAM</strong>, <strong>{targetApp?.cpu_limit || 0.5} vCPU</strong> e <strong>{targetDisk} MB de Disco</strong>, mas o modelo <strong>{selectedTemplate.name}</strong> requer no mínimo <strong>{selectedTemplate.recommended_ram} MB de RAM</strong>, <strong>{selectedTemplate.recommended_cpu} vCPU</strong> e <strong>{requiredDisk} MB de Disco</strong> ({selectedTemplate.recommended_disk} MB base + 20% de margem de segurança).
              </p>
              <p className="text-[11px] font-semibold text-rose-600 dark:text-rose-400">
                A instalação está bloqueada neste recurso. Faça o upgrade do seu plano para liberar este modelo com segurança.
              </p>
            </div>
          ) : targetApp ? (
            <div className="bg-lime-500/10 border border-lime-500/30 p-3 rounded-2xl flex items-center gap-2.5 text-lime-700 dark:text-lime-400">
              <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
              <span className="text-[11px] font-medium">
                Seus recursos ({targetApp.memory_limit} MB • {targetApp.cpu_limit || 0.5} vCPU • {targetDisk} MB HD) são 100% compatíveis com este modelo!
              </span>
            </div>
          ) : null}

          <div className="bg-muted/40 p-3.5 rounded-2xl border space-y-1.5">
            <p className="font-semibold text-foreground">Especificações Mínimas:</p>
            <div className="grid grid-cols-2 gap-2 text-muted-foreground">
              <p>• <strong>RAM Mínima:</strong> {selectedTemplate.recommended_ram} MB</p>
              <p>• <strong>vCPU Mínima:</strong> {selectedTemplate.recommended_cpu} Cores</p>
              <p>• <strong>Disco Mínimo:</strong> {requiredDisk} MB (+20%)</p>
              <p>• <strong>Porta Padrão:</strong> {selectedTemplate.default_port}</p>
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)} className="rounded-xl text-xs">
            Cancelar
          </Button>

          {apps && apps.length > 0 ? (
            isUnderpowered ? (
              <Link to="/checkout" search={{ service: "containers" }} className="w-full sm:w-auto">
                <Button variant="default" className="rounded-xl text-xs font-semibold gap-1.5 w-full bg-amber-600 hover:bg-amber-700 text-white">
                  <Sparkles className="h-3.5 w-3.5" /> Fazer Upgrade do Plano
                </Button>
              </Link>
            ) : (
              <Button
                className="rounded-xl text-xs font-semibold gap-1.5"
                disabled={isInstalling}
                onClick={() => {
                  if (targetApp) {
                    onConfirmInstall(targetApp.id, selectedTemplate);
                  }
                }}
              >
                <Zap className="h-3.5 w-3.5" /> Confirmar e Iniciar Deploy
              </Button>
            )
          ) : (
            <Link to="/checkout" search={{ service: "containers" }} className="w-full sm:w-auto">
              <Button className="rounded-xl text-xs font-semibold gap-1.5 w-full">
                Contratar Plano Compatível <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </Link>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
