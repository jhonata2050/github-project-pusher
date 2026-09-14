import { Package, Save } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { ProductCommissionRule } from "@/lib/affiliates/types";
import type { ProductRuleMap } from "./types";

interface ProductCommissionsTabProps {
  products: ProductCommissionRule[];
  productRules: ProductRuleMap;
  globalDefaultPercent: number;
  onProductRuleChange: (productId: string, field: "type" | "value" | "isEnabled", val: any) => void;
  onSave: () => void;
  isSaving: boolean;
}

export function ProductCommissionsTab({
  products,
  productRules,
  globalDefaultPercent,
  onProductRuleChange,
  onSave,
  isSaving,
}: ProductCommissionsTabProps) {
  return (
    <Card>
      <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4">
        <div>
          <CardTitle className="text-lg flex items-center gap-2">
            <Package className="w-5 h-5 text-primary" />
            Porcentagem de Ganho por Serviço / Produto
          </CardTitle>
          <CardDescription>
            Defina individualmente quanto o afiliado ganha ao indicar cada plano (em % ou valor fixo em R$).
          </CardDescription>
        </div>
        <Button
          onClick={onSave}
          disabled={isSaving}
          className="gap-2 shrink-0 bg-primary"
        >
          <Save className="w-4 h-4" />
          {isSaving ? "Salvando..." : "Salvar Comissões"}
        </Button>
      </CardHeader>
      <CardContent>
        {products.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            Nenhum produto cadastrado no catálogo.
          </div>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Serviço / Produto</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead className="w-[180px]">Tipo de Comissão</TableHead>
                  <TableHead className="w-[180px]">Valor da Comissão</TableHead>
                  <TableHead className="text-right w-[120px]">Programa Ativo</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {products.map((p) => {
                  const rule = productRules[p.productId] || {
                    type: "percentage" as const,
                    value: globalDefaultPercent,
                    isEnabled: true,
                  };

                  return (
                    <TableRow key={p.productId}>
                      <TableCell className="font-semibold text-sm">
                        {p.productName}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="text-xs">
                          {p.groupName || "Serviços"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Select
                          value={rule.type}
                          onValueChange={(val: "percentage" | "fixed") =>
                            onProductRuleChange(p.productId, "type", val)
                          }
                        >
                          <SelectTrigger className="h-9">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="percentage">Porcentagem (%)</SelectItem>
                            <SelectItem value="fixed">Valor Fixo (R$)</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <div className="relative">
                          <Input
                            type="number"
                            step="0.5"
                            min="0"
                            className="h-9 pr-8"
                            value={rule.value}
                            onChange={(e) =>
                              onProductRuleChange(
                                p.productId,
                                "value",
                                Number(e.target.value)
                              )
                            }
                          />
                          <span className="absolute right-2.5 top-2 text-xs font-semibold text-muted-foreground">
                            {rule.type === "percentage" ? "%" : "R$"}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <Switch
                          checked={rule.isEnabled}
                          onCheckedChange={(checked) =>
                            onProductRuleChange(p.productId, "isEnabled", checked)
                          }
                        />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
