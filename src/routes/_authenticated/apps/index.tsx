import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { 
  Cpu, 
  Play, 
  Square, 
  RotateCcw, 
  ExternalLink, 
  Activity, 
  Box, 
  Plus, 
  CheckCircle2, 
  AlertTriangle, 
  Clock,
  Terminal,
  Globe,
  HardDrive,
  Sparkles,
  Zap,
  Search,
  Check,
  Bot,
  Database,
  Layers,
  ArrowRight
} from "lucide-react";
import { AppShell } from "@/components/app/AppShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { getMyApplications, executeAppAction, applyTemplateToApp } from "@/lib/coolify.functions";
import { APP_TEMPLATES, type AppTemplate } from "@/lib/templates.data";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/apps/")({
  head: () => ({
    meta: [
      { title: "Aplicações & Bots — Eqsam PaaS" },
      { name: "description", content: "Gerencie seus bots, APIs e containers Docker 24/7 com alta disponibilidade." },
    ],
  }),
  component: ApplicationsListPage,
});

function ApplicationsListPage() {
  const { user, impersonatedClientId } = useAuth();
  const effectiveUserId = impersonatedClientId || user?.id;
  const queryClient = useQueryClient();

  const [mainTab, setMainTab] = useState("my-apps");
  const [templateSearch, setTemplateSearch] = useState("");
  const [templateCategory, setTemplateCategory] = useState<string>("all");
  const [selectedTemplate, setSelectedTemplate] = useState<AppTemplate | null>(null);
  const [selectedAppId, setSelectedAppId] = useState<string>("");
  const [installModalOpen, setInstallModalOpen] = useState(false);

  const { data: apps, isLoading } = useQuery({
    queryKey: ["myApplications", effectiveUserId],
    enabled: Boolean(effectiveUserId),
    queryFn: () => getMyApplications({ data: { clientId: effectiveUserId } }),
  });

  const actionMutation = useMutation({
    mutationFn: async ({ appId, action }: { appId: string; action: "start" | "stop" | "restart" | "deploy" }) => {
      return executeAppAction({ data: { appId, action } });
    },
    onSuccess: (res: any, vars) => {
      const labels: Record<string, string> = {
        start: "iniciada",
        stop: "parada",
        restart: "reiniciada",
        deploy: "em deploy",
      };
      toast.success(`Aplicação ${labels[vars.action] || "atualizada"} com sucesso!`);
      queryClient.invalidateQueries({ queryKey: ["myApplications"] });
    },
    onError: (err: any) => {
      toast.error(err.message || "Erro ao executar ação na aplicação.");
    },
  });

  const installTemplateMutation = useMutation({
    mutationFn: async ({ appId, template }: { appId: string; template: AppTemplate }) => {
      const targetApp = apps?.find((a: any) => a.id === appId);
      if (targetApp) {
        const isUnderpowered = 
          targetApp.memory_limit < template.recommended_ram || 
          (targetApp.cpu_limit && targetApp.cpu_limit < template.recommended_cpu);
        if (isUnderpowered) {
          throw new Error(`Seu plano possui ${targetApp.memory_limit} MB de RAM e ${targetApp.cpu_limit || 0.5} vCPU. O modelo requer no mínimo ${template.recommended_ram} MB de RAM e ${template.recommended_cpu} vCPU. Faça um upgrade para continuar.`);
        }
      }
      return applyTemplateToApp({
        data: {
          appId,
          template: {
            git_repository: template.git_repository,
            git_branch: template.git_branch,
            build_pack: template.build_pack,
            default_envs: template.default_envs,
          },
        },
      });
    },
    onSuccess: (res: any, vars) => {
      toast.success(`Modelo ${vars.template.name} instalado e deploy iniciado com sucesso!`);
      setInstallModalOpen(false);
      setMainTab("my-apps");
      queryClient.invalidateQueries({ queryKey: ["myApplications"] });
    },
    onError: (err: any) => {
      toast.error(err.message || "Erro ao instalar modelo.");
    },
  });

  const handleOpenInstall = (tmpl: AppTemplate) => {
    setSelectedTemplate(tmpl);
    if (apps && apps.length > 0) {
      setSelectedAppId(apps[0].id);
    }
    setInstallModalOpen(true);
  };

  const filteredTemplates = APP_TEMPLATES.filter((t) => {
    const matchesSearch =
      t.name.toLowerCase().includes(templateSearch.toLowerCase()) ||
      t.description.toLowerCase().includes(templateSearch.toLowerCase()) ||
      t.tags.some((tag) => tag.toLowerCase().includes(templateSearch.toLowerCase()));

    const matchesCategory = templateCategory === "all" || t.category === templateCategory;

    return matchesSearch && matchesCategory;
  });

  return (
    <AppShell breadcrumb="Aplicações & Bots">
      <div className="space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Aplicações & Bots (PaaS)</h1>
            <p className="text-muted-foreground">
              Hospede bots de WhatsApp (Evolution API), Discord, APIs Node.js, Python e containers Docker 24/7 com SSL.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Link to="/apps/create">
              <Button className="rounded-xl gap-2 font-semibold">
                <Plus className="h-4 w-4" />
                Criar Aplicação (Deploy)
              </Button>
            </Link>
            <Button 
              variant={mainTab === "templates" ? "default" : "outline"}
              onClick={() => setMainTab(mainTab === "templates" ? "my-apps" : "templates")}
              className="rounded-xl gap-2 font-semibold"
            >
              <Sparkles className="h-4 w-4" />
              {mainTab === "templates" ? "Minhas Aplicações" : "Modelos de 1-Clique"}
            </Button>
            <Link to="/plans">
              <Button variant="outline" className="rounded-xl gap-2 font-medium">
                Contratar Mais Recursos
              </Button>
            </Link>
          </div>
        </div>

        {/* Abas Principais */}
        <Tabs value={mainTab} onValueChange={setMainTab} className="space-y-6">
          <TabsList className="bg-muted/60 p-1 rounded-2xl inline-flex">
            <TabsTrigger value="my-apps" className="rounded-xl gap-2 text-xs font-semibold">
              <Layers className="h-3.5 w-3.5" /> Minhas Aplicações ({apps?.length || 0})
            </TabsTrigger>
            <TabsTrigger value="templates" className="rounded-xl gap-2 text-xs font-semibold">
              <Sparkles className="h-3.5 w-3.5 text-amber-500" /> Catálogo de Modelos (1-Clique)
            </TabsTrigger>
          </TabsList>

          {/* 1. ABA: MINHAS APLICAÇÕES */}
          <TabsContent value="my-apps" className="space-y-6">
            {isLoading ? (
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {[1, 2, 3].map((i) => (
                  <Card key={i} className="rounded-3xl border-none shadow-sm h-64">
                    <CardContent className="p-6">
                      <Skeleton className="h-full w-full rounded-2xl" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : !apps || apps.length === 0 ? (
              <Card className="rounded-3xl border-dashed">
                <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                  <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center text-primary mb-4">
                    <Box className="h-8 w-8" />
                  </div>
                  <CardTitle className="text-xl font-bold">Nenhuma aplicação ativa</CardTitle>
                  <CardDescription className="max-w-md mt-2">
                    Você ainda não possui bots ou aplicações hospedadas. Escolha um modelo no catálogo de 1-Clique ou contrate um plano.
                  </CardDescription>
                  <div className="mt-6 flex flex-wrap gap-3">
                    <Button onClick={() => setMainTab("templates")} className="rounded-xl gap-2">
                      <Sparkles className="h-4 w-4" />
                      Explorar Modelos Prontos
                    </Button>
                    <Link to="/plans">
                      <Button variant="outline" className="rounded-xl gap-2">
                        <Plus className="h-4 w-4" />
                        Ver Planos PaaS
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {apps.map((app: any) => {
                  const isRunning = app.status === "running";
                  const isStopped = app.status === "stopped";

                  return (
                    <Card key={app.id} className="rounded-3xl overflow-hidden border-2 hover:border-primary/50 transition-all flex flex-col justify-between group shadow-sm">
                      <div>
                        <CardHeader className="bg-muted/40 pb-4 border-b">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="relative flex h-2.5 w-2.5">
                                {isRunning && (
                                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-lime-400 opacity-75"></span>
                                )}
                                <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${isRunning ? "bg-lime-500" : isStopped ? "bg-muted-foreground" : "bg-amber-500"}`} />
                              </span>
                              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                {app.build_pack?.toUpperCase() || "CONTAINER"}
                              </span>
                            </div>
                            <Badge variant={isRunning ? "default" : "secondary"} className="rounded-full text-xs font-medium">
                              {isRunning ? "Online 24/7" : isStopped ? "Parado" : "Processando"}
                            </Badge>
                          </div>

                          <div className="mt-3">
                            <CardTitle className="text-lg font-bold truncate group-hover:text-primary transition-colors">
                              {app.name}
                            </CardTitle>
                            <CardDescription className="text-xs truncate mt-0.5">
                              {app.service?.products?.name || "Plano Cloud PaaS"}
                            </CardDescription>
                          </div>
                        </CardHeader>

                        <CardContent className="p-6 space-y-4">
                          <div className="flex items-center justify-between text-xs py-1.5 border-b border-border/50">
                            <span className="text-muted-foreground flex items-center gap-1.5">
                              <Globe className="h-3.5 w-3.5" /> URL Pública:
                            </span>
                            <a 
                              href={app.fqdn} 
                              target="_blank" 
                              rel="noreferrer" 
                              className="font-mono text-primary font-medium hover:underline truncate max-w-[180px] flex items-center gap-1"
                            >
                              {app.fqdn.replace("https://", "").replace("http://", "")}
                              <ExternalLink className="h-3 w-3 inline flex-shrink-0" />
                            </a>
                          </div>

                          <div className="grid grid-cols-2 gap-2 text-xs">
                            <div className="bg-muted/40 p-2.5 rounded-xl border flex items-center gap-2">
                              <Cpu className="h-4 w-4 text-muted-foreground" />
                              <div>
                                <p className="text-[10px] text-muted-foreground uppercase font-semibold">vCPU</p>
                                <p className="font-bold">{app.cpu_limit} Cores</p>
                              </div>
                            </div>

                            <div className="bg-muted/40 p-2.5 rounded-xl border flex items-center gap-2">
                              <HardDrive className="h-4 w-4 text-muted-foreground" />
                              <div>
                                <p className="text-[10px] text-muted-foreground uppercase font-semibold">Memória</p>
                                <p className="font-bold">{app.memory_limit} MB</p>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </div>

                      <div className="p-6 pt-0 flex items-center gap-2">
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
                            disabled={actionMutation.isPending}
                            onClick={() => actionMutation.mutate({ appId: app.id, action: "stop" })}
                          >
                            <Square className="h-4 w-4" />
                          </Button>
                        ) : (
                          <Button
                            size="icon"
                            variant="outline"
                            className="rounded-xl h-9 w-9 text-lime-600 hover:text-lime-700 hover:bg-lime-50 dark:hover:bg-lime-950/20"
                            title="Iniciar aplicação"
                            disabled={actionMutation.isPending}
                            onClick={() => actionMutation.mutate({ appId: app.id, action: "start" })}
                          >
                            <Play className="h-4 w-4" />
                          </Button>
                        )}

                        <Button
                          size="icon"
                          variant="outline"
                          className="rounded-xl h-9 w-9 text-muted-foreground hover:text-foreground"
                          title="Reiniciar aplicação"
                          disabled={actionMutation.isPending}
                          onClick={() => actionMutation.mutate({ appId: app.id, action: "restart" })}
                        >
                          <RotateCcw className="h-4 w-4" />
                        </Button>
                      </div>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>

          {/* 2. ABA: CATÁLOGO DE MODELOS (1-CLIQUE) */}
          <TabsContent value="templates" className="space-y-6">
            {/* Barra de Filtros e Busca Reorganizada */}
            <div className="bg-card p-5 rounded-3xl border shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row gap-3 justify-between items-start sm:items-center">
                <div>
                  <h2 className="text-base font-bold tracking-tight">Catálogo de Modelos Pré-Configurados</h2>
                  <p className="text-xs text-muted-foreground">Escolha uma stack, bot ou banco de dados e faça deploy em 1-clique.</p>
                </div>
                <div className="relative w-full sm:w-72">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar modelos, tags, banco..."
                    value={templateSearch}
                    onChange={(e) => setTemplateSearch(e.target.value)}
                    className="pl-9 rounded-2xl text-xs h-9 bg-muted/30 border-border focus:bg-background"
                  />
                </div>
              </div>

              {/* Categorias em Pílulas com Contador */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 pt-2 border-t no-scrollbar">
                {[
                  { id: "all", label: "Todos", count: APP_TEMPLATES.length },
                  { id: "websites", label: "Sites & CMS", count: APP_TEMPLATES.filter(t => t.category === "websites").length },
                  { id: "languages", label: "Linguagens", count: APP_TEMPLATES.filter(t => t.category === "languages").length },
                  { id: "bots", label: "Bots & WhatsApp", count: APP_TEMPLATES.filter(t => t.category === "bots").length },
                  { id: "automations", label: "Automação", count: APP_TEMPLATES.filter(t => t.category === "automations").length },
                  { id: "apis", label: "APIs", count: APP_TEMPLATES.filter(t => t.category === "apis").length },
                  { id: "databases", label: "Bancos de Dados", count: APP_TEMPLATES.filter(t => t.category === "databases").length },
                  { id: "tools", label: "Ferramentas", count: APP_TEMPLATES.filter(t => t.category === "tools").length },
                ].map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setTemplateCategory(cat.id)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer ${
                      templateCategory === cat.id
                        ? "bg-primary text-primary-foreground shadow-xs font-bold"
                        : "bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground"
                    }`}
                  >
                    <span>{cat.label}</span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-md font-mono ${
                      templateCategory === cat.id ? "bg-primary-foreground/20 text-primary-foreground" : "bg-background text-muted-foreground border"
                    }`}>
                      {cat.count}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Grid dos Cards de Modelos */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filteredTemplates.map((tmpl) => {
                const categoryLabels: Record<string, string> = {
                  websites: "Sites & CMS",
                  languages: "Linguagens",
                  bots: "Bots & WhatsApp",
                  automations: "Automação",
                  apis: "APIs & Backend",
                  databases: "Bancos de Dados",
                  tools: "Ferramentas",
                };

                return (
                  <Card key={tmpl.id} className="rounded-3xl border hover:border-primary/50 transition-all flex flex-col justify-between group shadow-xs hover:shadow-md bg-card">
                    <CardHeader className="p-5 pb-3">
                      <div className="flex items-center justify-between mb-3">
                        <div className="h-12 w-12 rounded-2xl bg-muted/60 p-2.5 flex items-center justify-center border group-hover:border-primary/30 group-hover:scale-105 transition-all">
                          <img 
                            src={tmpl.icon} 
                            alt={tmpl.name} 
                            className="h-full w-full object-contain"
                            onError={(e: any) => { e.target.src = "https://raw.githubusercontent.com/baptisteArno/typebot.io/main/apps/builder/public/favicon.svg"; }}
                          />
                        </div>
                        <Badge variant="outline" className="rounded-xl text-[10px] font-semibold text-muted-foreground bg-muted/30 px-2.5 py-0.5 border">
                          {categoryLabels[tmpl.category] || tmpl.category}
                        </Badge>
                      </div>

                      <CardTitle className="text-sm font-bold group-hover:text-primary transition-colors leading-tight line-clamp-1">
                        {tmpl.name}
                      </CardTitle>
                      <CardDescription className="text-xs line-clamp-2 mt-1.5 leading-5 text-muted-foreground min-h-[2.5rem]">
                        {tmpl.description}
                      </CardDescription>
                    </CardHeader>

                    <CardContent className="p-5 pt-0 space-y-3.5 mt-auto">
                      <div className="flex flex-wrap gap-1 min-h-[1.375rem]">
                        {tmpl.tags.slice(0, 4).map((tag) => (
                          <span key={tag} className="text-[10px] bg-muted/60 text-muted-foreground px-2 py-0.5 rounded-md font-mono">
                            {tag}
                          </span>
                        ))}
                      </div>

                      <div className="pt-3.5 border-t flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-[10px] font-bold text-muted-foreground/80 tracking-wide uppercase">Mínimo Recomendado</p>
                          <div className="flex items-center gap-1.5 font-bold text-xs text-foreground mt-1">
                            <span className="bg-primary/10 text-primary px-2 py-0.5 rounded-md font-mono text-[11px] font-semibold">{tmpl.recommended_ram} MB</span>
                            <span className="text-muted-foreground font-light">•</span>
                            <span className="bg-muted px-2 py-0.5 rounded-md font-mono text-[11px] text-muted-foreground font-semibold">{tmpl.recommended_cpu} vCPU</span>
                          </div>
                        </div>
                        <Link to="/apps/create" search={{ mode: "templates", category: tmpl.category }}>
                          <Button 
                            size="sm" 
                            className="rounded-xl text-xs gap-1.5 font-bold shadow-xs px-4 h-9 shrink-0"
                          >
                            <Zap className="h-3.5 w-3.5 fill-current" /> Fazer Deploy
                          </Button>
                        </Link>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}

              {filteredTemplates.length === 0 && (
                <div className="col-span-full p-12 text-center bg-card rounded-3xl border space-y-3">
                  <Sparkles className="h-8 w-8 text-muted-foreground/40 mx-auto" />
                  <p className="font-bold text-sm">Nenhum modelo encontrado</p>
                  <p className="text-xs text-muted-foreground">Tente buscar por outro termo ou categoria.</p>
                  <Button variant="outline" size="sm" onClick={() => { setTemplateSearch(""); setTemplateCategory("all"); }} className="rounded-xl text-xs">
                    Limpar Filtros
                  </Button>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>

        {/* Modal Inteligente de Instalação com Validação de Recursos e Aviso Prévio */}
        <Dialog open={installModalOpen} onOpenChange={setInstallModalOpen}>
          <DialogContent className="rounded-3xl max-w-lg">
            <DialogHeader>
              <div className="flex items-center gap-3 mb-2">
                <div className="h-10 w-10 rounded-xl bg-muted p-2 flex items-center justify-center border">
                  <img 
                    src={selectedTemplate?.icon} 
                    alt={selectedTemplate?.name} 
                    className="h-full w-full object-contain"
                  />
                </div>
                <div>
                  <DialogTitle className="text-xl font-bold">
                    Instalar {selectedTemplate?.name}
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
              {(() => {
                const targetApp = apps?.find((a: any) => a.id === (selectedAppId || apps?.[0]?.id)) || apps?.[0];
                const isUnderpowered = targetApp && selectedTemplate && (
                  targetApp.memory_limit < selectedTemplate.recommended_ram ||
                  (targetApp.cpu_limit && targetApp.cpu_limit < selectedTemplate.recommended_cpu)
                );

                if (isUnderpowered) {
                  return (
                    <div className="bg-rose-500/10 border-2 border-rose-500/40 p-4 rounded-2xl space-y-2 text-rose-800 dark:text-rose-300 animate-in fade-in">
                      <div className="flex items-center gap-2 font-bold text-sm text-rose-700 dark:text-rose-400">
                        <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                        Upgrade Obrigatório de Recursos
                      </div>
                      <p className="leading-relaxed text-[11px]">
                        Sua aplicação possui <strong>{targetApp.memory_limit} MB de RAM</strong> e <strong>{targetApp.cpu_limit || 0.5} vCPU</strong>, mas o modelo <strong>{selectedTemplate?.name}</strong> requer no mínimo <strong>{selectedTemplate?.recommended_ram} MB de RAM</strong> e <strong>{selectedTemplate?.recommended_cpu} vCPU</strong>.
                      </p>
                      <p className="text-[11px] font-semibold text-rose-600 dark:text-rose-400">
                        A instalação está bloqueada neste recurso. Faça o upgrade do seu plano para liberar este modelo.
                      </p>
                    </div>
                  );
                }

                if (targetApp && selectedTemplate) {
                  return (
                    <div className="bg-lime-500/10 border border-lime-500/30 p-3 rounded-2xl flex items-center gap-2.5 text-lime-700 dark:text-lime-400">
                      <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
                      <span className="text-[11px] font-medium">
                        Seus recursos ({targetApp.memory_limit} MB • {targetApp.cpu_limit || 0.5} vCPU) são 100% compatíveis com este modelo!
                      </span>
                    </div>
                  );
                }

                return null;
              })()}

              <div className="bg-muted/40 p-3.5 rounded-2xl border space-y-1.5">
                <p className="font-semibold text-foreground">Especificações Mínimas:</p>
                <div className="grid grid-cols-2 gap-2 text-muted-foreground">
                  <p>• <strong>RAM Mínima:</strong> {selectedTemplate?.recommended_ram} MB</p>
                  <p>• <strong>vCPU Mínima:</strong> {selectedTemplate?.recommended_cpu} Cores</p>
                  <p>• <strong>Build Pack:</strong> {selectedTemplate?.build_pack.toUpperCase()}</p>
                  <p>• <strong>Porta Padrão:</strong> {selectedTemplate?.default_port}</p>
                </div>
              </div>
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button variant="outline" onClick={() => setInstallModalOpen(false)} className="rounded-xl text-xs">
                Cancelar
              </Button>

              {apps && apps.length > 0 ? (
                <>
                  {(() => {
                    const targetApp = apps?.find((a: any) => a.id === (selectedAppId || apps?.[0]?.id)) || apps?.[0];
                    const isUnderpowered = targetApp && selectedTemplate && (
                      targetApp.memory_limit < selectedTemplate.recommended_ram ||
                      (targetApp.cpu_limit && targetApp.cpu_limit < selectedTemplate.recommended_cpu)
                    );

                    if (isUnderpowered) {
                      return (
                        <Link to="/plans" search={{ tab: "paas" }} className="w-full sm:w-auto">
                          <Button variant="default" className="rounded-xl text-xs font-semibold gap-1.5 w-full bg-amber-600 hover:bg-amber-700 text-white">
                            <Sparkles className="h-3.5 w-3.5" /> Fazer Upgrade do Plano
                          </Button>
                        </Link>
                      );
                    }

                    return (
                      <Button
                        className="rounded-xl text-xs font-semibold gap-1.5"
                        disabled={installTemplateMutation.isPending}
                        onClick={() => {
                          if (targetApp && selectedTemplate) {
                            installTemplateMutation.mutate({ appId: targetApp.id, template: selectedTemplate });
                          }
                        }}
                      >
                        <Zap className="h-3.5 w-3.5" /> Confirmar e Iniciar Deploy
                      </Button>
                    );
                  })()}
                </>
              ) : (
                <Link to="/plans" search={{ tab: "paas" }} className="w-full sm:w-auto">
                  <Button className="rounded-xl text-xs font-semibold gap-1.5 w-full">
                    Contratar Plano Compatível <ArrowRight className="h-3.5 w-3.5" />
                  </Button>
                </Link>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AppShell>
  );
}
