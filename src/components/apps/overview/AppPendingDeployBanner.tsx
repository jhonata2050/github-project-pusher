import React from "react";
import { Sparkles, Zap, FolderArchive, Upload, GitBranch } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export interface AppPendingDeployBannerProps {
  app: any;
  setIsTemplateModalOpen: (open: boolean) => void;
  setActiveTab: (tab: string) => void;
}

export function AppPendingDeployBanner({
  app,
  setIsTemplateModalOpen,
  setActiveTab,
}: AppPendingDeployBannerProps) {
  return (
    <div className="space-y-6">
      {/* Banner Principal de Boas-Vindas */}
      <div className="bg-gradient-to-r from-amber-500/10 via-brand/5 to-transparent border-2 border-dashed border-amber-500/30 p-8 sm:p-10 rounded-3xl text-center space-y-4">
        <div className="h-16 w-16 rounded-3xl bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto shadow-sm">
          <Sparkles className="h-8 w-8" />
        </div>
        <div className="max-w-2xl mx-auto space-y-2">
          <h3 className="text-2xl font-extrabold text-foreground tracking-tight">
            Infraestrutura Alocada • Aguardando Primeiro Deploy
          </h3>
          <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
            Seu container com <strong>{app.memory_limit} MB de RAM</strong> e <strong>{app.cpu_limit} vCPU</strong> está provisionado e reservado exclusivamente para você no cluster DK1. Nenhum serviço está consumindo recursos ainda.
          </p>
        </div>
      </div>

      {/* 3 Opções Claras de Deploy */}
      <div className="grid gap-6 md:grid-cols-3">
        {/* Opção 1: Catálogo 1-Clique */}
        <Card className="rounded-3xl border border-amber-500/30 bg-gradient-to-b from-amber-500/5 to-transparent p-6 flex flex-col justify-between hover:border-amber-500/60 transition-all hover:shadow-md">
          <div className="space-y-3">
            <div className="h-12 w-12 rounded-2xl bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <Zap className="h-6 w-6" />
            </div>
            <h4 className="font-bold text-base text-foreground">Catálogo de Modelos (1-Clique)</h4>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Instale WordPress, Bots de WhatsApp, Discord, N8N, Next.js, APIs e dezenas de ferramentas prontas para produção.
            </p>
          </div>
          <Button 
            onClick={() => setIsTemplateModalOpen(true)}
            className="w-full mt-6 rounded-xl font-bold bg-amber-500 hover:bg-amber-600 text-white gap-2 shadow-sm"
          >
            <Sparkles className="h-4 w-4" /> Abrir Catálogo
          </Button>
        </Card>

        {/* Opção 2: Upload Direto ZIP */}
        <Card className="rounded-3xl border p-6 flex flex-col justify-between hover:border-primary/50 transition-all hover:shadow-md">
          <div className="space-y-3">
            <div className="h-12 w-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
              <FolderArchive className="h-6 w-6" />
            </div>
            <h4 className="font-bold text-base text-foreground">Upload de Arquivo .ZIP</h4>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Envie o código fonte do seu bot ou site em formato ZIP (Node.js, Python, PHP, Dockerfile ou HTML estático).
            </p>
          </div>
          <Button 
            onClick={() => setActiveTab("files")}
            variant="outline"
            className="w-full mt-6 rounded-xl font-bold gap-2"
          >
            <Upload className="h-4 w-4" /> Enviar Arquivo .ZIP
          </Button>
        </Card>

        {/* Opção 3: Conectar Repositório Git */}
        <Card className="rounded-3xl border p-6 flex flex-col justify-between hover:border-primary/50 transition-all hover:shadow-md">
          <div className="space-y-3">
            <div className="h-12 w-12 rounded-2xl bg-muted text-foreground flex items-center justify-center">
              <GitBranch className="h-6 w-6" />
            </div>
            <h4 className="font-bold text-base text-foreground">Repositório Git</h4>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Conecte seu repositório do GitHub ou GitLab para compilação contínua e deploys automáticos a cada commit.
            </p>
          </div>
          <Button 
            onClick={() => setActiveTab("deploy")}
            variant="outline"
            className="w-full mt-6 rounded-xl font-bold gap-2"
          >
            <GitBranch className="h-4 w-4" /> Conectar Git
          </Button>
        </Card>
      </div>
    </div>
  );
}
