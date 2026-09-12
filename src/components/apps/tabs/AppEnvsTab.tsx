import React, { useState } from "react";
import { 
  Eye, 
  EyeOff, 
  Plus, 
  RotateCcw, 
  AlertTriangle, 
  KeyRound, 
  Trash2, 
  Save 
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

export interface AppEnvsTabProps {
  envsList: Array<{ key: string; value: string; is_build_time?: boolean | undefined }>;
  setEnvsList: React.Dispatch<React.SetStateAction<Array<{ key: string; value: string; is_build_time?: boolean | undefined }>>>;
  pendingEnvs: Array<{ key: string; value: string }>;
  isEnvPending: (env: { key: string; value: string }) => boolean;
  saveEnvsMutation: any;
  actionMutation: any;
}

export function AppEnvsTab({
  envsList,
  setEnvsList,
  pendingEnvs,
  isEnvPending,
  saveEnvsMutation,
  actionMutation,
}: AppEnvsTabProps) {
  const [showSecrets, setShowSecrets] = useState(false);
  const [visibleSecretsMap, setVisibleSecretsMap] = useState<Record<number, boolean>>({});

  const isRowSecretVisible = (index: number) => {
    if (visibleSecretsMap[index] !== undefined) {
      return visibleSecretsMap[index];
    }
    return showSecrets;
  };

  const toggleRowSecret = (index: number) => {
    setVisibleSecretsMap((prev) => ({
      ...prev,
      [index]: !isRowSecretVisible(index),
    }));
  };

  return (
    <Card className="rounded-3xl border shadow-sm">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg font-bold">Variáveis de Ambiente (.env)</CardTitle>
            <CardDescription>
              Chaves de API, senhas e configurações secretas injetadas de forma criptografada no container.
            </CardDescription>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button 
              size="sm" 
              variant="outline" 
              onClick={() => {
                const next = !showSecrets;
                setShowSecrets(next);
                setVisibleSecretsMap({});
              }}
              className="rounded-xl gap-1.5 text-xs font-semibold"
            >
              {showSecrets ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
              {showSecrets ? "Ocultar Valores" : "Revelar Todos"}
            </Button>
            <Button 
              size="sm" 
              variant="outline"
              onClick={() => setEnvsList([...envsList, { key: "", value: "" }])}
              className="rounded-xl gap-1.5 text-xs font-semibold"
            >
              <Plus className="h-3.5 w-3.5" /> Adicionar Variável
            </Button>
            <Button 
              size="sm" 
              onClick={() => saveEnvsMutation.mutate({ shouldRestart: true })}
              disabled={saveEnvsMutation.isPending || actionMutation.isPending}
              className={`rounded-xl gap-1.5 text-xs font-bold shadow-sm ${
                pendingEnvs.length > 0 
                  ? "bg-amber-500 hover:bg-amber-600 text-white shadow-amber-500/20" 
                  : "bg-primary hover:bg-primary/90 text-primary-foreground"
              }`}
            >
              <RotateCcw className={`h-3.5 w-3.5 ${(saveEnvsMutation.isPending || actionMutation.isPending) ? "animate-spin" : ""}`} /> 
              Salvar e Reiniciar
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Banner de Atenção Especial para Credenciais Pendentes */}
        {pendingEnvs.length > 0 && (
          <div className="bg-amber-500/15 border-2 border-amber-500/40 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-amber-900 dark:text-amber-100 shadow-sm animate-in fade-in">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-xl bg-amber-500/20 text-amber-600 dark:text-amber-400 shrink-0">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div className="space-y-1">
                <p className="font-bold text-sm text-foreground">
                  Existem {pendingEnvs.length} variável(is) com valores de exemplo pendentes de configuração
                </p>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Substitua os valores indicados abaixo por suas credenciais reais. Em seguida, clique em <strong>Salvar e Reiniciar Serviço</strong> para recarregar o container com as novas configurações ativas.
                </p>
              </div>
            </div>
            <Button 
              onClick={() => saveEnvsMutation.mutate({ shouldRestart: true })}
              disabled={saveEnvsMutation.isPending || actionMutation.isPending}
              className="shrink-0 rounded-xl gap-2 font-bold text-xs bg-amber-500 hover:bg-amber-600 text-white shadow-sm h-9 px-4"
            >
              <RotateCcw className={`h-3.5 w-3.5 ${(saveEnvsMutation.isPending || actionMutation.isPending) ? "animate-spin" : ""}`} /> 
              Salvar e Reiniciar Serviço
            </Button>
          </div>
        )}

        {/* Banner de Instruções e Orientações para o Cliente */}
        <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-4 flex gap-3 text-xs text-amber-700 dark:text-amber-400">
          <AlertTriangle className="h-5 w-5 shrink-0 text-amber-500 mt-0.5" />
          <div className="space-y-1">
            <p className="font-bold text-sm text-zinc-900 dark:text-zinc-100">Como funcionam as Variáveis de Ambiente (.env)</p>
            <p className="text-zinc-600 dark:text-zinc-400 leading-relaxed">
              Utilize esta área para definir variáveis personalizadas para o seu bot ou aplicação (ex: <code className="bg-amber-500/10 px-1 py-0.5 rounded font-mono font-bold text-amber-600 dark:text-amber-300">DISCORD_TOKEN</code>, <code className="bg-amber-500/10 px-1 py-0.5 rounded font-mono font-bold text-amber-600 dark:text-amber-300">BOT_TOKEN</code>, <code className="bg-amber-500/10 px-1 py-0.5 rounded font-mono font-bold text-amber-600 dark:text-amber-300">DATABASE_URL</code>). Elas são injetadas de forma criptografada no container.
            </p>
            <p className="font-semibold text-amber-600 dark:text-amber-300 pt-1">
              ⚡ <strong>Atenção:</strong> Processos em execução só carregam novas variáveis durante a inicialização. Após salvar, <strong>é necessário reiniciar ou fazer Re-Deploy da aplicação</strong> para que elas tenham efeito.
            </p>
          </div>
        </div>

        <div className="space-y-3">
          {envsList.map((env, index) => {
            const isPending = isEnvPending(env);
            return (
              <div
                key={index}
                className={`transition-all ${
                  isPending
                    ? "p-3 rounded-2xl bg-amber-500/10 border-2 border-amber-500/40 shadow-sm space-y-2"
                    : "flex gap-2 items-center"
                }`}
              >
                {isPending && (
                  <div className="flex items-center justify-between text-[11px] font-bold text-amber-800 dark:text-amber-300 px-1">
                    <span className="flex items-center gap-1.5">
                      <KeyRound className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
                      Variável Obrigatória • Substitua o valor de exemplo por sua credencial real:
                    </span>
                    <Badge variant="outline" className="text-[9px] font-extrabold uppercase bg-amber-500/20 text-amber-800 dark:text-amber-200 border-amber-500/40">
                      Ação Requerida
                    </Badge>
                  </div>
                )}
                <div className="flex gap-2 items-center w-full">
                  <Input
                    value={env.key}
                    onChange={(e) => {
                      const updated = [...envsList];
                      const item = updated[index];
                      if (item) {
                        item.key = e.target.value;
                        setEnvsList(updated);
                      }
                    }}
                    placeholder="NOME_DA_VARIAVEL"
                    className={`rounded-xl font-mono text-xs font-semibold uppercase flex-1 ${
                      isPending ? "border-amber-500/40 bg-background" : ""
                    }`}
                  />
                  <div className="relative flex-1">
                    <Input
                      type={isRowSecretVisible(index) ? "text" : "password"}
                      value={env.value}
                      onChange={(e) => {
                        const updated = [...envsList];
                        const item = updated[index];
                        if (item) {
                          item.value = e.target.value;
                          setEnvsList(updated);
                        }
                      }}
                      placeholder="valor_secreto_ou_configuracao"
                      className={`rounded-xl font-mono text-xs pr-9 w-full ${
                        isPending ? "border-amber-500/60 bg-background font-bold text-amber-900 dark:text-amber-100 ring-1 ring-amber-500/20" : ""
                      }`}
                    />
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      tabIndex={-1}
                      onClick={() => toggleRowSecret(index)}
                      title={isRowSecretVisible(index) ? "Ocultar valor desta variável" : "Mostrar valor desta variável"}
                      className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 text-muted-foreground hover:text-foreground hover:bg-muted/80 rounded-lg transition-colors"
                    >
                      {isRowSecretVisible(index) ? (
                        <EyeOff className="h-3.5 w-3.5 text-primary" />
                      ) : (
                        <Eye className="h-3.5 w-3.5" />
                      )}
                    </Button>
                  </div>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => {
                      const updated = envsList.filter((_, i) => i !== index);
                      setEnvsList(updated);
                    }}
                    className="rounded-xl text-rose-500 hover:text-rose-600 hover:bg-rose-500/10 shrink-0"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            );
          })}

          {envsList.length === 0 && (
            <p className="text-xs text-muted-foreground text-center py-6">
              Nenhuma variável de ambiente definida. Adicione variáveis acima para injetá-las no container.
            </p>
          )}
        </div>

        <div className="pt-4 border-t flex flex-col sm:flex-row items-center justify-between gap-3">
          <span className="text-xs text-muted-foreground">
            Dica: utilize <strong>Salvar e Reiniciar Serviço</strong> para aplicar as novas configurações imediatamente.
          </span>
          <div className="flex gap-2 w-full sm:w-auto justify-end">
            <Button 
              variant="outline" 
              onClick={() => saveEnvsMutation.mutate({ shouldRestart: false })}
              disabled={saveEnvsMutation.isPending || actionMutation.isPending}
              className="rounded-xl gap-2 font-semibold text-xs"
            >
              <Save className="h-3.5 w-3.5" /> Apenas Salvar
            </Button>
            <Button 
              onClick={() => saveEnvsMutation.mutate({ shouldRestart: true })}
              disabled={saveEnvsMutation.isPending || actionMutation.isPending}
              className={`rounded-xl gap-2 font-bold text-xs shadow-sm ${
                pendingEnvs.length > 0
                  ? "bg-amber-500 hover:bg-amber-600 text-white shadow-amber-500/20"
                  : "bg-primary hover:bg-primary/90 text-primary-foreground"
              }`}
            >
              <RotateCcw className={`h-3.5 w-3.5 ${(saveEnvsMutation.isPending || actionMutation.isPending) ? "animate-spin" : ""}`} /> 
              Salvar e Reiniciar Serviço
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
