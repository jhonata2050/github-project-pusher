import { Link } from "@tanstack/react-router";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

export function AdminTicketsHeader() {
  return (
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Gestão de Tickets</h1>
        <p className="text-muted-foreground mt-1">
          Responda, altere status (análise, verificação) e finalize solicitações de suporte.
        </p>
      </div>
      <div className="flex gap-2">
        <Button 
          asChild
          className="bg-brand text-brand-foreground hover:bg-brand/90 rounded-2xl px-5 gap-2 shadow-sm"
        >
          <Link to="/tickets">
            <Plus className="h-4 w-4" /> Abrir Chamado
          </Link>
        </Button>
      </div>
    </div>
  );
}
