import { AlertCircle, Check, Copy, Shield } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

const DA_COMMANDS = [
  "CMD_API_LOGIN_KEYS",
  "CMD_API_SHOW_USER_CONFIG",
  "CMD_API_PACKAGES_USER",
  "CMD_API_ACCOUNT_USER",
  "CMD_API_SELECT_USERS",
];

const WHITELIST_IP = "34.91.200.163";

export function ServerCommandsModal() {
  const handleCopyIp = () => {
    navigator.clipboard.writeText(WHITELIST_IP);
    toast.success("IP copiado para a área de transferência!");
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" className="rounded-2xl border-brand/20 text-brand cursor-pointer">
          <Shield className="mr-2 h-4 w-4" /> Comandos Necessários
        </Button>
      </DialogTrigger>
      <DialogContent className="rounded-3xl border-none shadow-2xl max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold flex items-center gap-2">
            <Shield className="h-6 w-6 text-brand" />
            Configuração da Login Key
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-6 py-4">
          <div className="bg-brand/5 border border-brand/10 p-4 rounded-2xl space-y-2">
            <h4 className="font-bold text-brand flex items-center gap-2">
              <AlertCircle className="h-4 w-4" /> Importante: Whitelist de IP
            </h4>
            <p className="text-sm text-muted-foreground">
              Para que o Eqsam Cloud consiga se comunicar com seu DirectAdmin, você deve permitir o IP abaixo na sua Login Key:
            </p>
            <div className="flex items-center justify-between bg-background p-3 rounded-xl border border-brand/20">
              <code className="text-brand font-mono font-bold">{WHITELIST_IP}</code>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 rounded-lg cursor-pointer"
                onClick={handleCopyIp}
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="space-y-3">
            <h4 className="font-bold text-foreground">Configuração para SSO Seguro (Login-URL):</h4>
            <p className="text-sm text-muted-foreground">
              O sistema utiliza a API do DirectAdmin para delegação segura de sessões. A Login Key deve possuir as permissões necessárias para gerenciar usuários e visualizar configurações.
            </p>
            <div className="bg-muted/50 p-4 rounded-2xl grid grid-cols-1 gap-2 text-[13px] font-mono">
              {DA_COMMANDS.map((cmd) => (
                <div key={cmd} className="flex items-center gap-2 text-muted-foreground">
                  <Check className="h-3 w-3 text-brand" /> {cmd}
                </div>
              ))}
            </div>
            <div className="p-3 bg-brand/5 border border-brand/20 rounded-xl text-brand text-[11px] leading-tight">
              <strong>Nota de Segurança:</strong> O SSO utiliza o mecanismo nativo de delegação do servidor. Se o seu servidor não suportar `api/login/url`, o login direto para clientes estará indisponível por motivos de segurança.
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
