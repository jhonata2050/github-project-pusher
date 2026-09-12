import { Link } from "@tanstack/react-router";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { PlusCircle, ShieldAlert, Monitor, Link2, ExternalLink, Edit2 } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

interface ClientServicesTabProps {
  services?: any[];
  servers?: any[];
  isLoading?: boolean;
  onAddService: () => void;
  onEditService: (service: any) => void;
}

export function ClientServicesTab({
  services = [],
  servers = [],
  isLoading = false,
  onAddService,
  onEditService,
}: ClientServicesTabProps) {
  return (
    <Card className="rounded-3xl border-none shadow-sm">
      <CardHeader className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <CardTitle className="text-lg">Serviços Contratados</CardTitle>
          <CardDescription className="text-xs">Hospedagem, servidores VPS, domínios e outros</CardDescription>
        </div>
        <Button
          size="sm"
          onClick={onAddService}
          className="rounded-xl h-9 gap-1.5 bg-brand text-brand-foreground hover:bg-brand/90 shrink-0 font-medium"
        >
          <PlusCircle className="size-4" /> Adicionar Serviço
        </Button>
      </CardHeader>
      <CardContent>
        {isLoading ? <Skeleton className="h-40" /> : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="whitespace-nowrap">Serviço</TableHead>
                  <TableHead className="whitespace-nowrap">Domínio</TableHead>
                  <TableHead className="hidden sm:table-cell">Servidor / VPS</TableHead>
                  <TableHead className="hidden md:table-cell">Vencimento</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-20 text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {services.map((s: any) => (
                  <TableRow key={s.id}>
                    <TableCell className="font-medium text-xs">
                      <div className="flex flex-col gap-1">
                        <span>
                          {s.products?.name || "Produto"}
                          {s.products?.product_type === 'vps' && (
                            <Badge variant="outline" className="ml-2 text-[8px] h-3.5 border-brand/30 text-brand bg-brand/5">VPS</Badge>
                          )}
                        </span>
                        <div className="flex flex-col gap-0.5">
                          {s.username ? (
                            <div className="flex flex-col gap-0.5">
                              <span className="text-[10px] text-muted-foreground font-mono">Usuário: {s.username}</span>
                              {s.password && (
                                <span className="text-[9px] text-muted-foreground font-mono">Senha: {s.password ? '********' : '—'}</span>
                              )}
                            </div>
                          ) : (
                            <span className="text-[10px] text-destructive italic">Usuário ausente</span>
                          )}
                          {s.notes && (
                            <div className="flex items-start gap-1 mt-1 p-1.5 rounded-lg bg-red-500/5 border border-red-500/10 max-w-[200px]">
                              <ShieldAlert className="size-3 text-red-500 shrink-0 mt-0.5" />
                              <span className="text-[9px] text-red-600 font-bold leading-tight break-words">
                                {s.notes}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-xs">
                      {s.domain || "—"}
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">
                      {s.server_id || s.servers ? (
                        <span className="text-xs">
                          {(s.servers?.hostname || servers?.find((sv: any) => sv.id === s.server_id)?.hostname) || "Servidor"}
                        </span>
                      ) : (s.vps_instances && s.vps_instances.length > 0) ? (
                        <div className="flex flex-col gap-0.5">
                          <Link 
                            to="/admin/vps" 
                            className="text-xs font-medium text-brand hover:underline flex items-center gap-1"
                          >
                            <Monitor className="size-3" /> {s.vps_instances[0].name || s.vps_instances[0].ip_address || "Instância VPS"}
                          </Link>
                          <span className="text-[10px] text-muted-foreground font-mono">
                            IP: {s.vps_instances[0].ip_address || "Pendente"} (ID: {s.vps_instances[0].external_id})
                          </span>
                        </div>
                      ) : (s.products?.product_type === 'vps' || s.billing_cycle === 'vps') ? (
                        <Link 
                          to="/admin/vps" 
                          className="text-[10px] text-brand hover:underline flex items-center gap-1"
                        >
                          <Link2 className="size-3" /> Vincular VPS
                        </Link>
                      ) : (
                        <span className="text-[10px] text-destructive italic">Não vinculado</span>
                      )}
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-xs">
                      {s.next_due_date ? format(new Date(s.next_due_date), "dd/MM/yyyy", { locale: ptBR }) : "—"}
                    </TableCell>
                    <TableCell>
                      <Badge className="text-[10px] uppercase px-1.5 h-5" variant={s.status === 'active' ? 'default' : s.status === 'suspended' ? 'secondary' : 'destructive'}>
                        {s.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        {s.status === 'active' && (
                          s.products?.product_type === 'vps' && s.vps_instances?.[0]?.id ? (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="size-8 rounded-lg text-brand hover:text-brand hover:bg-brand/10"
                              asChild
                            >
                              <Link to="/admin/vps" title="Ver VPS no Painel Admin">
                                <Monitor className="size-3" />
                              </Link>
                            </Button>
                          ) : (s.username && s.server_id && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="size-8 rounded-lg text-brand hover:text-brand hover:bg-brand/10"
                              onClick={async () => {
                                const { getDASSOUrl } = await import("@/lib/support.functions");
                                const promise = (async () => {
                                  const url = await getDASSOUrl({ data: { serverId: s.server_id, username: s.username, redirectUrl: '/' } });
                                  window.open(url, '_blank');
                                  return url;
                                })();

                                toast.promise(promise, {
                                  loading: 'Gerando acesso...',
                                  success: 'Redirecionando...',
                                  error: (err) => `Erro: ${err.message}`
                                });
                              }}
                              title="Acessar Painel"
                            >
                              <ExternalLink className="size-3" />
                            </Button>
                          ))
                        )}
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="size-8 rounded-lg"
                          onClick={() => onEditService(s)}
                          title="Editar Detalhes"
                        >
                          <Edit2 className="size-3" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}

                {services.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">Nenhum serviço encontrado</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
