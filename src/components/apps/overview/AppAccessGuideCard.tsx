import React, { useState } from "react";
import {
  Sparkles,
  KeyRound,
  ExternalLink,
  Copy,
  Check,
  Eye,
  EyeOff,
  ShieldCheck,
  UserCheck,
  Lock,
  Database,
  Info,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export interface AppAccessGuideCardProps {
  app: any;
  safeOnlineUrl: string;
  envsData?: Array<{ key: string; value: string }> | any[] | undefined;
  setActiveTab: (tab: string) => void;
  copyToClipboard: (text: string, key?: string | undefined) => void;
}

export function AppAccessGuideCard({
  app,
  safeOnlineUrl,
  envsData,
  setActiveTab,
  copyToClipboard,
}: AppAccessGuideCardProps) {
  const [showSecrets, setShowSecrets] = useState<Record<string, boolean>>({});
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const tid = (app?.template_id || "").toLowerCase();
  const allEnvs = envsData && envsData.length > 0 ? envsData : app?.env_vars || [];

  const getEnvVal = (key: string, fallback = ""): string => {
    const found = allEnvs.find((e: any) => e.key === key);
    return found?.value ?? fallback;
  };

  const handleCopy = (text: string, key: string) => {
    copyToClipboard(text, key);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const toggleSecret = (key: string) => {
    setShowSecrets((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  // 1. MODELO: WIZARD / PRIMEIRO ACESSO (NocoDB, Uptime Kuma, N8N, WordPress, PocketBase)
  const isWizardApp =
    tid.includes("nocodb") ||
    tid.includes("kuma") ||
    tid.includes("n8n") ||
    tid.includes("wordpress") ||
    tid.includes("pocketbase") ||
    tid.includes("ghost");

  if (isWizardApp) {
    let title = "Primeiro Acesso: Crie sua Conta de Administrador";
    let badgeText = "Assistente de 1º Acesso";
    let explanation = (
      <>
        Esta aplicação não possui usuário cadastrado previamente. Ao abrir a URL pela primeira vez, você verá a tela de{" "}
        <strong className="text-foreground">Cadastro / Criação de Conta (Sign Up)</strong>. O primeiro usuário registrado será automaticamente promovido a{" "}
        <strong className="text-primary font-semibold">Super Administrador (Owner)</strong> com controle total.
      </>
    );
    let buttonText = "Acessar e Criar Administrador";
    let targetUrl = safeOnlineUrl;

    if (tid.includes("nocodb")) {
      title = "Primeiro Acesso: Crie sua Conta no NocoDB";
      badgeText = "Sign Up no 1º Acesso";
      explanation = (
        <>
          O NocoDB foi instalado com banco de dados novo e zerado. Ao clicar no botão abaixo, você verá a tela{" "}
          <strong className="text-foreground font-mono">SIGN UP</strong>. Digite o seu e-mail e a senha que desejar para criar o{" "}
          <strong className="text-primary font-semibold">Administrador Supremo</strong> do seu painel de planilhas.
        </>
      );
      buttonText = "Abrir Tela de Cadastro (Sign Up)";
      targetUrl = safeOnlineUrl ? `${safeOnlineUrl.replace(/\/+$/, "")}/signup` : safeOnlineUrl;
    } else if (tid.includes("kuma")) {
      title = "Primeiro Acesso: Criar Administrador do Uptime Kuma";
      explanation = (
        <>
          O Uptime Kuma iniciou pronto para uso. Na primeira visita, crie o seu{" "}
          <strong className="text-foreground">Nome de Usuário</strong> e <strong className="text-foreground">Senha</strong> no assistente inicial para começar a monitorar seus serviços.
        </>
      );
    } else if (tid.includes("n8n")) {
      title = "Primeiro Acesso: Configurar Owner do N8N";
      explanation = (
        <>
          O N8N exige a configuração do <strong className="text-foreground">Proprietário da Instância (Owner)</strong> no primeiro acesso. Digite seu nome, e-mail e crie sua senha de segurança.
        </>
      );
    } else if (tid.includes("wordpress")) {
      title = "Instalação de 5 Minutos do WordPress";
      explanation = (
        <>
          O banco de dados MySQL foi conectado com sucesso. Ao acessar o site, siga o assistente oficial do WordPress para definir o{" "}
          <strong className="text-foreground">Título do Site</strong>, <strong className="text-foreground">Usuário Admin</strong> e <strong className="text-foreground">Senha</strong>.
        </>
      );
    } else if (tid.includes("pocketbase")) {
      title = "Primeiro Acesso: Criar Superadmin do PocketBase";
      targetUrl = safeOnlineUrl ? `${safeOnlineUrl.replace(/\/+$/, "")}/_/` : safeOnlineUrl;
      buttonText = "Acessar Console Administrativo (/_/)";
      explanation = (
        <>
          Acesse a rota administrativa <code className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">/_/</code> para registrar o e-mail e senha do primeiro Administrador Supremo da base SQLite.
        </>
      );
    }

    return (
      <Card className="rounded-3xl border-2 border-primary/20 bg-gradient-to-r from-primary/5 via-card to-card shadow-sm overflow-hidden animate-in fade-in duration-300">
        <CardHeader className="bg-muted/15 border-b pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-2xl bg-primary/10 text-primary shrink-0 ring-1 ring-primary/20">
                <UserCheck className="h-5 w-5" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <CardTitle className="text-base font-extrabold">{title}</CardTitle>
                  <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30 text-[10px] font-bold">
                    {badgeText}
                  </Badge>
                </div>
                <CardDescription className="text-xs mt-0.5">
                  Não é necessária senha prévia gerada pelo painel — você define seus dados no primeiro login.
                </CardDescription>
              </div>
            </div>
            <Button
              size="sm"
              asChild
              className="rounded-xl text-xs gap-1.5 font-bold shadow-md bg-primary hover:bg-primary/90 shrink-0 self-start sm:self-auto"
            >
              <a href={targetUrl} target="_blank" rel="noreferrer">
                <ExternalLink className="h-3.5 w-3.5" /> {buttonText}
              </a>
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-5 text-xs text-muted-foreground leading-relaxed flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <p className="max-w-2xl">{explanation}</p>
          <div className="p-2.5 rounded-xl bg-muted/30 border text-[11px] text-muted-foreground flex items-center gap-2 shrink-0">
            <Sparkles className="h-4 w-4 text-amber-500 shrink-0" />
            <span>Suas credenciais ficarão salvas no banco persistente do serviço.</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  // 2. MODELO: VAULTWARDEN (COFRE BITWARDEN & ADMIN TOKEN)
  if (tid.includes("vaultwarden") || tid.includes("vault")) {
    const adminToken = getEnvVal("ADMIN_TOKEN", "••••••••••••••••");
    const isTokenHidden = !showSecrets["admin_token"];

    return (
      <Card className="rounded-3xl border-2 border-indigo-500/20 bg-gradient-to-r from-indigo-500/5 via-card to-card shadow-sm overflow-hidden animate-in fade-in duration-300">
        <CardHeader className="bg-muted/15 border-b pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-2xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 shrink-0 ring-1 ring-indigo-500/20">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <CardTitle className="text-base font-extrabold">Acesso ao Cofre & Painel Master (Vaultwarden)</CardTitle>
                  <Badge variant="outline" className="bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/30 text-[10px] font-bold">
                    Bitwarden Zero-Knowledge
                  </Badge>
                </div>
                <CardDescription className="text-xs mt-0.5">
                  Crie sua conta pessoal no cofre ou acerte configurações globais na área master.
                </CardDescription>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0 self-start sm:self-auto">
              <Button
                size="sm"
                asChild
                variant="outline"
                className="rounded-xl text-xs gap-1.5 font-bold"
              >
                <a href={safeOnlineUrl} target="_blank" rel="noreferrer">
                  <ExternalLink className="h-3.5 w-3.5" /> Abrir Cofre Web
                </a>
              </Button>
              <Button
                size="sm"
                asChild
                className="rounded-xl text-xs gap-1.5 font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm"
              >
                <a href={`${safeOnlineUrl.replace(/\/+$/, "")}/admin`} target="_blank" rel="noreferrer">
                  <Lock className="h-3.5 w-3.5" /> Acessar Área Master (/admin)
                </a>
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-5 space-y-3.5 text-xs">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-3.5 rounded-2xl bg-muted/30 border space-y-1.5">
              <div className="flex items-center gap-1.5 font-bold text-foreground">
                <UserCheck className="h-4 w-4 text-emerald-500" />
                <span>1. Uso Diário (Seu Cofre de Senhas)</span>
              </div>
              <p className="text-muted-foreground leading-relaxed text-[11px]">
                Acesse a página inicial e clique em <strong>Criar Conta</strong>. Essa conta sincroniza automaticamente com os aplicativos oficiais do Bitwarden (Android, iOS, Chrome, Edge e Desktop).
              </p>
            </div>
            <div className="p-3.5 rounded-2xl bg-muted/30 border space-y-2">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 font-bold text-foreground">
                  <Lock className="h-4 w-4 text-indigo-500" />
                  <span>2. Token Master (/admin)</span>
                </div>
                <span className="text-[10px] text-muted-foreground">Cole na tela /admin</span>
              </div>
              <div className="flex items-center gap-2">
                <code className="font-mono text-xs bg-background px-2 py-1 rounded-lg border flex-1 truncate">
                  {isTokenHidden ? "••••••••••••••••••••••••" : adminToken}
                </code>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7 rounded-lg"
                  onClick={() => toggleSecret("admin_token")}
                  title={isTokenHidden ? "Mostrar token" : "Ocultar token"}
                >
                  {isTokenHidden ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                </Button>
                <Button
                  size="icon"
                  variant="outline"
                  className="h-7 w-7 rounded-lg"
                  onClick={() => handleCopy(adminToken, "admin_token")}
                  title="Copiar token"
                >
                  {copiedKey === "admin_token" ? (
                    <Check className="h-3.5 w-3.5 text-emerald-500" />
                  ) : (
                    <Copy className="h-3.5 w-3.5" />
                  )}
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // 3. MODELO: CREDENCIAIS VIA VARIÁVEIS DE AMBIENTE (Flowise AI)
  if (tid.includes("flowise")) {
    const flowiseUser = getEnvVal("FLOWISE_USERNAME", "admin");
    const flowisePass = getEnvVal("FLOWISE_PASSWORD", "");
    const isPassHidden = !showSecrets["flowise_pass"];

    return (
      <Card className="rounded-3xl border-2 border-emerald-500/20 bg-gradient-to-r from-emerald-500/5 via-card to-card shadow-sm overflow-hidden animate-in fade-in duration-300">
        <CardHeader className="bg-muted/15 border-b pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 shrink-0 ring-1 ring-emerald-500/20">
                <KeyRound className="h-5 w-5" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <CardTitle className="text-base font-extrabold">Credenciais de Acesso: Flowise AI</CardTitle>
                  <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 text-[10px] font-bold">
                    Login Pré-configurado
                  </Badge>
                </div>
                <CardDescription className="text-xs mt-0.5">
                  Utilize os dados abaixo na tela de login para acessar a área de criação de chatbots.
                </CardDescription>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0 self-start sm:self-auto">
              <Button
                size="sm"
                variant="outline"
                className="rounded-xl text-xs gap-1.5 font-bold"
                onClick={() => setActiveTab("envs")}
              >
                <KeyRound className="h-3.5 w-3.5" /> Editar no .env
              </Button>
              <Button
                size="sm"
                asChild
                className="rounded-xl text-xs gap-1.5 font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"
              >
                <a href={safeOnlineUrl} target="_blank" rel="noreferrer">
                  <ExternalLink className="h-3.5 w-3.5" /> Abrir Flowise AI
                </a>
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-xl">
            <div className="p-3 rounded-2xl bg-muted/30 border space-y-1">
              <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Usuário (Username)</span>
              <div className="flex items-center justify-between gap-2">
                <code className="font-mono text-xs font-bold text-foreground">{flowiseUser}</code>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7 rounded-lg"
                  onClick={() => handleCopy(flowiseUser, "flowise_user")}
                  title="Copiar usuário"
                >
                  {copiedKey === "flowise_user" ? (
                    <Check className="h-3.5 w-3.5 text-emerald-500" />
                  ) : (
                    <Copy className="h-3.5 w-3.5" />
                  )}
                </Button>
              </div>
            </div>
            <div className="p-3 rounded-2xl bg-muted/30 border space-y-1">
              <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Senha (Password)</span>
              <div className="flex items-center justify-between gap-2">
                <code className="font-mono text-xs font-bold text-foreground truncate">
                  {isPassHidden ? "••••••••••••" : flowisePass || "(senha padrão vazia)"}
                </code>
                <div className="flex items-center gap-1 shrink-0">
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7 rounded-lg"
                    onClick={() => toggleSecret("flowise_pass")}
                    title={isPassHidden ? "Mostrar senha" : "Ocultar senha"}
                  >
                    {isPassHidden ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7 rounded-lg"
                    onClick={() => handleCopy(flowisePass, "flowise_pass")}
                    title="Copiar senha"
                  >
                    {copiedKey === "flowise_pass" ? (
                      <Check className="h-3.5 w-3.5 text-emerald-500" />
                    ) : (
                      <Copy className="h-3.5 w-3.5" />
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // 4. MODELO: BANCOS DE DADOS (Postgres, MySQL, Redis)
  const isDb = tid.includes("postgres") || tid.includes("mysql") || tid.includes("redis");
  if (isDb) {
    const isPostgres = tid.includes("postgres");
    const isMysql = tid.includes("mysql");
    const dbUser = isPostgres
      ? getEnvVal("POSTGRES_USER", "postgres")
      : isMysql
      ? getEnvVal("MYSQL_USER", "dbuser")
      : "";
    const dbPass = isPostgres
      ? getEnvVal("POSTGRES_PASSWORD", "")
      : isMysql
      ? getEnvVal("MYSQL_PASSWORD", "")
      : getEnvVal("REDIS_PASSWORD", "");
    const dbName = isPostgres
      ? getEnvVal("POSTGRES_DB", "main")
      : isMysql
      ? getEnvVal("MYSQL_DATABASE", "main")
      : "";

    const isPassHidden = !showSecrets["db_pass"];

    return (
      <Card className="rounded-3xl border-2 border-blue-500/20 bg-gradient-to-r from-blue-500/5 via-card to-card shadow-sm overflow-hidden animate-in fade-in duration-300">
        <CardHeader className="bg-muted/15 border-b pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-2xl bg-blue-500/10 text-blue-600 dark:text-blue-400 shrink-0 ring-1 ring-blue-500/20">
                <Database className="h-5 w-5" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <CardTitle className="text-base font-extrabold">Credenciais de Acesso ao Banco de Dados</CardTitle>
                  <Badge variant="outline" className="bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30 text-[10px] font-bold">
                    Armazenamento Persistente
                  </Badge>
                </div>
                <CardDescription className="text-xs mt-0.5">
                  Conecte seu backend, DBeaver ou ferramentas externas utilizando os dados abaixo.
                </CardDescription>
              </div>
            </div>
            <Button
              size="sm"
              variant="outline"
              className="rounded-xl text-xs gap-1.5 font-bold shrink-0 self-start sm:self-auto"
              onClick={() => setActiveTab("envs")}
            >
              <KeyRound className="h-3.5 w-3.5" /> Alterar Senha no .env
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-5">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {dbUser && (
              <div className="p-3 rounded-2xl bg-muted/30 border space-y-1">
                <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Usuário</span>
                <div className="flex items-center justify-between gap-2">
                  <code className="font-mono text-xs font-bold text-foreground">{dbUser}</code>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7 rounded-lg"
                    onClick={() => handleCopy(dbUser, "db_user")}
                  >
                    {copiedKey === "db_user" ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
                  </Button>
                </div>
              </div>
            )}
            {dbName && (
              <div className="p-3 rounded-2xl bg-muted/30 border space-y-1">
                <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Banco (Database)</span>
                <div className="flex items-center justify-between gap-2">
                  <code className="font-mono text-xs font-bold text-foreground">{dbName}</code>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7 rounded-lg"
                    onClick={() => handleCopy(dbName, "db_name")}
                  >
                    {copiedKey === "db_name" ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
                  </Button>
                </div>
              </div>
            )}
            <div className="p-3 rounded-2xl bg-muted/30 border space-y-1">
              <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Senha</span>
              <div className="flex items-center justify-between gap-2">
                <code className="font-mono text-xs font-bold text-foreground truncate">
                  {isPassHidden ? "••••••••••••" : dbPass || "(não definida)"}
                </code>
                <div className="flex items-center gap-1 shrink-0">
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7 rounded-lg"
                    onClick={() => toggleSecret("db_pass")}
                  >
                    {isPassHidden ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7 rounded-lg"
                    onClick={() => handleCopy(dbPass, "db_pass")}
                  >
                    {copiedKey === "db_pass" ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // 5. DEFAULT / GENÉRICO
  return null;
}
