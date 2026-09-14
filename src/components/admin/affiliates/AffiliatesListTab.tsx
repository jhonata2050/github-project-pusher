import { Award, Edit } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { AffiliateAccount } from "@/lib/affiliates/types";

interface AffiliatesListTabProps {
  affList: AffiliateAccount[];
  onEditAffiliate: (affiliate: AffiliateAccount) => void;
}

export function AffiliatesListTab({ affList, onEditAffiliate }: AffiliatesListTabProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Award className="w-5 h-5 text-primary" />
          Afiliados Cadastrados
        </CardTitle>
        <CardDescription>
          Visualize o desempenho de cada parceiro e personalize a comissão individualmente se desejar.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {affList.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            Nenhum afiliado cadastrado ainda.
          </div>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Código</TableHead>
                  <TableHead>Comissão Base</TableHead>
                  <TableHead>Cliques</TableHead>
                  <TableHead>Vendas</TableHead>
                  <TableHead>Saldo Disponível</TableHead>
                  <TableHead>Total Pago</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ação</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {affList.map((a) => (
                  <TableRow key={a.id}>
                    <TableCell>
                      <div className="font-medium">{a.profiles?.full_name || "Cliente"}</div>
                      <div className="text-xs text-muted-foreground">{a.profiles?.email}</div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="font-mono text-xs">
                        {a.code}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-semibold text-sm">
                      {Number(a.commission_percent || 10)}%
                    </TableCell>
                    <TableCell className="text-sm">{a.total_clicks || 0}</TableCell>
                    <TableCell className="font-medium text-sm">{a.total_sales || 0}</TableCell>
                    <TableCell className="font-bold text-sm text-amber-600 dark:text-amber-400">
                      R$ {Number(a.available_balance || 0).toFixed(2)}
                    </TableCell>
                    <TableCell className="font-bold text-sm text-emerald-600 dark:text-emerald-400">
                      R$ {Number(a.paid_earnings || 0).toFixed(2)}
                    </TableCell>
                    <TableCell>
                      <Badge variant={a.is_active ? "default" : "destructive"}>
                        {a.is_active ? "Ativo" : "Inativo"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 gap-1 text-xs"
                        onClick={() => onEditAffiliate(a)}
                      >
                        <Edit className="w-3.5 h-3.5" />
                        Editar
                      </Button>
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
