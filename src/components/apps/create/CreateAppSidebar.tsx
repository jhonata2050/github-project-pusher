import { Link, useNavigate } from "@tanstack/react-router";
import { AlertTriangle, CheckCircle2, Plus, Sparkles, Zap } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import type { AppTemplate } from "@/lib/templates.data";
import type { DeployType, ResourceCompatibility } from "./types";

export interface CreateAppSidebarProps {
  apps?: any[] | undefined;
  selectedAppId: string;
  onSelectAppId: (id: string) => void;
  activeApp: any;
  selectedTemplate: AppTemplate | null;
  resourceComp: ResourceCompatibility;
  deployType: DeployType;
  appName: string;
  zipFile: File | null;
  isDeploying: boolean;
  onDeploy: () => void;
}

export function CreateAppSidebar({
  apps,
  selectedAppId,
  onSelectAppId,
  activeApp,
  selectedTemplate,
  resourceComp,
  deployType,
  appName,
  zipFile,
  isDeploying,
  onDeploy,
}: CreateAppSidebarProps) {
  const navigate = useNavigate();

  const isDeployDisabled =
    isDeploying ||
    !activeApp ||
    !appName.trim() ||
    (deployType === "zip" && !zipFile);

  return (
    <div className="space-y-6">
      <Card className="rounded-3xl border shadow-sm">
        <CardHeader className="pb-4">
          <CardTitle className="text-base font-bold">Resumo do Deploy</CardTitle>
          <CardDescription className="text-xs">
            Recurso onde a aplicação será instanciada.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 text-xs">
          {apps && apps.length > 0 ? (
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold">Recurso / Serviço Contratado:</Label>
                <Link
                  to="/plans"
                  search={{ tab: "paas" }}
                  className="text-[11px] font-bold text-primary hover:underline flex items-center gap-1"
                >
                  <Plus className="h-3 w-3" /> Contratar novo
                </Link>
              </div>
              <select
                className="w-full h-10 px-3 rounded-xl border bg-background font-semibold text-xs focus:ring-1 focus:ring-primary cursor-pointer"
                value={selectedAppId || apps[0]?.id}
                onChange={(e) => {
                  if (e.target.value === "__new_plan__") {
                    navigate({ to: "/plans", search: { tab: "paas" } });
                    return;
                  }
                  onSelectAppId(e.target.value);
                }}
              >
                {apps.map((a: any) => (
                  <option key={a.id} value={a.id}>
                    {a.name} ({a.memory_limit} MB • {a.cpu_limit} vCPU)
                  </option>
                ))}
                <option value="__new_plan__">➕ Contratar novo plano...</option>
              </select>

              <Link to="/checkout" search={{ service: "containers" }} className="block pt-1">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="w-full rounded-xl text-xs border-dashed gap-1.5 font-semibold text-muted-foreground hover:text-primary hover:border-primary/50 hover:bg-primary/5 cursor-pointer"
                >
                  <Plus className="h-3.5 w-3.5 text-primary" /> Contratar novo plano PaaS
                </Button>
              </Link>
            </div>
          ) : (
            <div className="bg-amber-500/10 border border-amber-500/30 p-3.5 rounded-2xl space-y-2 text-amber-700 dark:text-amber-300">
              <p className="font-bold flex items-center gap-1.5 text-xs">
                <AlertTriangle className="h-4 w-4" /> Nenhum plano ativo
              </p>
              <p className="text-[11px] leading-relaxed">
                Você precisa de um plano de aplicação para iniciar o container.
              </p>
              <Link to="/checkout" search={{ service: "containers" }}>
                <Button size="sm" className="w-full rounded-xl text-xs mt-1 font-bold cursor-pointer">
                  <Plus className="h-3.5 w-3.5 mr-1" /> Contratar Novo Plano PaaS
                </Button>
              </Link>
            </div>
          )}

          {activeApp && (
            <div className="bg-muted/40 p-4 rounded-2xl border space-y-2.5">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Memória Alocada:</span>
                <span className="font-bold">{activeApp.memory_limit} MB RAM</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">CPU Alocada:</span>
                <span className="font-bold">{activeApp.cpu_limit} vCPU</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Espaço em Disco:</span>
                <span className="font-bold">{resourceComp.activeAppDisk} MB HD</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">SSL & Domínio:</span>
                <span className="text-lime-600 font-semibold flex items-center gap-1">
                  <CheckCircle2 className="h-3 w-3" /> Automático
                </span>
              </div>
            </div>
          )}

          {resourceComp.isTemplateUnderpowered && (
            <div className="bg-rose-500/10 border-2 border-rose-500/40 p-3.5 rounded-2xl space-y-2 text-rose-800 dark:text-rose-300">
              <p className="font-bold flex items-center gap-1.5 text-xs text-rose-700 dark:text-rose-400">
                <AlertTriangle className="h-4 w-4" /> Upgrade Obrigatório de Recursos
              </p>
              <p className="text-[11px] leading-relaxed">
                O modelo <strong>{selectedTemplate?.name}</strong> requer no mínimo{" "}
                <strong>{selectedTemplate?.recommended_ram} MB de RAM</strong>,{" "}
                <strong>{selectedTemplate?.recommended_cpu} vCPU</strong> e{" "}
                <strong>{resourceComp.requiredDiskWithMargin} MB de Disco</strong> ({selectedTemplate?.recommended_disk} MB base + 20% de margem de segurança para operação e dados).
              </p>
              <p className="text-[11px] leading-relaxed">
                Seu plano atual fornece: <strong>{activeApp?.memory_limit} MB RAM</strong>,{" "}
                <strong>{activeApp?.cpu_limit || 0.5} vCPU</strong> e{" "}
                <strong>{resourceComp.activeAppDisk} MB de Disco</strong>.
              </p>
              <p className="text-[11px] font-semibold text-rose-600 dark:text-rose-400">
                Faça o upgrade do seu plano para liberar o deploy deste modelo com segurança.
              </p>
            </div>
          )}

          {resourceComp.isTemplateUnderpowered ? (
            <Link to="/plans" search={{ tab: "paas" }} className="block w-full">
              <Button
                type="button"
                className="w-full rounded-xl gap-2 font-bold h-11 text-xs bg-amber-600 hover:bg-amber-700 text-white shadow-sm cursor-pointer"
              >
                <Sparkles className="h-4 w-4" />
                Fazer Upgrade para Instalar
              </Button>
            </Link>
          ) : (
            <Button
              type="button"
              onClick={onDeploy}
              disabled={isDeployDisabled}
              className="w-full rounded-xl gap-2 font-bold h-11 text-xs cursor-pointer"
            >
              <Zap className="h-4 w-4" />
              {isDeploying ? "Criando e Compilando..." : "Criar Aplicação e Iniciar Deploy"}
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
