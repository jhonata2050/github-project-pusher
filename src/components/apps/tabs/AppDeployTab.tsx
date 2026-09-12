import React from "react";
import { GitBranch, Upload, Sparkles, Loader2, Zap } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export interface AppDeployTabProps {
  app: any;
  gitRepoInput: string;
  setGitRepoInput: (value: string) => void;
  gitBranchInput: string;
  setGitBranchInput: (value: string) => void;
  deployGitMutation: any;
  actionMutation: any;
  setIsGitDeployConfirmOpen: (value: boolean) => void;
  setActiveTab: (tab: string) => void;
  setIsTemplateModalOpen: (value: boolean) => void;
}

export function AppDeployTab({
  app,
  gitRepoInput,
  setGitRepoInput,
  gitBranchInput,
  setGitBranchInput,
  deployGitMutation,
  actionMutation,
  setIsGitDeployConfirmOpen,
  setActiveTab,
  setIsTemplateModalOpen,
}: AppDeployTabProps) {
  return (
    <div className="grid gap-6 md:grid-cols-2">
      {/* 1º Card: Repositório Git */}
      <Card className="rounded-3xl border shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg font-bold flex items-center gap-2">
            <GitBranch className="h-5 w-5 text-primary" />
            Repositório Git (GitHub / GitLab)
          </CardTitle>
          <CardDescription>
            Configure um repositório Git público ou privado para disparo automático de builds.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>URL do Repositório</Label>
            <Input 
              value={gitRepoInput}
              onChange={(e) => setGitRepoInput(e.target.value)}
              placeholder="https://github.com/usuario/meu-bot-node" 
              className="rounded-xl font-mono text-xs" 
            />
          </div>
          <div className="space-y-2">
            <Label>Branch Principal</Label>
            <Input 
              value={gitBranchInput}
              onChange={(e) => setGitBranchInput(e.target.value)}
              placeholder="main ou master" 
              className="rounded-xl font-mono text-xs" 
            />
          </div>
          <Button 
            className="w-full rounded-xl gap-2 font-semibold bg-primary"
            disabled={deployGitMutation.isPending || actionMutation.isPending}
            onClick={() => {
              if (!gitRepoInput.trim()) {
                toast.error("Por favor, informe a URL do repositório Git.");
                return;
              }
              const hasExistingService = Boolean(
                app?.name || app?.template_id || app?.git_repository || app?.status === "running"
              );
              if (hasExistingService) {
                setIsGitDeployConfirmOpen(true);
              } else {
                deployGitMutation.mutate({
                  gitRepository: gitRepoInput.trim(),
                  gitBranch: gitBranchInput.trim() || "main",
                });
              }
            }}
          >
            {deployGitMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Zap className="h-4 w-4" />
            )}
            Salvar e Disparar Build
          </Button>
        </CardContent>
      </Card>

      {/* 2º Card: Upload ZIP Rápido */}
      <Card className="rounded-3xl border shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg font-bold flex items-center gap-2">
            <Upload className="h-5 w-5 text-primary" />
            Upload Direto (ZIP / Arquivo)
          </CardTitle>
          <CardDescription>
            Prefere não usar Git? Envie o arquivo <code className="text-xs font-mono bg-muted p-1 rounded">.zip</code> do seu bot ou projeto diretamente pelo navegador.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div 
            onClick={() => setActiveTab("files")}
            className="border-2 border-dashed rounded-2xl p-8 text-center hover:border-primary/50 transition-colors cursor-pointer bg-muted/20"
          >
            <Upload className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
            <p className="font-semibold text-sm">Arraste seu arquivo .zip aqui</p>
            <p className="text-xs text-muted-foreground mt-1">Node.js, Python, Dockerfile ou HTML (máx. 100MB)</p>
          </div>
          <Button onClick={() => setActiveTab("files")} variant="outline" className="w-full rounded-xl font-semibold">
            Abrir Editor de Arquivos no Navegador
          </Button>
        </CardContent>
      </Card>

      {/* 3º Card: Catálogo de Modelos 1-Clique */}
      <Card className="rounded-3xl border shadow-sm md:col-span-2 border-amber-500/30 bg-gradient-to-r from-amber-500/10 via-brand/5 to-transparent">
        <CardHeader>
          <CardTitle className="text-lg font-bold flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-amber-500" />
            Catálogo de Modelos & Apps Prontos (1-Clique)
          </CardTitle>
          <CardDescription>
            Instale WordPress, Bots de WhatsApp/Discord, N8N, Next.js, APIs e muito mais com um único clique diretamente neste container.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-xs text-muted-foreground">
            Mais de 25 modelos otimizados para produção com portas e variáveis prontas para rodar.
          </div>
          <Button 
            onClick={() => setIsTemplateModalOpen(true)}
            className="w-full sm:w-auto rounded-xl gap-2 font-bold bg-amber-500 hover:bg-amber-600 text-white shadow-sm"
          >
            <Zap className="h-4 w-4" />
            Abrir Catálogo de Modelos
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
