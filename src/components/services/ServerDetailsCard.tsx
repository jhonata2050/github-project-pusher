import { Zap, ExternalLink, HardDrive } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface ServerDetailsCardProps {
  service: any;
  onSSO: (command?: string) => void;
}

export function ServerDetailsCard({ service, onSSO }: ServerDetailsCardProps) {
  return (
    <Card className="lg:col-span-2 rounded-3xl border-none shadow-sm bg-card overflow-hidden">
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2 text-brand">
          <Zap className="size-5 fill-brand" />
          <CardTitle className="text-lg">Detalhes do Servidor</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="grid gap-6 pt-4">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <div className="p-4 rounded-2xl bg-secondary/30">
            <p className="text-xs text-muted-foreground font-medium uppercase">Usuário</p>
            <p className="mt-1 font-bold text-foreground">
              {service.username || "---"}
              {!service.username && (
                <span className="ml-2 text-[10px] text-destructive font-normal block italic">
                  (Pendente Sincronização)
                </span>
              )}
            </p>
          </div>
          <div className="p-4 rounded-2xl bg-secondary/30">
            <p className="text-xs text-muted-foreground font-medium uppercase">IP do Servidor</p>
            <p className="mt-1 font-bold text-foreground">
              {service.servers?.ip_address || service.servers?.hostname || "---"}
            </p>
          </div>
          <div className="p-4 rounded-2xl bg-secondary/30">
            <p className="text-xs text-muted-foreground font-medium uppercase">Servidor</p>
            <p className="mt-1 font-bold text-foreground">{service.servers?.name || "---"}</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-3 pt-2">
          <Button
            onClick={() => onSSO()}
            className="rounded-xl bg-brand text-brand-foreground hover:bg-brand/90 gap-2"
          >
            <ExternalLink className="size-4" />
            Acessar Painel de Controle
          </Button>
          <Button
            variant="outline"
            onClick={() => onSSO("CMD_FILE_MANAGER")}
            className="rounded-xl border-border hover:bg-secondary/50 gap-2"
          >
            <HardDrive className="size-4" />
            Gerenciador de Arquivos
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
