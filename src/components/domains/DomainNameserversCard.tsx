import { Card, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Server, Save, Info } from "lucide-react";

interface DomainNameserversCardProps {
  ns1: string;
  ns2: string;
  ns3: string;
  ns4: string;
  setNs1: (val: string) => void;
  setNs2: (val: string) => void;
  setNs3: (val: string) => void;
  setNs4: (val: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  isSaving: boolean;
}

export function DomainNameserversCard({
  ns1,
  ns2,
  ns3,
  ns4,
  setNs1,
  setNs2,
  setNs3,
  setNs4,
  onSubmit,
  isSaving,
}: DomainNameserversCardProps) {
  return (
    <Card className="rounded-3xl border-none shadow-sm bg-card p-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <CardTitle className="text-lg flex items-center gap-2">
            <Server className="size-5 text-primary" /> Servidores DNS (Nameservers)
          </CardTitle>
          <CardDescription className="text-xs">
            Altere os servidores DNS para apontar seu domínio para sua hospedagem ou serviços como Cloudflare.
          </CardDescription>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setNs1("ns1.eqsam.com");
              setNs2("ns2.eqsam.com");
              setNs3("");
              setNs4("");
            }}
            className="rounded-xl text-xs"
          >
            Usar DNS Eqsam
          </Button>
        </div>
      </div>

      <form onSubmit={onSubmit} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Nameserver 1 (Primário) *</Label>
            <Input
              placeholder="ns1.seuservidor.com"
              value={ns1}
              onChange={(e) => setNs1(e.target.value)}
              className="rounded-xl font-mono text-xs"
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Nameserver 2 (Secundário) *</Label>
            <Input
              placeholder="ns2.seuservidor.com"
              value={ns2}
              onChange={(e) => setNs2(e.target.value)}
              className="rounded-xl font-mono text-xs"
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Nameserver 3 (Opcional)</Label>
            <Input
              placeholder="ns3.seuservidor.com"
              value={ns3}
              onChange={(e) => setNs3(e.target.value)}
              className="rounded-xl font-mono text-xs"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Nameserver 4 (Opcional)</Label>
            <Input
              placeholder="ns4.seuservidor.com"
              value={ns4}
              onChange={(e) => setNs4(e.target.value)}
              className="rounded-xl font-mono text-xs"
            />
          </div>
        </div>

        <div className="p-3 bg-secondary/30 rounded-2xl flex items-center gap-2.5 text-xs text-muted-foreground">
          <Info className="size-4 text-primary shrink-0" />
          <span>A propagação de novos Nameservers na internet costuma levar entre 2 e 24 horas.</span>
        </div>

        <div className="pt-2 flex justify-end">
          <Button
            type="submit"
            disabled={isSaving}
            className="rounded-xl gap-2 bg-primary text-primary-foreground"
          >
            <Save className="size-4" />
            {isSaving ? "Salvando DNS..." : "Salvar Nameservers"}
          </Button>
        </div>
      </form>
    </Card>
  );
}
