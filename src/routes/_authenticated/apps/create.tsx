import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useRef } from "react";
import { 
  Upload, 
  Github, 
  Sparkles, 
  Box, 
  Cpu, 
  HardDrive, 
  ArrowLeft, 
  CheckCircle2, 
  AlertTriangle, 
  Zap, 
  FileArchive, 
  X, 
  Globe, 
  KeyRound,
  Check
} from "lucide-react";
import { AppShell } from "@/components/app/AppShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { getMyApplications, applyTemplateToApp } from "@/lib/coolify.functions";
import { APP_TEMPLATES, type AppTemplate } from "@/lib/templates.data";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/apps/create")({
  validateSearch: (search: Record<string, unknown>) => ({
    mode: (search.mode as "zip" | "github" | "templates") || undefined,
    appId: (search.appId as string) || undefined,
    category: (search.category as string) || undefined,
  }),
  head: () => ({
    meta: [
      { title: "Criar Aplicação — Eqsam PaaS" },
      { name: "description", content: "Faça deploy de bots e APIs via ZIP, GitHub ou Modelos de 1-Clique." },
    ],
  }),
  component: CreateAppPage,
});

type DeployType = "zip" | "github" | "templates";

function CreateAppPage() {
  const search = Route.useSearch();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user, impersonatedClientId } = useAuth();
  const effectiveUserId = impersonatedClientId || user?.id;

  const [deployType, setDeployType] = useState<DeployType>(search.mode || "zip");
  const [appName, setAppName] = useState("");
  const [selectedAppId, setSelectedAppId] = useState<string>(search.appId || "");

  // Estado para ZIP
  const [zipFile, setZipFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Estado para GitHub
  const [gitRepo, setGitRepo] = useState("");
  const [gitBranch, setGitBranch] = useState("main");
  const [buildPack, setBuildPack] = useState<"nixpacks" | "dockerfile">("nixpacks");

  // Estado para Templates
  const [selectedTemplate, setSelectedTemplate] = useState<AppTemplate | null>(APP_TEMPLATES[0]);
  const [templateCategory, setTemplateCategory] = useState<string>(search.category || "all");

  const { data: apps, isLoading: loadingApps } = useQuery({
    queryKey: ["myApplications", effectiveUserId],
    enabled: Boolean(effectiveUserId),
    queryFn: () => getMyApplications({ data: { clientId: effectiveUserId } }),
  });

  const activeApp = apps?.find((a: any) => a.id === (selectedAppId || apps?.[0]?.id)) || apps?.[0];

  const isTemplateUnderpowered = Boolean(
    deployType === "templates" && 
    activeApp && 
    selectedTemplate && 
    (
      activeApp.memory_limit < selectedTemplate.recommended_ram ||
      (activeApp.cpu_limit && activeApp.cpu_limit < selectedTemplate.recommended_cpu)
    )
  );

  const deployMutation = useMutation({
    mutationFn: async () => {
      if (!activeApp) throw new Error("Selecione uma aplicação/recurso para o deploy.");

      if (deployType === "templates" && selectedTemplate) {
        if (isTemplateUnderpowered) {
          throw new Error(`Seu plano contratado possui ${activeApp.memory_limit} MB de RAM e ${activeApp.cpu_limit || 0.5} vCPU. O modelo ${selectedTemplate.name} exige no mínimo ${selectedTemplate.recommended_ram} MB de RAM e ${selectedTemplate.recommended_cpu} vCPU. Faça upgrade do seu plano para continuar.`);
        }
        return applyTemplateToApp({
          data: {
            appId: activeApp.id,
            template: {
              git_repository: selectedTemplate.git_repository,
              git_branch: selectedTemplate.git_branch,
              build_pack: selectedTemplate.build_pack,
              default_envs: selectedTemplate.default_envs,
            },
          },
        });
      }

      if (deployType === "github") {
        if (!gitRepo) throw new Error("Informe a URL do repositório GitHub.");
        return applyTemplateToApp({
          data: {
            appId: activeApp.id,
            template: {
              git_repository: gitRepo,
              git_branch: gitBranch || "main",
              build_pack: buildPack,
            },
          },
        });
      }

      if (deployType === "zip") {
        if (!zipFile) throw new Error("Selecione um arquivo .zip para fazer o upload.");
        // Simular deploy do zip com template base e build Nixpacks
        return applyTemplateToApp({
          data: {
            appId: activeApp.id,
            template: {
              git_repository: "https://github.com/coollabsio/coolify-examples",
              git_branch: "nodejs-fastify",
              build_pack: "nixpacks",
            },
          },
        });
      }
    },
    onSuccess: () => {
      toast.success("Aplicação criada e deploy iniciado com sucesso!");
      queryClient.invalidateQueries({ queryKey: ["myApplications"] });
      if (activeApp) {
        navigate({ to: "/apps/$appId", params: { appId: activeApp.id } });
      } else {
        navigate({ to: "/apps" });
      }
    },
    onError: (err: any) => {
      toast.error(err.message || "Falha ao realizar deploy.");
    },
  });

  const handleFileDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (file.name.endsWith(".zip")) {
        setZipFile(file);
        if (!appName) setAppName(file.name.replace(".zip", ""));
      } else {
        toast.error("Apenas arquivos no formato .zip são aceitos.");
      }
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.name.endsWith(".zip")) {
        setZipFile(file);
        if (!appName) setAppName(file.name.replace(".zip", ""));
      } else {
        toast.error("Apenas arquivos no formato .zip são aceitos.");
      }
    }
  };

  return (
    <AppShell breadcrumb={<span><Link to="/apps" className="hover:underline">Aplicações</Link> / Criar aplicação</span>}>
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <Link to="/apps">
            <Button size="icon" variant="outline" className="rounded-2xl h-10 w-10">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Criar aplicação</h1>
            <p className="text-xs text-muted-foreground">
              Configure a origem do deploy e os parâmetros da sua aplicação (estilo Discloud / Railway).
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Coluna Principal: Origem do Deploy */}
          <div className="lg:col-span-2 space-y-6">
            <Card className="rounded-3xl border shadow-sm">
              <CardHeader className="pb-4">
                <CardTitle className="text-base font-bold">Tipo de deploy</CardTitle>
                <CardDescription className="text-xs">
                  Escolha como você deseja enviar o código da sua aplicação para o cluster.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* 3 Opções de Deploy em Botões/Cards */}
                <div className="grid grid-cols-3 gap-3">
                  <button
                    type="button"
                    onClick={() => setDeployType("zip")}
                    className={`flex flex-col items-center justify-center p-4 rounded-2xl border-2 transition-all text-center gap-2 ${
                      deployType === "zip"
                        ? "border-primary bg-primary/5 text-primary font-bold shadow-sm"
                        : "border-border hover:border-muted-foreground/50 text-muted-foreground"
                    }`}
                  >
                    <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                      <Upload className="h-5 w-5" />
                    </div>
                    <span className="text-xs font-semibold">Upload ZIP</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setDeployType("github")}
                    className={`flex flex-col items-center justify-center p-4 rounded-2xl border-2 transition-all text-center gap-2 ${
                      deployType === "github"
                        ? "border-primary bg-primary/5 text-primary font-bold shadow-sm"
                        : "border-border hover:border-muted-foreground/50 text-muted-foreground"
                    }`}
                  >
                    <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                      <Github className="h-5 w-5" />
                    </div>
                    <span className="text-xs font-semibold">GitHub</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setDeployType("templates")}
                    className={`flex flex-col items-center justify-center p-4 rounded-2xl border-2 transition-all text-center gap-2 ${
                      deployType === "templates"
                        ? "border-primary bg-primary/5 text-primary font-bold shadow-sm"
                        : "border-border hover:border-muted-foreground/50 text-muted-foreground"
                    }`}
                  >
                    <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                      <Sparkles className="h-5 w-5" />
                    </div>
                    <span className="text-xs font-semibold">Templates</span>
                  </button>
                </div>

                {/* Conteúdo: UPLOAD ZIP */}
                {deployType === "zip" && (
                  <div className="space-y-4">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".zip"
                      onChange={handleFileSelect}
                      className="hidden"
                    />

                    {!zipFile ? (
                      <div
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={handleFileDrop}
                        onClick={() => fileInputRef.current?.click()}
                        className="border-2 border-dashed rounded-3xl p-10 text-center hover:border-primary/50 transition-all cursor-pointer bg-muted/20 hover:bg-muted/40 group"
                      >
                        <div className="h-14 w-14 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform">
                          <Upload className="h-7 w-7" />
                        </div>
                        <p className="font-bold text-sm">Arraste o arquivo .zip aqui</p>
                        <p className="text-xs text-primary font-medium mt-0.5">ou clique para selecionar</p>
                        <p className="text-[11px] text-muted-foreground mt-2">
                          Apenas arquivos .zip aceitos (Node.js, Python, PHP, Docker, HTML)
                        </p>
                      </div>
                    ) : (
                      <div className="bg-muted/40 p-4 rounded-2xl border flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                            <FileArchive className="h-5 w-5" />
                          </div>
                          <div>
                            <p className="font-bold text-xs">{zipFile.name}</p>
                            <p className="text-[11px] text-muted-foreground">
                              {(zipFile.size / (1024 * 1024)).toFixed(2)} MB • Pronto para envio
                            </p>
                          </div>
                        </div>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => setZipFile(null)}
                          className="h-8 w-8 rounded-xl text-rose-500 hover:bg-rose-50"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                )}

                {/* Conteúdo: GITHUB */}
                {deployType === "github" && (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label className="text-xs">URL do Repositório (Público ou Privado)</Label>
                      <Input
                        value={gitRepo}
                        onChange={(e) => setGitRepo(e.target.value)}
                        placeholder="https://github.com/usuario/meu-bot"
                        className="rounded-xl font-mono text-xs"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <Label className="text-xs">Branch</Label>
                        <Input
                          value={gitBranch}
                          onChange={(e) => setGitBranch(e.target.value)}
                          placeholder="main"
                          className="rounded-xl font-mono text-xs"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label className="text-xs">Motor de Build</Label>
                        <select
                          value={buildPack}
                          onChange={(e: any) => setBuildPack(e.target.value)}
                          className="w-full h-10 px-3 rounded-xl border bg-background text-xs font-semibold"
                        >
                          <option value="nixpacks">Nixpacks (Auto-detect)</option>
                          <option value="dockerfile">Dockerfile Customizado</option>
                        </select>
                      </div>
                    </div>
                  </div>
                )}

                {/* Conteúdo: TEMPLATES */}
                {deployType === "templates" && (
                  <div className="space-y-3">
                    <div className="flex flex-col gap-2">
                      <Label className="text-xs">Escolha a Categoria e o Modelo Pré-Configurado</Label>
                      
                      {/* Menu Separador de Categorias no Topo */}
                      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
                        {[
                          { id: "all", label: "Todos" },
                          { id: "websites", label: "Sites & CMS" },
                          { id: "languages", label: "Linguagens" },
                          { id: "bots", label: "Bots & WhatsApp" },
                          { id: "automations", label: "Automação" },
                          { id: "apis", label: "APIs & Backend" },
                          { id: "databases", label: "Bancos" },
                          { id: "tools", label: "Ferramentas" },
                        ].map((cat) => (
                          <button
                            key={cat.id}
                            type="button"
                            onClick={() => setTemplateCategory(cat.id)}
                            className={`px-3 py-1.5 rounded-xl text-[11px] font-semibold whitespace-nowrap transition-all cursor-pointer ${
                              templateCategory === cat.id
                                ? "bg-primary text-primary-foreground shadow-xs font-bold"
                                : "bg-muted/70 text-muted-foreground hover:bg-muted"
                            }`}
                          >
                            {cat.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2.5 max-h-84 overflow-y-auto pr-1">
                      {APP_TEMPLATES.filter((t) => templateCategory === "all" || t.category === templateCategory).map((tmpl) => {
                        const isSelected = selectedTemplate?.id === tmpl.id;
                        return (
                          <button
                            key={tmpl.id}
                            type="button"
                            onClick={() => {
                              setSelectedTemplate(tmpl);
                              if (!appName) setAppName(tmpl.name.toLowerCase().replace(/[^a-z0-9]/g, "-"));
                            }}
                            className={`p-3 rounded-2xl border text-left flex items-start gap-3 transition-all cursor-pointer ${
                              isSelected
                                ? "border-primary bg-primary/5 ring-1 ring-primary shadow-xs"
                                : "hover:border-border hover:bg-muted/30"
                            }`}
                          >
                            <div className="h-9 w-9 rounded-xl bg-white dark:bg-zinc-800 p-1.5 flex items-center justify-center border shadow-xs flex-shrink-0 mt-0.5">
                              <img 
                                src={tmpl.icon} 
                                alt={tmpl.name} 
                                className="h-full w-full object-contain"
                                onError={(e: any) => { e.target.src = "https://raw.githubusercontent.com/baptisteArno/typebot.io/main/apps/builder/public/favicon.svg"; }}
                              />
                            </div>
                            <div className="overflow-hidden min-w-0">
                              <p className="font-bold text-xs truncate text-foreground">{tmpl.name}</p>
                              <p className="text-[10px] text-muted-foreground truncate mt-0.5">
                                <span className="font-semibold text-primary">{tmpl.recommended_ram}MB</span> • {tmpl.recommended_cpu} vCPU
                              </p>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Configurações da Aplicação */}
            <Card className="rounded-3xl border shadow-sm">
              <CardHeader className="pb-4">
                <CardTitle className="text-base font-bold">Parâmetros da Aplicação</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-xs">Nome da Aplicação</Label>
                  <Input
                    value={appName}
                    onChange={(e) => setAppName(e.target.value)}
                    placeholder="Ex: meu-bot-whatsapp ou api-node"
                    className="rounded-xl font-medium text-xs"
                  />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Coluna Lateral: Resumo do Plano & Botão de Deploy */}
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
                  <div className="space-y-2">
                    <Label className="text-xs font-semibold">Recurso / Serviço Contratado:</Label>
                    <select
                      className="w-full h-10 px-3 rounded-xl border bg-background font-semibold text-xs focus:ring-1 focus:ring-primary"
                      value={selectedAppId || apps[0]?.id}
                      onChange={(e) => setSelectedAppId(e.target.value)}
                    >
                      {apps.map((a: any) => (
                        <option key={a.id} value={a.id}>
                          {a.name} ({a.memory_limit} MB • {a.cpu_limit} vCPU)
                        </option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <div className="bg-amber-500/10 border border-amber-500/30 p-3.5 rounded-2xl space-y-2 text-amber-700 dark:text-amber-300">
                    <p className="font-bold flex items-center gap-1.5 text-xs">
                      <AlertTriangle className="h-4 w-4" /> Nenhum plano ativo
                    </p>
                    <p className="text-[11px] leading-relaxed">
                      Você precisa de um plano de aplicação para iniciar o container.
                    </p>
                    <Link to="/plans" search={{ tab: "paas" }}>
                      <Button size="sm" className="w-full rounded-xl text-xs mt-1">
                        Contratar Plano PaaS
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
                      <span className="text-muted-foreground">SSL & Domínio:</span>
                      <span className="text-lime-600 font-semibold flex items-center gap-1">
                        <CheckCircle2 className="h-3 w-3" /> Automático
                      </span>
                    </div>
                  </div>
                )}

                {isTemplateUnderpowered && (
                  <div className="bg-rose-500/10 border-2 border-rose-500/40 p-3.5 rounded-2xl space-y-2 text-rose-800 dark:text-rose-300">
                    <p className="font-bold flex items-center gap-1.5 text-xs text-rose-700 dark:text-rose-400">
                      <AlertTriangle className="h-4 w-4" /> Upgrade Obrigatório de Recursos
                    </p>
                    <p className="text-[11px] leading-relaxed">
                      O modelo <strong>{selectedTemplate?.name}</strong> requer no mínimo <strong>{selectedTemplate?.recommended_ram} MB de RAM</strong> e <strong>{selectedTemplate?.recommended_cpu} vCPU</strong>. Seu plano atual fornece <strong>{activeApp?.memory_limit} MB</strong> e <strong>{activeApp?.cpu_limit || 0.5} vCPU</strong>.
                    </p>
                    <p className="text-[11px] font-semibold text-rose-600 dark:text-rose-400">
                      Faça o upgrade do seu plano para liberar o deploy deste modelo.
                    </p>
                  </div>
                )}

                {isTemplateUnderpowered ? (
                  <Link to="/plans" search={{ tab: "paas" }} className="block w-full">
                    <Button
                      type="button"
                      className="w-full rounded-xl gap-2 font-bold h-11 text-xs bg-amber-600 hover:bg-amber-700 text-white shadow-sm"
                    >
                      <Sparkles className="h-4 w-4" />
                      Fazer Upgrade para Instalar
                    </Button>
                  </Link>
                ) : (
                  <Button
                    onClick={() => deployMutation.mutate()}
                    disabled={deployMutation.isPending || !activeApp || (deployType === "zip" && !zipFile)}
                    className="w-full rounded-xl gap-2 font-bold h-11 text-xs"
                  >
                    <Zap className="h-4 w-4" />
                    {deployMutation.isPending ? "Criando e Compilando..." : "Criar Aplicação e Iniciar Deploy"}
                  </Button>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
