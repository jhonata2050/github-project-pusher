import React from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import type { ServerRow } from "./types";

export interface EditServerModalProps {
  server: ServerRow | null;
  onClose: () => void;
  onSubmit: (data: {
    id: string;
    name: string;
    hostname: string;
    ip_address?: string | undefined;
    api_user: string;
    api_token?: string | undefined;
    max_accounts: number;
  }) => void;
  isPending: boolean;
}

export function EditServerModal({
  server,
  onClose,
  onSubmit,
  isPending,
}: EditServerModalProps) {
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!server) return;
    const formData = new FormData(e.currentTarget);
    onSubmit({
      id: server.id,
      name: formData.get("name") as string,
      hostname: formData.get("hostname") as string,
      ip_address: (formData.get("ip_address") as string) || undefined,
      api_user: formData.get("api_user") as string,
      api_token: (formData.get("api_token") as string) || undefined,
      max_accounts: Number(formData.get("max_accounts")) || 100,
    });
  };

  return (
    <Dialog open={server !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="rounded-3xl border-none shadow-2xl max-w-md">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">Editar Servidor</DialogTitle>
        </DialogHeader>
        {server && (
          <form onSubmit={handleSubmit} className="space-y-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="edit-name">Nome Amigável</Label>
              <Input
                id="edit-name"
                name="name"
                defaultValue={server.name ?? ""}
                required
                className="rounded-xl"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-hostname">Hostname/IP da API</Label>
              <Input
                id="edit-hostname"
                name="hostname"
                defaultValue={server.hostname}
                required
                className="rounded-xl"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-api_user" className="flex items-center gap-2">
                Usuário API
                <Badge variant="outline" className="text-[9px] uppercase px-1.5 py-0">
                  Formato: user|key
                </Badge>
              </Label>
              <Input
                id="edit-api_user"
                name="api_user"
                defaultValue={server.api_user}
                required
                className="rounded-xl"
              />
              <p className="text-[10px] text-muted-foreground px-1">
                Formato obrigatório: USUARIO|NOME_DA_CHAVE
              </p>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-api_token">Chave de API / Senha</Label>
              <Input
                id="edit-api_token"
                name="api_token"
                type="password"
                placeholder="Deixe vazio para manter a atual"
                className="rounded-xl"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="edit-ip_address">IP Público</Label>
                <Input
                  id="edit-ip_address"
                  name="ip_address"
                  defaultValue={server.ip_address ?? ""}
                  className="rounded-xl"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-max_accounts">Limite de Contas</Label>
                <Input
                  id="edit-max_accounts"
                  name="max_accounts"
                  type="number"
                  defaultValue={server.max_accounts ?? 100}
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
                {isPending ? "Salvando..." : "Salvar Alterações"}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
