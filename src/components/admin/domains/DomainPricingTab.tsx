import { Plus, Save } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import type { TldPricing } from "./types";

interface DomainPricingTabProps {
  tldList: TldPricing[];
  onUpdateTldPrice: (index: number, field: string, value: any) => void;
  onAddTld: () => void;
  onSavePricing: () => void;
  isSavingPricing: boolean;
}

export function DomainPricingTab({
  tldList,
  onUpdateTldPrice,
  onAddTld,
  onSavePricing,
  isSavingPricing,
}: DomainPricingTabProps) {
  return (
    <Card className="rounded-3xl border-none shadow-sm bg-card p-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h3 className="text-lg font-bold text-foreground">Tabela de Preços por Extensão (TLDs)</h3>
          <p className="text-xs text-muted-foreground">
            Defina o custo e a margem de revenda para cada extensão de domínio oferecida no painel.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={onAddTld} className="rounded-xl text-xs gap-1.5">
            <Plus className="size-3.5" /> Adicionar TLD
          </Button>
          <Button 
            onClick={onSavePricing} 
            disabled={isSavingPricing}
            className="rounded-xl text-xs gap-1.5 bg-primary text-primary-foreground"
          >
            <Save className="size-3.5" /> Salvar Tabela
          </Button>
        </div>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-border">
        <table className="w-full text-left text-sm">
          <thead className="bg-secondary/30 text-xs font-semibold text-muted-foreground uppercase">
            <tr>
              <th className="px-4 py-3">Extensão</th>
              <th className="px-4 py-3">Preço de Custo (R$)</th>
              <th className="px-4 py-3">Preço de Venda (R$/ano)</th>
              <th className="px-4 py-3">Renovação (R$)</th>
              <th className="px-4 py-3">Registrador</th>
              <th className="px-4 py-3 text-center">Ativo</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {tldList.map((tld, idx) => (
              <tr key={idx} className="hover:bg-secondary/10">
                <td className="px-4 py-3">
                  <Input 
                    value={tld.extension} 
                    onChange={(e) => onUpdateTldPrice(idx, "extension", e.target.value)}
                    className="h-9 w-28 rounded-xl font-bold font-mono text-xs"
                  />
                </td>
                <td className="px-4 py-3">
                  <Input 
                    type="number"
                    step="0.01"
                    value={tld.cost_price} 
                    onChange={(e) => onUpdateTldPrice(idx, "cost_price", Number(e.target.value))}
                    className="h-9 w-28 rounded-xl text-xs"
                  />
                </td>
                <td className="px-4 py-3">
                  <Input 
                    type="number"
                    step="0.01"
                    value={tld.register_price} 
                    onChange={(e) => onUpdateTldPrice(idx, "register_price", Number(e.target.value))}
                    className="h-9 w-28 rounded-xl text-xs font-bold text-primary"
                  />
                </td>
                <td className="px-4 py-3">
                  <Input 
                    type="number"
                    step="0.01"
                    value={tld.renew_price} 
                    onChange={(e) => onUpdateTldPrice(idx, "renew_price", Number(e.target.value))}
                    className="h-9 w-28 rounded-xl text-xs"
                  />
                </td>
                <td className="px-4 py-3">
                  <select 
                    value={tld.registrar || "openprovider"}
                    onChange={(e) => onUpdateTldPrice(idx, "registrar", e.target.value)}
                    className="h-9 rounded-xl border border-input bg-card px-2.5 text-xs text-foreground"
                  >
                    <option value="openprovider">Openprovider</option>
                    <option value="resellerclub">ResellerClub</option>
                    <option value="registrobr">Registro.br (Manual/EPP)</option>
                  </select>
                </td>
                <td className="px-4 py-3 text-center">
                  <Switch 
                    checked={tld.is_active}
                    onCheckedChange={(v) => onUpdateTldPrice(idx, "is_active", v)}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
