import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { AppShell } from "@/components/app/AppShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DeployTypeSelector,
  DeployZipSection,
  DeployGithubSection,
  DeployTemplateSection,
  CreateAppNameInput,
  CreateAppSidebar,
  useCreateApp,
  type CreateAppSearchParams,
} from "@/components/apps/create";

export const Route = createFileRoute("/_authenticated/apps/create")({
  validateSearch: (search: Record<string, unknown>): CreateAppSearchParams => {
    const params: CreateAppSearchParams = {};
    if (search["mode"] === "zip" || search["mode"] === "github" || search["mode"] === "templates") {
      params.mode = search["mode"];
    }
    if (typeof search["appId"] === "string") params.appId = search["appId"];
    if (typeof search["category"] === "string") params.category = search["category"];
    return params;
  },
  head: () => ({
    meta: [
      { title: "Criar Aplicação — Eqsam PaaS" },
      { name: "description", content: "Faça deploy de bots e APIs via ZIP, GitHub ou Modelos de 1-Clique." },
    ],
  }),
  component: CreateAppPage,
});

function CreateAppPage() {
  const search = Route.useSearch();
  const {
    deployType,
    setDeployType,
    appName,
    setAppName,
    selectedAppId,
    setSelectedAppId,
    zipFile,
    setZipFile,
    gitRepo,
    setGitRepo,
    gitBranch,
    setGitBranch,
    buildPack,
    setBuildPack,
    selectedTemplate,
    setSelectedTemplate,
    templateCategory,
    setTemplateCategory,
    apps,
    activeApp,
    resourceComp,
    handleFileDrop,
    handleFileSelect,
    deployMutation,
    handleDeploy,
  } = useCreateApp({
    initialMode: search.mode,
    initialAppId: search.appId,
    initialCategory: search.category,
  });

  return (
    <AppShell breadcrumb={<span><Link to="/apps" className="hover:underline">Aplicações</Link> / Criar aplicação</span>}>
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <Link to="/apps">
            <Button size="icon" variant="outline" className="rounded-2xl h-10 w-10 cursor-pointer">
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
          <div className="lg:col-span-2 space-y-6">
            <Card className="rounded-3xl border shadow-sm">
              <CardHeader className="pb-4">
                <CardTitle className="text-base font-bold">Tipo de deploy</CardTitle>
                <CardDescription className="text-xs">
                  Escolha como você deseja enviar o código da sua aplicação para o cluster.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <DeployTypeSelector
                  deployType={deployType}
                  onChangeDeployType={setDeployType}
                />

                {deployType === "zip" && (
                  <DeployZipSection
                    zipFile={zipFile}
                    onFileDrop={handleFileDrop}
                    onFileSelect={handleFileSelect}
                    onRemoveFile={() => setZipFile(null)}
                  />
                )}

                {deployType === "github" && (
                  <DeployGithubSection
                    gitRepo={gitRepo}
                    onChangeGitRepo={setGitRepo}
                    gitBranch={gitBranch}
                    onChangeGitBranch={setGitBranch}
                    buildPack={buildPack}
                    onChangeBuildPack={setBuildPack}
                  />
                )}

                {deployType === "templates" && (
                  <DeployTemplateSection
                    selectedTemplate={selectedTemplate}
                    onSelectTemplate={setSelectedTemplate}
                    templateCategory={templateCategory}
                    onChangeTemplateCategory={setTemplateCategory}
                  />
                )}
              </CardContent>
            </Card>

            <CreateAppNameInput
              appName={appName}
              onChangeAppName={setAppName}
            />
          </div>

          <CreateAppSidebar
            apps={apps}
            selectedAppId={selectedAppId}
            onSelectAppId={setSelectedAppId}
            activeApp={activeApp}
            selectedTemplate={selectedTemplate}
            resourceComp={resourceComp}
            deployType={deployType}
            appName={appName}
            zipFile={zipFile}
            isDeploying={deployMutation.isPending}
            onDeploy={handleDeploy}
          />
        </div>
      </div>
    </AppShell>
  );
}
