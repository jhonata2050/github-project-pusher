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
import { getMyApplications, applyTemplateToApp, createAndDeployApplication } from "@/lib/coolify.functions";
import { APP_TEMPLATES, type AppTemplate } from "@/lib/templates.data";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

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
  const [targetMode, setTargetMode] = useState<"new" | "overwrite">(search.appId ? "overwrite" : "new");
  const [selectedAppId, setSelectedAppId] = useState<string>(search.appId || "");
  const [isConfirmOverwriteOpen, setIsConfirmOverwriteOpen] = useState(false);

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
    staleTime: 1000 * 60 * 5,
    refetchOnWindowFocus: false,
  });

  const activeApp = apps?.find((a: any) => a.id === (selectedAppId || apps?.[0]?.id)) || apps?.[0];

  const isTemplateUnderpowered = Boolean(
    deployType === "templates" && 
    targetMode === "overwrite" &&
    activeApp && 
    selectedTemplate && 
    (
      activeApp.memory_limit < selectedTemplate.recommended_ram ||
      (activeApp.cpu_limit && activeApp.cpu_limit < selectedTemplate.recommended_cpu)
    )
  );

  const executeDeploy = async () => {
    if (targetMode === "new") {
      // 1. CRIAR NOVO SLOT / CLUSTER ISOLADO (NÃO APAGA NADA)
      if (deployType === "github" && !gitRepo) {
        throw new Error("Informe a URL do repositório GitHub.");
      }
      if (deployType === "zip" && !zipFile) {
        throw new Error("Selecione um arquivo .zip para fazer o upload.");
      }

      const res = await createAndDeployApplication({
        data: {
          name: appName.trim() || undefined,
          deployType,
          template: deployType === "templates" && selectedTemplate ? {
            name: selectedTemplate.name,
            git_repository: selectedTemplate.git_repository,
            git_branch: selectedTemplate.git_branch,
            build_pack: selectedTemplate.build_pack,
            default_envs: selectedTemplate.default_envs,
            default_port: selectedTemplate.default_port,
            recommended_ram: selectedTemplate.recommended_ram,
            recommended_cpu: selectedTemplate.recommended_cpu,
          } : undefined,
          github: deployType === "github" ? {
            gitRepo,
            gitBranch: gitBranch || "main",
            buildPack,
          } : undefined,
        }
      });
      return res;
    } else {
      // 2. SOBRESCREVER APLICAÇÃO EXISTENTE (COM CONFIRMAÇÃO DO CLIENTE)
      if (!activeApp) throw new Error("Selecione uma aplicação existente para substituir.");

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
              default_port: selectedTemplate.default_port,
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
    }
  };

  const deployMutation = useMutation({
    mutationFn: executeDeploy,
    onSuccess: (res: any) => {
      toast.success(
        targetMode === "new"
          ? `Nova aplicação "${res?.name || appName || 'App'}" criada em cluster isolado com sucesso!`
          : "Aplicação atualizada com sucesso!"
      );
      queryClient.invalidateQueries({ queryKey: ["myApplications"] });
      const targetId = res?.id || activeApp?.id;
      if (targetId) {
        navigate({ to: "/apps/$appId", params: { appId: targetId } });
      } else {
        navigate({ to: "/apps" });
      }
    },
    onError: (err: any) => {
      toast.error(err.message || "Falha ao realizar deploy.");
    },
  });

  const handleDeployClick = () => {
    if (targetMode === "overwrite") {
      setIsConfirmOverwriteOpen(true);
    } else {
      deployMutation.mutate();
    }
  };

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
                {/* Destino do Deploy: Novo Slot Isolado vs Substituir Existente */}
                <div className="space-y-2">
                  <Label className="text-xs font-semibold">Destino do Deploy:</Label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setTargetMode("new")}
                      className={`p-3 rounded-2xl border text-left flex flex-col justify-between transition-all cursor-pointer ${
                        targetMode === "new"
                          ? "border-primary bg-primary/5 ring-1 ring-primary font-bold shadow-xs text-primary"
                          : "hover:border-border text-muted-foreground"
                      }`}
                    >
                      <span className="text-xs font-bold flex items-center gap-1.5">
                        <Sparkles className="h-3.5 w-3.5" /> Novo Slot Isolado
                      </span>
                      <span className="text-[10px] font-normal text-muted-foreground mt-1">
                        Protege serviços existentes
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setTargetMode("overwrite")}
                      className={`p-3 rounded-2xl border text-left flex flex-col justify-between transition-all cursor-pointer ${
                        targetMode === "overwrite"
                          ? "border-amber-500 bg-amber-500/10 ring-1 ring-amber-500 font-bold shadow-xs text-amber-700 dark:text-amber-300"
                          : "hover:border-border text-muted-foreground"
                      }`}
                    >
                      <span className="text-xs font-bold flex items-center gap-1.5">
                        <AlertTriangle className="h-3.5 w-3.5" /> Substituir App
                      </span>
                      <span className="text-[10px] font-normal text-muted-foreground mt-1">
                        Sobrescreve código atual
                      </span>
                    </button>
                  </div>
                </div>

                {targetMode === "overwrite" && (
                  <div className="space-y-3 pt-1">
                    {apps && apps.length > 0 ? (
                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold text-amber-800 dark:text-amber-300">Aplicação que será substituída:</Label>
                        <select
                          className="w-full h-10 px-3 rounded-xl border-2 border-amber-500/40 bg-background font-semibold text-xs focus:ring-1 focus:ring-amber-500"
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
                          <AlertTriangle className="h-4 w-4" /> Nenhuma aplicação encontrada para substituir
                        </p>
                      </div>
                    )}

                    <div className="bg-amber-500/10 border border-amber-500/30 p-3 rounded-xl text-[11px] text-amber-800 dark:text-amber-300 leading-relaxed">
                      ⚠️ <strong>Atenção:</strong> Ao substituir uma aplicação, os arquivos, código e repositório anteriores serão substituídos pelo novo deploy.
                    </div>
                  </div>
                )}

                {targetMode === "new" && (
                  <div className="bg-primary/5 border border-primary/20 p-3 rounded-xl text-[11px] text-primary leading-relaxed">
                    ✨ <strong>Slot Isolado:</strong> Sua nova aplicação receberá um nome e subdomínio exclusivos, rodando em um container independente sem risco de afetar outros serviços.
                  </div>
                )}

                <div className="bg-muted/40 p-4 rounded-2xl border space-y-2.5">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Memória Alocada:</span>
                    <span className="font-bold">{selectedTemplate?.recommended_ram || activeApp?.memory_limit || 512} MB RAM</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">CPU Alocada:</span>
                    <span className="font-bold">{selectedTemplate?.recommended_cpu || activeApp?.cpu_limit || 1.0} vCPU</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">SSL & Domínio:</span>
                    <span className="text-lime-600 font-semibold flex items-center gap-1">
                      <CheckCircle2 className="h-3 w-3" /> Automático
                    </span>
                  </div>
                </div>

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
                    onClick={handleDeployClick}
                    disabled={deployMutation.isPending || (deployType === "zip" && !zipFile) || (targetMode === "overwrite" && !activeApp)}
                    className="w-full rounded-xl gap-2 font-bold h-11 text-xs"
                  >
                    <Zap className="h-4 w-4" />
                    {deployMutation.isPending 
                      ? "Criando e Compilando..." 
                      : targetMode === "new" 
                        ? "Criar Novo Slot e Iniciar Deploy" 
                        : "Substituir Aplicação Selecionada"}
                  </Button>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Modal de Confirmação para Sobrescrever Aplicação */}
        <AlertDialog open={isConfirmOverwriteOpen} onOpenChange={setIsConfirmOverwriteOpen}>
          <AlertDialogContent className="rounded-3xl">
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2 text-amber-600">
                <AlertTriangle className="h-5 w-5" /> Confirmar Substituição de Aplicação
              </AlertDialogTitle>
              <AlertDialogDescription className="text-xs space-y-2">
                <p>
                  Você está prestes a substituir todo o código, arquivos e configurações da aplicação <strong>{activeApp?.name}</strong> pelo novo deploy.
                </p>
                <p className="font-semibold text-rose-600">
                  Esta ação é irreversível e apagará a versão anterior rodando nesta aplicação!
                </p>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="rounded-xl text-xs">Cancelar</AlertDialogCancel>
              <AlertDialogAction
                className="rounded-xl text-xs bg-rose-600 hover:bg-rose-700 text-white font-bold"
                onClick={() => {
                  setIsConfirmOverwriteOpen(false);
                  deployMutation.mutate();
                }}
              >
                Sim, Sobrescrever Aplicação
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </AppShell>
  );
}
