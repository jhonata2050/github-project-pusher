import React from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

export interface AddServerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: {
    name: string;
    hostname: string;
    ip_address?: string | undefined;
    api_user: string;
    api_token: string;
    max_accounts: number;
  }) => void;
  isPending: boolean;
}

export function AddServerModal({
  open,
  onOpenChange,
  onSubmit,
  isPending,
}: AddServerModalProps) {
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = {
      name: formData.get("name") as string,
      hostname: formData.get("hostname") as string,
      ip_address: (formData.get("ip_address") as string) || undefined,
      api_user: formData.get("api_user") as string,
      api_token: formData.get("api_token") as string,
      max_accounts: Number(formData.get("max_accounts")) || 100,
    };
    onSubmit(data);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button className="bg-brand text-brand-foreground hover:bg-brand/90 rounded-2xl px-6 cursor-pointer">
          <Plus className="mr-2 h-4 w-4" /> Novo Servidor
        </Button>
      </DialogTrigger>
      <DialogContent className="rounded-3xl border-none shadow-2xl max-w-md">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">Adicionar Servidor</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="name">Nome Amigável</Label>
            <Input
              id="name"
              name="name"
              placeholder="Ex: BR-SERVER-01"
              required
              className="rounded-xl"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="hostname">Hostname/IP da API</Label>
            <Input
              id="hostname"
              name="hostname"
              placeholder="https://da.provedor.com:2222"
              required
              className="rounded-xl"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="api_user" className="flex items-center gap-2">
              Usuário API
              <Badge
                variant="outline"
                className="text-[9px] uppercase px-1.5 py-0 border-brand/50 text-brand font-bold"
              >
                Convenção: USER|KEY
              </Badge>
            </Label>
            <Input
              id="api_user"
              name="api_user"
              placeholder="Ex: admin|TokenEqsam"
              required
              className="rounded-xl"
            />
            <p className="text-[10px] text-muted-foreground px-1">
              Use "usuario|nome_da_chave" para sua organização. O backend enviará o usuário real para o DirectAdmin.
            </p>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="api_token">Chave de API / Senha</Label>
            <Input
              id="api_token"
              name="api_token"
              type="password"
              required
              className="rounded-xl"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="ip_address">IP Público</Label>
              <Input
                id="ip_address"
                name="ip_address"
                placeholder="1.2.3.4"
                className="rounded-xl"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="max_accounts">Limite de Contas</Label>
              <Input
                id="max_accounts"
                name="max_accounts"
                type="number"
                defaultValue="100"
                className="rounded-xl"
              />
            </div>
          </div>
          <DialogFooter className="pt-4">
            <Button
              type="submit"
              disabled={isPending}
              className="bg-brand text-brand-foreground w-full rounded-2xl cursor-pointer"
            >
              {isPending ? "Salvando..." : "Salvar Servidor"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
