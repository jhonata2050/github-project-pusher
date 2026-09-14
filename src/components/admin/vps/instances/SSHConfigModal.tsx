import { Button } from "@/components/ui/button";
import { CardDescription } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { SSHConfigModalProps } from "./types";

export function SSHConfigModal({
  isOpen,
  sshValues,
  isSaving,
  onOpenChange,
  onChange,
  onSave,
}: SSHConfigModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md rounded-3xl border-none">
        <DialogHeader>
          <DialogTitle>Configurar Acesso SSH</DialogTitle>
          <CardDescription>Defina as credenciais para o cliente acessar a VPS.</CardDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="grid gap-2">
            <Label>Host / IP</Label>
            <Input 
              value={sshValues.ssh_host ?? ""} 
              onChange={(e) => onChange({ ...sshValues, ssh_host: e.target.value })} 
              className="rounded-xl" 
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label>Porta</Label>
              <Input 
                type="number" 
                value={sshValues.ssh_port ?? 22} 
                onChange={(e) => onChange({ ...sshValues, ssh_port: parseInt(e.target.value, 10) || 22 })} 
                className="rounded-xl" 
              />
            </div>
            <div className="grid gap-2">
              <Label>Usuário</Label>
              <Input 
                value={sshValues.ssh_user ?? ""} 
                onChange={(e) => onChange({ ...sshValues, ssh_user: e.target.value })} 
                className="rounded-xl" 
              />
            </div>
          </div>
          <div className="grid gap-2">
            <Label>Senha SSH</Label>
            <Input 
              value={sshValues.ssh_password ?? ""} 
              onChange={(e) => onChange({ ...sshValues, ssh_password: e.target.value })} 
              className="rounded-xl" 
            />
          </div>
        </div>
        <DialogFooter>
          <Button 
            onClick={onSave} 
            disabled={isSaving} 
            className="w-full rounded-xl bg-brand text-brand-foreground hover:bg-brand/90"
          >
            {isSaving ? "Salvando..." : "Salvar Credenciais"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
