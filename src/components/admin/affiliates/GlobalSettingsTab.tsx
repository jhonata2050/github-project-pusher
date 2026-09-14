import { Sliders, Percent, Save } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface GlobalSettingsTabProps {
  globalDefaultPercent: number;
  setGlobalDefaultPercent: (val: number) => void;
  globalCookieDays: number;
  setGlobalCookieDays: (val: number) => void;
  globalMinWithdraw: number;
  setGlobalMinWithdraw: (val: number) => void;
  onSave: () => void;
  isSaving: boolean;
}

export function GlobalSettingsTab({
  globalDefaultPercent,
  setGlobalDefaultPercent,
  globalCookieDays,
  setGlobalCookieDays,
  globalMinWithdraw,
  setGlobalMinWithdraw,
  onSave,
  isSaving,
}: GlobalSettingsTabProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Sliders className="w-5 h-5 text-primary" />
          Configurações Globais do Programa
        </CardTitle>
        <CardDescription>
          Parâmetros padrão aplicados quando um serviço não possui regra específica.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 max-w-lg">
        <div className="space-y-2">
          <Label>Porcentagem Padrão de Comissão (%)</Label>
          <div className="relative">
            <Input
              type="number"
              min="1"
              max="100"
              value={globalDefaultPercent}
              onChange={(e) => setGlobalDefaultPercent(Number(e.target.value))}
            />
            <Percent className="w-4 h-4 absolute right-3 top-2.5 text-muted-foreground" />
          </div>
          <p className="text-xs text-muted-foreground">
            Taxa atribuída automaticamente aos novos afiliados e aos produtos sem regra personalizada.
          </p>
        </div>

        <div className="space-y-2">
          <Label>Validade do Cookie de Indicação (Dias)</Label>
          <Input
            type="number"
            min="1"
            value={globalCookieDays}
            onChange={(e) => setGlobalCookieDays(Number(e.target.value))}
          />
          <p className="text-xs text-muted-foreground">
            Tempo máximo que o visitante pode demorar para assinar após clicar no link e ainda gerar comissão.
          </p>
        </div>

        <div className="space-y-2">
          <Label>Valor Mínimo para Resgate (R$)</Label>
          <Input
            type="number"
            min="1"
            value={globalMinWithdraw}
            onChange={(e) => setGlobalMinWithdraw(Number(e.target.value))}
          />
          <p className="text-xs text-muted-foreground">
            Saldo mínimo acumulado exigido para o cliente transferir para a carteira.
          </p>
        </div>

        <Button
          onClick={onSave}
          disabled={isSaving}
          className="gap-2 mt-2"
        >
          <Save className="w-4 h-4" />
          {isSaving ? "Salvando..." : "Salvar Configurações Globais"}
        </Button>
      </CardContent>
    </Card>
  );
}
