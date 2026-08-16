import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Database as DbIcon, Shield, Key, Download, Users, Copy, Check, Info } from "lucide-react";
import { useState } from "react";
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
import { getDatabaseInfo, exportDatabase } from "@/lib/database.functions";
import { toast } from "sonner";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export const Route = createFileRoute("/_authenticated/admin/database")({
  head: () => ({
    meta: [
      { title: "Gerenciamento de Banco de Dados — Admin" },
    ],
  }),
  component: DatabaseAdminPage,
});

function DatabaseAdminPage() {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["admin-database-info"],
    queryFn: () => getDatabaseInfo(),
  });

  const exportMutation = useMutation({
    mutationFn: () => exportDatabase(),
    onSuccess: (data) => {
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `backup-hostboss-${new Date().toISOString().split("T")[0]}.json`;
      a.click();
      window.URL.revokeObjectURL(url);
      toast.success("Backup gerado e baixado com sucesso!");
    },
    onError: () => {
      toast.error("Erro ao gerar backup.");
    }
  });

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    toast.success("Copiado para a área de transferência!");
    setTimeout(() => setCopiedKey(null), 2000);
  };

  if (isLoading) {
    return (
      <AppShell area="admin" breadcrumb={<span>Admin / Banco de Dados</span>}>
        <div className="p-8 text-center text-muted-foreground">Carregando informações do banco...</div>
      </AppShell>
    );
  }

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
            <h1 className="text-2xl font-semibold tracking-tight">Banco de Dados</h1>
            <p className="text-sm text-muted-foreground">
              Gerencie credenciais, visualize usuários e realize backups do sistema.
            </p>
          </div>
          <Button 
            onClick={() => exportMutation.mutate()} 
            disabled={exportMutation.isPending}
            className="rounded-xl flex gap-2"
          >
            <Download className="size-4" />
            {exportMutation.isPending ? "Gerando..." : "Fazer Backup Completo"}
          </Button>
        </div>

        <Alert className="rounded-2xl bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900">
          <Info className="size-4 text-amber-600" />
          <AlertTitle className="text-amber-800 dark:text-amber-400">Atenção</AlertTitle>
          <AlertDescription className="text-amber-700 dark:text-amber-500">
            Esta área contém informações sensíveis. Não compartilhe as chaves de API com terceiros.
            As senhas dos usuários são criptografadas e não podem ser visualizadas em texto plano por segurança.
          </AlertDescription>
        </Alert>

        <div className="grid gap-6 md:grid-cols-2">
          <Card className="rounded-3xl border-border/50 shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="size-5 text-primary" />
                Configuração Supabase
              </CardTitle>
              <CardDescription>URLs e chaves de acesso ao backend.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground">Supabase URL</label>
                <div className="flex gap-2">
                  <code className="flex-1 p-2 bg-muted rounded-lg text-xs break-all truncate">
                    {data?.config.url || "Indisponível"}
                  </code>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={() => copyToClipboard(data?.config.url || "", "url")}
                  >
                    {copiedKey === "url" ? <Check className="size-4" /> : <Copy className="size-4" />}
                  </Button>
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground">Anon / Publishable Key</label>
                <div className="flex gap-2">
                  <code className="flex-1 p-2 bg-muted rounded-lg text-xs break-all truncate">
                    {data?.config.publishableKey || "Indisponível"}
                  </code>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={() => copyToClipboard(data?.config.publishableKey || "", "anon")}
                  >
                    {copiedKey === "anon" ? <Check className="size-4" /> : <Copy className="size-4" />}
                  </Button>
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground">Service Role Key</label>
                <div className="flex gap-2">
                  <code className="flex-1 p-2 bg-muted rounded-lg text-xs italic">
                    {data?.config.serviceRoleKey === "REDACTED" ? "•••••••••••••••• (Protegida no Servidor)" : "Não configurada"}
                  </code>
                  <Badge variant="outline">Admin-Only</Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-3xl border-border/50 shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="size-5 text-primary" />
                Resumo de Acessos
              </CardTitle>
              <CardDescription>Estatísticas rápidas do banco de dados.</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-muted/50 rounded-2xl text-center">
                <p className="text-2xl font-bold">{data?.users.length || 0}</p>
                <p className="text-xs text-muted-foreground">Usuários Cadastrados</p>
              </div>
              <div className="p-4 bg-muted/50 rounded-2xl text-center">
                <p className="text-2xl font-bold">Ativo</p>
                <p className="text-xs text-muted-foreground">Status do Banco</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="rounded-3xl border-border/50 shadow-sm overflow-hidden">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Key className="size-5 text-primary" />
              Usuários e Identidades
            </CardTitle>
            <CardDescription>Lista de usuários registrados no sistema.</CardDescription>
          </CardHeader>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>E-mail</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Senha</TableHead>
                  <TableHead>Criação</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data?.users.map((user: any) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">{user.full_name || "N/A"}</TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>
                      <Badge variant={user.status === "active" ? "secondary" : "outline"}>
                        {user.status === "active" ? "Ativo" : user.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <span className="text-xs text-muted-foreground italic">Criptografada (BCrypt/Argon2)</span>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {new Date(user.created_at).toLocaleDateString()}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </Card>
      </div>
    </AppShell>
  );
}
