import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  Database as DbIcon, 
  Users, 
  FolderArchive 
} from "lucide-react";
import { useState, useRef } from "react";
import { AppShell } from "@/components/app/AppShell";
import { 
  getDatabaseInfo, 
  exportDatabase, 
  listServerBackups, 
  triggerDatabaseBackup, 
  importDatabaseBackup 
} from "@/lib/database.functions";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  DatabaseHeader, 
  DatabaseBackupsTab, 
  DatabaseConnectionTab, 
  DatabaseUsersTab 
} from "@/components/admin/database";

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

  const { data: dbInfo } = useQuery({
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
      } catch {
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
        <DatabaseHeader
          importingFile={importingFile}
          isImportPending={importMutation.isPending}
          isServerBackupPending={serverBackupMutation.isPending}
          fileInputRef={fileInputRef}
          onFileUpload={handleFileUpload}
          onTriggerServerBackup={() => serverBackupMutation.mutate()}
        />

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

          <TabsContent value="backups" className="space-y-6">
            <DatabaseBackupsTab
              serverBackups={serverBackups}
              isBackupsLoading={isBackupsLoading}
              isExportPending={exportMutation.isPending}
              onExport={() => exportMutation.mutate()}
              onRefetchBackups={() => refetchBackups()}
              onTriggerServerBackup={() => serverBackupMutation.mutate()}
            />
          </TabsContent>

          <TabsContent value="connection" className="space-y-6">
            <DatabaseConnectionTab
              config={dbInfo?.config}
              copiedKey={copiedKey}
              onCopy={copyToClipboard}
            />
          </TabsContent>

          <TabsContent value="users">
            <DatabaseUsersTab users={dbInfo?.users} />
          </TabsContent>
        </Tabs>
      </div>
    </AppShell>
  );
}
