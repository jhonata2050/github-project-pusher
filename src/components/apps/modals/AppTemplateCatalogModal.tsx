import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { Sparkles, Search, CheckCircle2, AlertTriangle, Zap } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { APP_TEMPLATES, type AppTemplate, getRequiredDiskWithMargin } from "@/lib/templates.data";

export interface AppTemplateCatalogModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  app: any;
  applyTemplateMutation: {
    mutate: (template: AppTemplate) => void;
    isPending: boolean;
  };
}

export function AppTemplateCatalogModal({
  open,
  onOpenChange,
  app,
  applyTemplateMutation,
}: AppTemplateCatalogModalProps) {
  const [templateSearch, setTemplateSearch] = useState("");
  const [templateCategory, setTemplateCategory] = useState("all");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-3xl max-w-5xl sm:max-w-6xl max-h-[92vh] flex flex-col p-0 overflow-hidden">
        <DialogHeader className="p-6 pb-4 border-b border-border bg-muted/20">
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-xl font-bold flex items-center gap-2">
                <Sparkles className="size-5 text-amber-500" /> Catálogo de Modelos 1-Clique
              </DialogTitle>
              <DialogDescription className="text-xs mt-1">
                Escolha um modelo pronto para ser instalado instantaneamente neste container ({app?.name} • {app?.memory_limit}MB RAM).
              </DialogDescription>
            </div>
          </div>

          {/* Barra de Pesquisa e Filtro de Categorias */}
          <div className="mt-4 space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input 
                placeholder="Buscar bot, site, linguagem ou ferramenta (ex: WordPress, WhatsApp, Python, N8N)..."
                value={templateSearch}
                onChange={(e) => setTemplateSearch(e.target.value)}
                className="rounded-2xl pl-9 bg-background"
              />
            </div>

            <div className="flex flex-wrap gap-1.5 overflow-x-auto pb-1">
              {[
                { id: "all", label: "Todos" },
                { id: "websites", label: "Sites & WordPress" },
                { id: "languages", label: "Linguagens" },
                { id: "bots", label: "Bots & Comunicação" },
                { id: "automations", label: "Automação & No-Code" },
                { id: "apis", label: "APIs & Backend" },
                { id: "databases", label: "Bancos de Dados" },
              ].map((cat) => (
                <Button
                  key={cat.id}
                  type="button"
                  variant={templateCategory === cat.id ? "default" : "outline"}
                  size="sm"
                  onClick={() => setTemplateCategory(cat.id)}
                  className="rounded-xl text-xs h-7 px-3 font-semibold"
                >
                  {cat.label}
                </Button>
              ))}
            </div>
          </div>
        </DialogHeader>

        {/* Grid de Modelos */}
        <div className="flex-1 overflow-y-auto p-6 grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {APP_TEMPLATES
            .filter((tpl) => {
              const matchCat = templateCategory === "all" || tpl.category === templateCategory;
              const matchSearch = !templateSearch || 
                tpl.name.toLowerCase().includes(templateSearch.toLowerCase()) || 
                tpl.description.toLowerCase().includes(templateSearch.toLowerCase()) ||
                tpl.tags?.some((t) => t.toLowerCase().includes(templateSearch.toLowerCase()));
              return matchCat && matchSearch;
            })
            .map((tpl) => {
              const appDisk = app?.service?.products?.disk_quota_mb || app?.disk_limit_mb || 1536;
              const requiredDiskWithMargin = getRequiredDiskWithMargin(tpl.recommended_disk);
              const isRamOk = (app?.memory_limit || 512) >= (tpl.recommended_ram || 256);
              const isDiskOk = appDisk >= requiredDiskWithMargin;
              const isCpuOk = !tpl.recommended_cpu || (app?.cpu_limit || 0.5) >= tpl.recommended_cpu;
              const isUnderpowered = !isRamOk || !isDiskOk || !isCpuOk;

              let warningReason = "";
              if (!isDiskOk) {
                warningReason = `Requer ${requiredDiskWithMargin}MB Disco (+20%) (Seu plano: ${appDisk}MB)`;
              } else if (!isRamOk) {
                warningReason = `Requer ${tpl.recommended_ram}MB RAM (Seu plano: ${app?.memory_limit}MB)`;
              } else {
                warningReason = `Requer ${tpl.recommended_cpu} vCPU (Seu plano: ${app?.cpu_limit || 0.5} vCPU)`;
              }

              return (
                <Card 
                  key={tpl.id}
                  className="rounded-2xl border p-4 flex flex-col justify-between hover:border-primary/50 transition-all hover:shadow-sm group bg-card"
                >
                  <div>
                    <div className="flex items-start justify-between gap-3 mb-2.5">
                      <div className="h-10 w-10 rounded-xl bg-muted/60 p-2 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                        {tpl.icon.startsWith("http") ? (
                          <img src={tpl.icon} alt={tpl.name} className="h-6 w-6 object-contain" />
                        ) : (
                          <span className="text-xl">{tpl.icon}</span>
                        )}
                      </div>
                      <div className="flex flex-col items-end gap-1 shrink-0">
                        <Badge variant="outline" className="text-[10px] font-mono shrink-0">
                          Min {tpl.recommended_ram || 256}MB RAM
                        </Badge>
                        <Badge variant="secondary" className="text-[9px] font-mono shrink-0 text-muted-foreground">
                          {requiredDiskWithMargin}MB HD (+20%)
                        </Badge>
                      </div>
                    </div>
                    <h4 className="font-bold text-sm text-foreground">{tpl.name}</h4>
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2 leading-relaxed">
                      {tpl.description}
                    </p>
                  </div>

                  <div className="mt-4 pt-3 border-t border-border flex flex-col gap-2">
                    {!isUnderpowered ? (
                      <p className="text-[10px] text-emerald-600 dark:text-emerald-400 flex items-center gap-1 font-medium">
                        <CheckCircle2 className="size-3 shrink-0" />
                        100% Compatível com seu container
                      </p>
                    ) : (
                      <p className="text-[10px] text-amber-600 dark:text-amber-400 flex items-center gap-1 font-medium">
                        <AlertTriangle className="size-3 shrink-0" />
                        {warningReason}
                      </p>
                    )}
                    {isUnderpowered ? (
                      <Link to="/plans" search={{ tab: "paas" }} className="w-full">
                        <Button
                          size="sm"
                          className="w-full rounded-xl text-xs font-bold gap-1.5 bg-amber-600 hover:bg-amber-700 text-white"
                        >
                          <Sparkles className="size-3.5" />
                          Fazer Upgrade do Plano
                        </Button>
                      </Link>
                    ) : (
                      <Button
                        size="sm"
                        disabled={applyTemplateMutation.isPending}
                        onClick={() => applyTemplateMutation.mutate(tpl)}
                        className="w-full rounded-xl text-xs font-bold gap-1.5 bg-primary hover:bg-primary/90"
                      >
                        <Zap className="size-3.5" />
                        {applyTemplateMutation.isPending ? "Iniciando..." : "Instalar Neste App"}
                      </Button>
                    )}
                  </div>
                </Card>
              );
            })}
        </div>
      </DialogContent>
    </Dialog>
  );
}
