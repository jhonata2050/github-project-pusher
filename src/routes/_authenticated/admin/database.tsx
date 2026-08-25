import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  Database as DbIcon, 
  Shield, 
  Key, 
  Download, 
  Upload, 
  Users, 
  Copy, 
  Check, 
  Info, 
  RefreshCw, 
  FolderArchive, 
  HardDrive, 
  CheckCircle2, 
  AlertTriangle,
  FileCode,
  Layers
} from "lucide-react";
import { useState, useRef } from "react";
import { AppShell } from "@/components/app/AppShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { 
  getDatabaseInfo, 
  exportDatabase, 
  listServerBackups, 
  triggerDatabaseBackup, 
  importDatabaseBackup 
} from "@/lib/database.functions";
import { toast } from "sonner";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export const Route = createFileRoute("/_authenticated/admin/database")({
  head: () => ({
    meta: [
      { title: "Banco de Dados & Backups — Admin" },
    ],
  }),
  component: DatabaseAdminPage,
});

function DatabaseAdminPage() {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [importingFile, setImportingFile] = useState(false);

  const { data: dbInfo, isLoading: isInfoLoading } = useQuery({
    queryKey: ["admin-database-info"],
    queryFn: () => getDatabaseInfo(),
  });

  const { data: serverBackups, isLoading: isBackupsLoading, refetch: refetchBackups } = useQuery({
    queryKey: ["admin-server-backups"],
    queryFn: () => listServerBackups(),
  });

  // Geração de backup para download local
  const exportMutation = useMutation({
    mutationFn: () => exportDatabase(),
    onSuccess: (data) => {
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `backup-hostinghub-${new Date().toISOString().split("T")[0]}.json`;
      a.click();
      window.URL.revokeObjectURL(url);
      toast.success("Backup gerado e baixado com sucesso!");
    },
    onError: (err: any) => {
      toast.error(`Erro ao gerar backup: ${err.message}`);
    }
  });

  // Disparo de backup no servidor (pasta /backups)
  const serverBackupMutation = useMutation({
    mutationFn: () => triggerDatabaseBackup(),
    onSuccess: (res) => {
      toast.success(`Novo backup salvo com sucesso no servidor: ${res.folder}`);
      queryClient.invalidateQueries({ queryKey: ["admin-server-backups"] });
    },
    onError: (err: any) => {
      toast.error(`Erro ao executar backup no servidor: ${err.message}`);
    }
  });

  // Importação e restauração de backup via arquivo JSON
  const importMutation = useMutation({
    mutationFn: (backupData: any) => importDatabaseBackup({ data: { backupData } }),
    onSuccess: (res) => {
      setImportingFile(false);
      const tablesRestored = Object.keys(res.summary).length;
      let totalInserted = 0;
      Object.values(res.summary).forEach((s: any) => { totalInserted += s.inserted; });
      toast.success(`Backup importado com sucesso! ${totalInserted} registros restaurados em ${tablesRestored} tabelas.`);
      queryClient.invalidateQueries({ queryKey: ["admin-database-info"] });
      queryClient.invalidateQueries({ queryKey: ["admin-clients"] });
    },
    onError: (err: any) => {
      setImportingFile(false);
      toast.error(`Falha ao restaurar backup: ${err.message}`);
    }
  });

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setImportingFile(true);
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const parsed = JSON.parse(content);
        
        if (confirm(`Deseja realmente restaurar os dados deste arquivo de backup (${file.name})? Os registros serão inseridos/atualizados no banco de dados.`)) {
          importMutation.mutate(parsed);
        } else {
          setImportingFile(false);
        }
      } catch (err: any) {
        setImportingFile(false);
        toast.error("Arquivo inválido. Certifique-se de enviar um arquivo JSON de backup válido.");
      }
    };
    reader.readAsText(file);
    event.target.value = "";
  };

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    toast.success("Copiado para a área de transferência!");
    setTimeout(() => setCopiedKey(null), 2000);
  };

  return (
    <AppShell
      area="admin"
      breadcrumb={
        <>
          <span>Admin</span>
          <span>/</span>
          <span className="font-medium text-foreground">Banco de Dados</span>
        </>
      }
    >
      <div className="flex flex-col gap-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Banco de Dados & Backups</h1>
            <p className="text-sm text-muted-foreground">
              Monitore conexões, realize backups locais/servidor e restaure dados com segurança.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleFileUpload} 
              accept=".json" 
              className="hidden" 
            />
            <Button 
              variant="outline" 
              onClick={() => fileInputRef.current?.click()} 
              disabled={importingFile || importMutation.isPending}
              className="rounded-xl flex gap-2"
            >
              <Upload className="size-4" />
              {importingFile || importMutation.isPending ? "Restaurando..." : "Importar Backup (.json)"}
            </Button>
            <Button 
              onClick={() => serverBackupMutation.mutate()} 
              disabled={serverBackupMutation.isPending}
              className="rounded-xl flex gap-2"
            >
              <RefreshCw className={`size-4 ${serverBackupMutation.isPending ? "animate-spin" : ""}`} />
              {serverBackupMutation.isPending ? "Salvando..." : "Fazer Backup Agora"}
            </Button>
          </div>
        </div>

        <Tabs defaultValue="backups" className="w-full">
          <TabsList className="rounded-2xl bg-muted/60 p-1 mb-6">
            <TabsTrigger value="backups" className="rounded-xl px-4 py-2 flex items-center gap-2">
              <FolderArchive className="size-4" /> Backups do Servidor
            </TabsTrigger>
            <TabsTrigger value="connection" className="rounded-xl px-4 py-2 flex items-center gap-2">
              <DbIcon className="size-4" /> Conexão Supabase
            </TabsTrigger>
            <TabsTrigger value="users" className="rounded-xl px-4 py-2 flex items-center gap-2">
              <Users className="size-4" /> Perfis de Usuários
            </TabsTrigger>
          </TabsList>

          {/* TAB: BACKUPS */}
          <TabsContent value="backups" className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-3">
              <Card className="rounded-3xl border shadow-sm">
                <CardHeader className="pb-2">
                  <CardDescription className="text-xs font-semibold uppercase">Rotina Automática</CardDescription>
                  <CardTitle className="text-xl flex items-center gap-2 text-lime-600">
                    <CheckCircle2 className="size-5" /> A cada 3 Horas
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-xs text-muted-foreground">Execução contínua em segundo plano com rotação de segurança.</p>
                </CardContent>
              </Card>

              <Card className="rounded-3xl border shadow-sm">
                <CardHeader className="pb-2">
                  <CardDescription className="text-xs font-semibold uppercase">Total de Snapshots</CardDescription>
                  <CardTitle className="text-xl">
                    {serverBackups?.length ?? 0} cópias
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-xs text-muted-foreground">Armazenadas no diretório <code className="text-[11px] bg-muted px-1.5 py-0.5 rounded">/backups</code></p>
                </CardContent>
              </Card>

              <Card className="rounded-3xl border shadow-sm flex flex-col justify-between">
                <CardHeader className="pb-2">
                  <CardDescription className="text-xs font-semibold uppercase">Download Direto</CardDescription>
                  <CardTitle className="text-base">Exportar JSON</CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <Button 
                    variant="secondary" 
                    size="sm" 
                    onClick={() => exportMutation.mutate()} 
                    disabled={exportMutation.isPending}
                    className="w-full rounded-xl flex gap-2 text-xs"
                  >
                    <Download className="size-3.5" />
                    {exportMutation.isPending ? "Baixando..." : "Baixar Cópia Local"}
                  </Button>
                </CardContent>
              </Card>
            </div>

            <Card className="rounded-3xl border shadow-sm overflow-hidden">
              <CardHeader className="flex flex-row items-center justify-between border-b bg-muted/20 pb-4">
                <div>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <HardDrive className="size-5 text-primary" /> Backups em Disco no Servidor
                  </CardTitle>
                  <CardDescription>Cópias salvas automaticamente e sob demanda</CardDescription>
                </div>
                <Button variant="ghost" size="sm" onClick={() => refetchBackups()} className="rounded-xl">
                  <RefreshCw className="size-4" />
                </Button>
              </CardHeader>
              <CardContent className="p-0">
                {isBackupsLoading ? (
                  <div className="p-8 text-center text-muted-foreground">Carregando backups...</div>
                ) : serverBackups && serverBackups.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Identificador / Pasta</TableHead>
                        <TableHead>Data do Backup</TableHead>
                        <TableHead>Tabelas</TableHead>
                        <TableHead>Registros</TableHead>
                        <TableHead className="text-right">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {serverBackups.map((b: any) => (
                        <TableRow key={b.folderName}>
                          <TableCell className="font-mono text-xs font-medium">
                            {b.folderName}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {format(new Date(b.createdAt), "dd/MM/yyyy 'às' HH:mm:ss", { locale: ptBR })}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="rounded-lg text-xs">
                              {b.totalFiles} tabelas
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <span className="text-xs font-semibold">{b.totalRecords} itens</span>
                          </TableCell>
                          <TableCell className="text-right space-x-2">
                            <Badge variant="secondary" className="text-[10px] rounded-md">
                              Em Disco
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="p-12 text-center text-muted-foreground flex flex-col items-center gap-3">
                    <FolderArchive className="size-10 opacity-30" />
                    <p className="text-sm">Nenhum backup encontrado ainda.</p>
                    <Button onClick={() => serverBackupMutation.mutate()} size="sm" className="rounded-xl">
                      Criar Primeiro Backup
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* TAB: CONEXÃO SUPABASE */}
          <TabsContent value="connection" className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
              <Card className="rounded-3xl border shadow-sm">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Shield className="size-5 text-primary" /> Configuração Supabase
                  </CardTitle>
                  <CardDescription>Dados de endpoint e chaves da instância conectada.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground">URL do Projeto</label>
                    <div className="flex items-center gap-2">
                      <code className="flex-1 rounded-xl bg-muted p-2.5 font-mono text-xs select-all">
                        {dbInfo?.config.url || "Carregando..."}
                      </code>
                      {dbInfo?.config.url && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="rounded-xl size-9"
                          onClick={() => copyToClipboard(dbInfo.config.url!, "url")}
                        >
                          {copiedKey === "url" ? <Check className="size-4 text-green-600" /> : <Copy className="size-4" />}
                        </Button>
                      )}
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground">Chave Pública (Anon/Publishable)</label>
                    <div className="flex items-center gap-2">
                      <code className="flex-1 rounded-xl bg-muted p-2.5 font-mono text-xs">
                        {dbInfo?.config.publishableKey || "Carregando..."}
                      </code>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground">Chave de Serviço (Service Role)</label>
                    <div className="flex items-center gap-2">
                      <Badge variant={dbInfo?.config.hasServiceRole ? "default" : "secondary"} className="rounded-lg">
                        {dbInfo?.config.hasServiceRole ? "Configurada (.env)" : "Opcional / Não configurada"}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="rounded-3xl border shadow-sm">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Layers className="size-5 text-primary" /> Estrutura & Schemas
                  </CardTitle>
                  <CardDescription>Tabelas gerenciadas automaticamente pelo sistema</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    O Hosting Hub Pro gerencia automaticamente mais de 20 tabelas com integridade relacional e Row Level Security (RLS).
                  </p>
                  <div className="flex flex-wrap gap-1.5 pt-2">
                    {["profiles", "user_roles", "servers", "product_groups", "products", "services", "vps_instances", "invoices", "invoice_items", "coupons", "domains", "tickets", "audit_logs", "email_logs"].map(t => (
                      <Badge key={t} variant="outline" className="text-[11px] rounded-lg">
                        {t}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* TAB: USUÁRIOS */}
          <TabsContent value="users">
            <Card className="rounded-3xl border shadow-sm overflow-hidden">
              <CardHeader className="border-b bg-muted/20">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Users className="size-5 text-primary" /> Usuários Cadastrados
                </CardTitle>
                <CardDescription>Lista recente de perfis registrados no banco de dados</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nome</TableHead>
                      <TableHead>E-mail</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Criado em</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {dbInfo?.users && dbInfo.users.length > 0 ? (
                      dbInfo.users.map((u: any) => (
                        <TableRow key={u.id}>
                          <TableCell className="font-medium text-xs">{u.full_name || "Sem nome"}</TableCell>
                          <TableCell className="text-xs">{u.email}</TableCell>
                          <TableCell>
                            <Badge variant={u.status === "active" ? "default" : "secondary"} className="rounded-md text-[10px]">
                              {u.status || "active"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {u.created_at ? format(new Date(u.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR }) : "-"}
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center py-6 text-muted-foreground text-xs">
                          Nenhum usuário encontrado.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AppShell>
  );
}
