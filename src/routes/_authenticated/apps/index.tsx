import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import {
  Box,
  Plus,
  Sparkles,
  Layers,
} from "lucide-react";
import { AppShell } from "@/components/app/AppShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { getMyApplications, executeAppAction, applyTemplateToApp, resetCloudApp } from "@/lib/cloud-apps.functions";
import { type AppTemplate, getRequiredDiskWithMargin } from "@/lib/templates.data";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";
import {
  AppCard,
  TemplateCatalogTab,
  InstallTemplateModal,
  ResetAppDialog,
} from "@/components/apps/list";

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
  const [appToDelete, setAppToDelete] = useState<{ id: string; name: string } | null>(null);

  const { data: apps, isLoading } = useQuery({
    queryKey: ["myApplications", effectiveUserId],
    enabled: Boolean(effectiveUserId),
    queryFn: () => getMyApplications({ data: { clientId: effectiveUserId } }),
  });

  const actionMutation = useMutation({
    mutationFn: async ({ appId, action }: { appId: string; action: "start" | "stop" | "restart" | "deploy" }) => {
      return executeAppAction({ data: { appId, action } });
    },
    onSuccess: (_res: any, vars) => {
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

  const resetMutation = useMutation({
    mutationFn: async (appId: string) => {
      return resetCloudApp({ data: { appId } });
    },
    onSuccess: () => {
      toast.success("Container resetado e retornado ao estado inicial com sucesso!");
      setAppToDelete(null);
      queryClient.invalidateQueries({ queryKey: ["myApplications"] });
    },
    onError: (err: any) => {
      toast.error(err.message || "Erro ao resetar container.");
    },
  });

  const installTemplateMutation = useMutation({
    mutationFn: async ({ appId, template }: { appId: string; template: AppTemplate }) => {
      const targetApp = apps?.find((a: any) => a.id === appId);
      if (targetApp) {
        const targetDisk = (targetApp as any)?.service?.products?.disk_quota_mb || targetApp.disk_limit_mb || 1536;
        const requiredDisk = getRequiredDiskWithMargin(template.recommended_disk);
        const isRamUnder = targetApp.memory_limit < template.recommended_ram;
        const isCpuUnder = targetApp.cpu_limit && targetApp.cpu_limit < template.recommended_cpu;
        const isDiskUnder = targetDisk < requiredDisk;

        if (isRamUnder || isCpuUnder || isDiskUnder) {
          let reason = "";
          if (isDiskUnder) {
            reason = `Seu plano possui ${targetDisk} MB de disco, mas o modelo requer no mínimo ${template.recommended_disk} MB (+ 20% de margem de segurança para operação = ${requiredDisk} MB).`;
          } else if (isRamUnder) {
            reason = `Seu plano possui ${targetApp.memory_limit} MB de RAM, mas o modelo requer no mínimo ${template.recommended_ram} MB de RAM.`;
          } else {
            reason = `Seu plano possui ${targetApp.cpu_limit || 0.5} vCPU, mas o modelo requer no mínimo ${template.recommended_cpu} vCPU.`;
          }
          throw new Error(`Plano incompatível: ${reason} Faça um upgrade para continuar.`);
        }
      }
      return applyTemplateToApp({
        data: {
          appId,
          template: {
            id: template.id,
            git_repository: template.git_repository,
            git_branch: template.git_branch,
            build_pack: template.build_pack,
            default_envs: template.default_envs,
          },
        },
      });
    },
    onSuccess: (_res: any, vars) => {
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
    if (apps && apps.length > 0 && apps[0]?.id) {
      setSelectedAppId(apps[0].id);
    }
    setInstallModalOpen(true);
  };

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
            <Link to="/apps/create" search={{}}>
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
            <Link to="/checkout" search={{ service: "containers" }}>
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
                    <Link to="/checkout" search={{ service: "containers" }}>
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
                {apps.map((app: any) => (
                  <AppCard
                    key={app.id}
                    app={app}
                    actionPending={actionMutation.isPending}
                    onAction={(appId, action) => actionMutation.mutate({ appId, action })}
                    onDelete={(target) => setAppToDelete(target)}
                  />
                ))}
              </div>
            )}
          </TabsContent>

          {/* 2. ABA: CATÁLOGO DE MODELOS (1-CLIQUE) */}
          <TabsContent value="templates" className="space-y-6">
            <TemplateCatalogTab
              templateSearch={templateSearch}
              setTemplateSearch={setTemplateSearch}
              templateCategory={templateCategory}
              setTemplateCategory={setTemplateCategory}
              onOpenInstall={handleOpenInstall}
            />
          </TabsContent>
        </Tabs>

        {/* Modal de Instalação com Validação de Recursos */}
        <InstallTemplateModal
          open={installModalOpen}
          onOpenChange={setInstallModalOpen}
          selectedTemplate={selectedTemplate}
          apps={apps}
          selectedAppId={selectedAppId}
          setSelectedAppId={setSelectedAppId}
          isInstalling={installTemplateMutation.isPending}
          onConfirmInstall={(appId, template) => installTemplateMutation.mutate({ appId, template })}
        />

        {/* Diálogo de Confirmação de Reset de Container */}
        <ResetAppDialog
          appToDelete={appToDelete}
          onOpenChange={(open) => !open && setAppToDelete(null)}
          isResetting={resetMutation.isPending}
          onConfirmReset={(appId) => resetMutation.mutate(appId)}
        />
      </div>
    </AppShell>
  );
}
