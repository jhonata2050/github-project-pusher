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
import { Users, Gift } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { AffiliateReferralsCardProps } from "./types";

export function AffiliateReferralsCard({ referrals }: AffiliateReferralsCardProps) {
  return (
    <Card className="shadow-sm">
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Users className="w-5 h-5 text-primary" />
          Histórico de Indicações e Comissões
        </CardTitle>
        <CardDescription>
          Acompanhe em tempo real todas as assinaturas e valores gerados pelo seu link de indicação.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {referrals.length === 0 ? (
          <div className="text-center py-12 space-y-3">
            <Gift className="w-12 h-12 text-muted-foreground/40 mx-auto" />
            <p className="text-base font-semibold text-muted-foreground">Nenhuma indicação registrada ainda</p>
            <p className="text-sm text-muted-foreground/80 max-w-md mx-auto">
              Compartilhe seu link de afiliado acima nas suas redes sociais, sites ou com amigos para começar a receber comissões!
            </p>
          </div>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Cliente Indicado</TableHead>
                  <TableHead>Valor da Venda</TableHead>
                  <TableHead>Sua Comissão</TableHead>
                  <TableHead className="text-right">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {referrals.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="text-xs text-muted-foreground">
                      {format(new Date(r.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                    </TableCell>
                    <TableCell className="font-medium text-sm">
                      {r.profiles?.full_name || "Cliente Indicado"}
                    </TableCell>
                    <TableCell className="text-sm">
                      R$ {Number(r.sale_amount).toFixed(2)}
                    </TableCell>
                    <TableCell className="font-semibold text-sm text-emerald-600 dark:text-emerald-400">
                      + R$ {Number(r.commission_amount).toFixed(2)}
                    </TableCell>
                    <TableCell className="text-right">
                      <Badge
                        variant={
                          r.status === "approved" || r.status === "paid"
                            ? "default"
                            : "secondary"
                        }
                      >
                        {r.status === "approved"
                          ? "Disponível"
                          : r.status === "paid"
                          ? "Resgatado"
                          : "Pendente"}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
