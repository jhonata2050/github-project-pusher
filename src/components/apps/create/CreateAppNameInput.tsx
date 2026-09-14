import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export interface CreateAppNameInputProps {
  appName: string;
  onChangeAppName: (name: string) => void;
}

export function CreateAppNameInput({
  appName,
  onChangeAppName,
}: CreateAppNameInputProps) {
  const isEmpty = !appName.trim();

  return (
    <Card className="rounded-3xl border shadow-sm">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-bold">Parâmetros da Aplicação</CardTitle>
          <Badge
            variant="outline"
            className="text-[10px] font-semibold text-amber-600 dark:text-amber-400 border-amber-500/30 bg-amber-500/5"
          >
            Campo Obrigatório
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-xs font-semibold flex items-center gap-1">
              Nome da Aplicação <span className="text-rose-500 font-bold text-sm">*</span>
            </Label>
            {isEmpty && (
              <span className="text-[10px] font-bold text-rose-500">Obrigatório preencher</span>
            )}
          </div>
          <Input
            value={appName}
            onChange={(e) => onChangeAppName(e.target.value)}
            placeholder="Ex: meu-bot-whatsapp, n8n, api-node"
            className={cn(
              "rounded-xl font-medium text-xs h-11",
              isEmpty
                ? "border-rose-500/60 focus-visible:ring-rose-500 bg-rose-500/5"
                : "border-border"
            )}
            required
          />
          {isEmpty ? (
            <p className="text-[11px] text-rose-500 font-medium">
              ⚠️ O preenchimento do nome da aplicação é obrigatório para identificação no painel.
            </p>
          ) : (
            <p className="text-[11px] text-muted-foreground">
              Identificação visual da sua aplicação na lista de serviços e no painel.
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
