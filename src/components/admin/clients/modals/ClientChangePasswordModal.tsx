import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Key, Eye, EyeOff, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { adminChangeUserPassword } from "@/lib/admin.functions";

interface ClientChangePasswordModalProps {
  clientId: string;
  clientName?: string | null;
  clientEmail?: string | null;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ClientChangePasswordModal({
  clientId,
  clientName,
  clientEmail,
  isOpen,
  onOpenChange,
}: ClientChangePasswordModalProps) {
  const [newPasswordValue, setNewPasswordValue] = useState("");
  const [showPasswordText, setShowPasswordText] = useState(false);

  const executeChangePassword = useServerFn(adminChangeUserPassword);
  const changePasswordMutation = useMutation({
    mutationFn: (newPassword: string) => executeChangePassword({ data: { userId: clientId, newPassword } }),
    onSuccess: () => {
      onOpenChange(false);
      setNewPasswordValue("");
      toast.success("Senha do cliente alterada com sucesso!");
    },
    onError: (err: any) => {
      toast.error("Erro ao alterar senha: " + err.message);
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPasswordValue || newPasswordValue.length < 6) {
      toast.error("A senha deve ter no mínimo 6 caracteres.");
      return;
    }
    changePasswordMutation.mutate(newPasswordValue);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-3xl max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Key className="size-5 text-brand" /> Alterar Senha do Cliente
          </DialogTitle>
          <DialogDescription>
            Defina uma nova senha para {clientName || clientEmail || "o cliente"}. A alteração tem efeito imediato.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-semibold">Nova Senha</Label>
              <button
                type="button"
                onClick={() => {
                  const chars = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789!@#$%&*";
                  let pass = "Eq#";
                  for (let i = 0; i < 9; i++) {
                    pass += chars.charAt(Math.floor(Math.random() * chars.length));
                  }
                  setNewPasswordValue(pass);
                  setShowPasswordText(true);
                }}
                className="text-[10px] text-brand hover:underline font-semibold"
              >
                Gerar Senha Forte
              </button>
            </div>

            <div className="relative">
              <Input 
                type={showPasswordText ? "text" : "password"}
                placeholder="Digite ou gere uma senha..."
                value={newPasswordValue}
                onChange={(e) => setNewPasswordValue(e.target.value)}
                className="rounded-xl font-mono text-sm pr-10"
                required
              />
              <button
                type="button"
                onClick={() => setShowPasswordText(!showPasswordText)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showPasswordText ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>
          </div>

          <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-[11px] text-amber-700 dark:text-amber-400 space-y-1">
            <p className="font-bold flex items-center gap-1">
              <AlertCircle className="size-3.5 shrink-0" /> Atenção:
            </p>
            <p>
              O cliente precisará desta nova senha para efetuar login imediatamente. Certifique-se de salvá-la e repassá-la ao cliente.
            </p>
          </div>

          <DialogFooter className="gap-2 pt-2">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => onOpenChange(false)}
              className="rounded-xl"
            >
              Cancelar
            </Button>
            <Button 
              type="submit"
              disabled={changePasswordMutation.isPending || !newPasswordValue}
              className="rounded-xl bg-brand text-brand-foreground hover:bg-brand/90 font-semibold"
            >
              {changePasswordMutation.isPending ? "Salvando..." : "Salvar Nova Senha"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
