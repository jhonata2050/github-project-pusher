import React from "react";
import { Link } from "@tanstack/react-router";
import {
  ArrowLeft,
  Pencil,
  Loader2,
  Check,
  X,
  Globe,
  ExternalLink,
  Copy,
  Sparkles,
  Square,
  Play,
  RotateCcw,
  Zap,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import type { ApplicationRecord } from "@/lib/cloud-apps.server";

export interface AppHeaderProps {
  app: ApplicationRecord;
  isEditingName: boolean;
  setIsEditingName: (editing: boolean) => void;
  editingNameInput: string;
  setEditingNameInput: (name: string) => void;
  onSaveName: (name: string) => void;
  isSavingName: boolean;
  getStatusBadge: () => React.ReactNode;
  isPendingDeploy: boolean;
  hasCustomDomain: boolean;
  activeCustomDomain: string;
  cleanDefaultSubdomainHost: string;
  safeOnlineUrl: string;
  copyToClipboard: (text: string) => void;
  onOpenTemplateModal: () => void;
  isRunning: boolean;
  isActionPending: boolean;
  onAction: (action: "start" | "stop" | "restart" | "deploy") => void;
  onOpenDeleteConfirm: () => void;
}

export function AppHeader({
  app,
  isEditingName,
  setIsEditingName,
  editingNameInput,
  setEditingNameInput,
  onSaveName,
  isSavingName,
  getStatusBadge,
  isPendingDeploy,
  hasCustomDomain,
  activeCustomDomain,
  cleanDefaultSubdomainHost,
  safeOnlineUrl,
  copyToClipboard,
  onOpenTemplateModal,
  isRunning,
  isActionPending,
  onAction,
  onOpenDeleteConfirm,
}: AppHeaderProps) {
  return (
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-6">
      <div className="space-y-1.5">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Link to="/services" className="hover:underline flex items-center gap-1">
            <ArrowLeft className="h-3.5 w-3.5" /> Meus Serviços
          </Link>
          <span>/</span>
          <span>Aplicações & Bots</span>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {isEditingName ? (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!editingNameInput.trim()) {
                  toast.error("O nome da aplicação não pode ficar em branco.");
                  return;
                }
                onSaveName(editingNameInput.trim());
              }}
              className="flex items-center gap-2"
            >
              <Input
                value={editingNameInput}
                onChange={(e) => setEditingNameInput(e.target.value)}
                placeholder="Nome da aplicação"
                className="h-9 text-lg sm:text-xl font-bold rounded-xl max-w-xs bg-background border-primary shadow-xs"
                autoFocus
              />
              <Button
                type="submit"
                size="sm"
                disabled={isSavingName || !editingNameInput.trim()}
                className="h-9 px-3 rounded-xl gap-1 text-xs font-bold"
              >
                {isSavingName ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                Salvar
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  setEditingNameInput(app.name);
                  setIsEditingName(false);
                }}
                className="h-9 px-2.5 rounded-xl text-xs text-muted-foreground hover:text-foreground"
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            </form>
          ) : (
            <div className="flex items-center gap-2 group">
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
                {app.name}
              </h1>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => {
                  setEditingNameInput(app.name);
                  setIsEditingName(true);
                }}
                title="Editar nome da aplicação"
                className="h-8 w-8 rounded-xl opacity-70 hover:opacity-100 hover:bg-muted text-muted-foreground hover:text-foreground transition-opacity"
              >
                <Pencil className="h-3.5 w-3.5" />
              </Button>
            </div>
          )}
          {getStatusBadge()}
        </div>
        {!isPendingDeploy && app.fqdn && (
          <div className="flex flex-wrap items-center gap-2 pt-1">
            {hasCustomDomain ? (
              <>
                <a
                  href={`https://${activeCustomDomain}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 px-3 py-1.5 rounded-xl hover:bg-emerald-500/20 flex items-center gap-1.5 font-mono font-bold transition-colors shadow-sm"
                >
                  <Globe className="h-3.5 w-3.5 text-emerald-500" />
                  https://{activeCustomDomain}
                  <ExternalLink className="h-3 w-3 ml-0.5 opacity-70" />
                </a>
                <Badge variant="outline" className="text-[11px] font-mono text-emerald-600 dark:text-emerald-400 border-emerald-500/30 bg-emerald-500/5 py-1 px-2.5 rounded-lg">
                  Domínio Personalizado
                </Badge>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => copyToClipboard(`https://${activeCustomDomain}`)}
                  className="h-8 px-2.5 rounded-xl text-xs text-muted-foreground hover:text-foreground gap-1"
                >
                  <Copy className="h-3.5 w-3.5" /> Copiar
                </Button>
                <span className="text-[11px] text-muted-foreground ml-1">
                  (Subdomínio original: <code className="text-zinc-600 dark:text-zinc-400 font-mono">{cleanDefaultSubdomainHost}</code>)
                </span>
              </>
            ) : (
              <>
                <a
                  href={safeOnlineUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 px-3 py-1.5 rounded-xl hover:bg-emerald-500/20 flex items-center gap-1.5 font-mono font-bold transition-colors shadow-sm"
                >
                  <Globe className="h-3.5 w-3.5 text-emerald-500" />
                  {safeOnlineUrl}
                  <ExternalLink className="h-3 w-3 ml-0.5 opacity-70" />
                </a>
                <Badge variant="outline" className="text-[11px] font-mono text-muted-foreground border-border bg-muted/30 py-1 px-2.5 rounded-lg">
                  Subdomínio do Sistema
                </Badge>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => copyToClipboard(app.fqdn)}
                  className="h-8 px-2.5 rounded-xl text-xs text-muted-foreground hover:text-foreground gap-1"
                >
                  <Copy className="h-3.5 w-3.5" /> Copiar
                </Button>
              </>
            )}
          </div>
        )}
      </div>

      {/* Botões de Ação de Ciclo de Vida */}
      <div className="flex flex-wrap items-center gap-2">
        {isPendingDeploy ? (
          <Button 
            onClick={onOpenTemplateModal}
            className="rounded-xl gap-2 font-bold bg-amber-500 hover:bg-amber-600 text-white shadow-sm"
          >
            <Sparkles className="h-4 w-4" />
            Escolher Modelo & Fazer Deploy
          </Button>
        ) : (
          <>
            {isRunning ? (
              <Button
                variant="outline"
                className="rounded-xl gap-2 border-rose-500/30 text-rose-600 hover:bg-rose-500/10"
                disabled={isActionPending}
                onClick={() => onAction("stop")}
              >
                <Square className="h-4 w-4" />
                Parar
              </Button>
            ) : (
              <Button
                variant="outline"
                className="rounded-xl gap-2 border-emerald-500/30 text-emerald-600 hover:bg-emerald-500/10"
                disabled={isActionPending}
                onClick={() => onAction("start")}
              >
                <Play className="h-4 w-4" />
                Iniciar
              </Button>
            )}

            <Button
              variant="outline"
              className="rounded-xl gap-2"
              disabled={isActionPending}
              onClick={() => onAction("restart")}
            >
              <RotateCcw className="h-4 w-4" />
              Reiniciar
            </Button>

            <Button
              className="rounded-xl gap-2 font-bold bg-primary"
              disabled={isActionPending}
              onClick={() => onAction("deploy")}
            >
              <Zap className="h-4 w-4" />
              Re-Deploy
            </Button>

            <Button
              variant="outline"
              className="rounded-xl gap-2 border-rose-500/30 text-rose-600 hover:bg-rose-500/10"
              disabled={isActionPending}
              onClick={onOpenDeleteConfirm}
              title="Parar aplicação"
            >
              <Trash2 className="h-4 w-4" />
              Excluir
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
