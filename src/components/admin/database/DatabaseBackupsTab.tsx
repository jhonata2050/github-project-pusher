import React from "react";
import { 
  FolderArchive, 
  HardDrive, 
  CheckCircle2, 
  Download, 
  RefreshCw 
} from "lucide-react";
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
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { DatabaseBackupsTabProps } from "./types";

export const DatabaseBackupsTab: React.FC<DatabaseBackupsTabProps> = ({
  serverBackups,
  isBackupsLoading,
  isExportPending,
  onExport,
  onRefetchBackups,
  onTriggerServerBackup,
}) => {
  return (
    <div className="space-y-6">
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
            <p className="text-xs text-muted-foreground">
              Armazenadas no diretório <code className="text-[11px] bg-muted px-1.5 py-0.5 rounded">/backups</code>
            </p>
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
              onClick={onExport} 
              disabled={isExportPending}
              className="w-full rounded-xl flex gap-2 text-xs"
            >
              <Download className="size-3.5" />
              {isExportPending ? "Baixando..." : "Baixar Cópia Local"}
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
          <Button variant="ghost" size="sm" onClick={onRefetchBackups} className="rounded-xl">
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
                {serverBackups.map((b) => (
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
              <Button onClick={onTriggerServerBackup} size="sm" className="rounded-xl">
                Criar Primeiro Backup
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
