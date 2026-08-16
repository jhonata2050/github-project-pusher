import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/app/AppShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Globe, Plus, Shield, Search } from "lucide-react";
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";

export const Route = createFileRoute("/_authenticated/admin/domains")({
  component: AdminDomainsPage,
});

function AdminDomainsPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <AppShell area="admin" breadcrumb={<span>Sistema / Domínios</span>}>
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">Gestão de Domínios</h1>
            <p className="text-muted-foreground mt-2">Integração com registradores e controle de expiração.</p>
          </div>
          <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
            <DialogTrigger asChild>
              <Button className="bg-brand text-brand-foreground hover:bg-brand/90 rounded-2xl px-6">
                <Plus className="mr-2 h-4 w-4" /> Configurar Registrar
              </Button>
            </DialogTrigger>
            <DialogContent className="rounded-3xl border-none shadow-2xl max-w-md">
              <DialogHeader>
                <DialogTitle className="text-2xl font-bold">Configurar API de Domínio</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="grid gap-2">
                  <Label>Provedor</Label>
                  <select className="flex h-10 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50">
                    <option>Namecheap</option>
                    <option>Registro.br (via API)</option>
                    <option>ResellerClub</option>
                  </select>
                </div>
                <div className="grid gap-2">
                  <Label>API Key / Usuário</Label>
                  <Input placeholder="Sua chave de acesso" className="rounded-xl" />
                </div>
                <div className="grid gap-2">
                  <Label>Secret / Token</Label>
                  <Input type="password" placeholder="••••••••" className="rounded-xl" />
                </div>
              </div>
              <DialogFooter>
                <Button className="w-full bg-brand text-brand-foreground rounded-2xl" onClick={() => setIsModalOpen(false)}>
                  Salvar Configuração
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <Card className="rounded-3xl border-none shadow-sm bg-brand/5 border border-brand/10">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-brand">
                <Shield className="h-5 w-5" />
                Automação Ativa
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                O sistema monitora automaticamente a expiração e renovação dos domínios integrados.
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="mt-8 flex flex-col items-center justify-center py-20 bg-muted/30 rounded-3xl border-2 border-dashed border-muted">
          <Globe className="h-12 w-12 text-muted-foreground mb-4 opacity-20" />
          <p className="text-muted-foreground font-medium">Nenhum domínio registrado sob gestão no momento.</p>
        </div>
      </div>
    </AppShell>
  );
}
