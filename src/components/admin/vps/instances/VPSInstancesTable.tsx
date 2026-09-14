import { Save, Power, PowerOff, RotateCcw, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { VPSInstancesTableProps } from "./types";

export function VPSInstancesTable({
  instances,
  editingId,
  editValues,
  isActionPending,
  onEditChange,
  onStartEdit,
  onSaveEdit,
  onAction,
  onConfigureSSH,
}: VPSInstancesTableProps) {
  return (
    <Card className="rounded-3xl border-2">
      <CardHeader>
        <CardTitle>Instâncias Ativas</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Cliente</TableHead>
              <TableHead>External ID</TableHead>
              <TableHead>IP</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {instances?.map((vps) => (
              <TableRow key={vps.id}>
                <TableCell>
                  <div className="flex flex-col">
                    <span className="font-medium">{vps.service?.profile?.full_name || "Sem nome"}</span>
                    <span className="text-xs text-muted-foreground">{vps.service?.profile?.email || "Sem e-mail"}</span>
                  </div>
                </TableCell>
                <TableCell>
                  {editingId === vps.id ? (
                    <Input 
                      value={editValues.external_id ?? ""} 
                      onChange={(e) => onEditChange({ ...editValues, external_id: e.target.value })}
                      className="h-8 w-32 rounded-lg"
                    />
                  ) : (
                    <code className="text-xs bg-muted px-1 rounded">{vps.external_id || "—"}</code>
                  )}
                </TableCell>
                <TableCell>
                  {editingId === vps.id ? (
                    <Input 
                      value={editValues.ip_address ?? ""} 
                      onChange={(e) => onEditChange({ ...editValues, ip_address: e.target.value })}
                      className="h-8 w-32 rounded-lg"
                    />
                  ) : (
                    vps.ip_address || "Pendente"
                  )}
                </TableCell>
                <TableCell>
                  <Badge 
                    variant={vps.status === "active" ? "outline" : "secondary"} 
                    className={vps.status === "active" ? "border-lime-500 text-lime-600" : ""}
                  >
                    {vps.status}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1">
                    {editingId === vps.id ? (
                      <Button 
                        size="sm" 
                        variant="ghost" 
                        className="text-lime-600"
                        onClick={() => onSaveEdit(editValues)}
                      >
                        <Save className="h-4 w-4" />
                      </Button>
                    ) : (
                      <>
                        <Button 
                          size="sm" 
                          variant="ghost" 
                          title="Ligar"
                          onClick={() => onAction(vps.id, "start")}
                          disabled={isActionPending}
                        >
                          <Power className="h-4 w-4 text-lime-600" />
                        </Button>
                        <Button 
                          size="sm" 
                          variant="ghost" 
                          title="Desligar"
                          onClick={() => onAction(vps.id, "stop")}
                          disabled={isActionPending}
                        >
                          <PowerOff className="h-4 w-4 text-destructive" />
                        </Button>
                        <Button 
                          size="sm" 
                          variant="ghost" 
                          title="Reiniciar"
                          onClick={() => onAction(vps.id, "restart")}
                          disabled={isActionPending}
                        >
                          <RotateCcw className="h-4 w-4 text-blue-500" />
                        </Button>
                        <Button 
                          size="sm" 
                          variant="ghost" 
                          onClick={() => onConfigureSSH(vps)} 
                          title="Configurar SSH"
                        >
                          <ShieldCheck className="h-4 w-4" />
                        </Button>
                        <Button 
                          size="sm" 
                          variant="ghost" 
                          onClick={() => onStartEdit(vps)}
                        >
                          Editar
                        </Button>
                      </>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
