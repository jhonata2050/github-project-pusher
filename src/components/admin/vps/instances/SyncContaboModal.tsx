import { UserPlus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CardDescription } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { SyncContaboModalProps } from "./types";

export function SyncContaboModal({
  isOpen,
  isSyncing,
  externalInstances,
  instances,
  onOpenChange,
  onAssignClick,
}: SyncContaboModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl rounded-3xl border-none">
        <DialogHeader>
          <DialogTitle>Sincronizar com Contabo</DialogTitle>
          <CardDescription>
            Listagem de servidores encontrados na sua conta Contabo.
          </CardDescription>
        </DialogHeader>
        
        <div className="max-h-[60vh] overflow-y-auto mt-4 border border-border rounded-2xl">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>External ID</TableHead>
                <TableHead>IP</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ação</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isSyncing ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8">Carregando...</TableCell>
                </TableRow>
              ) : externalInstances?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8">Nenhum servidor encontrado.</TableCell>
                </TableRow>
              ) : (
                externalInstances?.map((instance) => {
                  const isAlreadyLinked = instances?.some(
                    (i) => i.external_id === String(instance.instanceId)
                  );
                  return (
                    <TableRow key={instance.instanceId}>
                      <TableCell className="font-medium">{instance.displayName || instance.name}</TableCell>
                      <TableCell><code>{instance.instanceId}</code></TableCell>
                      <TableCell>{instance.ipAddress || "N/A"}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{instance.status}</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {isAlreadyLinked ? (
                          <Badge variant="secondary" className="text-[10px]">JÁ VINCULADO</Badge>
                        ) : (
                          <Button 
                            size="sm" 
                            variant="outline" 
                            className="rounded-xl"
                            onClick={() => onAssignClick(instance)}
                          >
                            <UserPlus className="mr-2 size-3" /> Vincular
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </DialogContent>
    </Dialog>
  );
}
