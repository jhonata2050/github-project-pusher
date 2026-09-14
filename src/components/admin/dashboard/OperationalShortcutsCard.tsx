import { Link } from "@tanstack/react-router";
import { Users, Server, Database, MessageSquare } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

const SHORTCUTS = [
  { label: "Clientes", to: "/admin/clients" as const, icon: Users },
  { label: "Serviços", to: "/admin/products" as const, icon: Server },
  { label: "Logs", to: "/admin/logs" as const, icon: Database },
  { label: "Tickets", to: "/admin/tickets" as const, icon: MessageSquare },
];

export function OperationalShortcutsCard() {
  return (
    <Card className="rounded-3xl border-border/50 shadow-sm border">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Atalhos Operacionais</CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-2 gap-2">
        {SHORTCUTS.map((link, i) => (
          <Link
            key={i}
            to={link.to as any}
            className="flex flex-col items-start gap-2 p-3 rounded-2xl bg-muted/30 hover:bg-primary/5 border border-border/50 transition-all group"
          >
            <link.icon className="size-4 text-muted-foreground group-hover:text-primary transition-colors" />
            <span className="text-xs font-semibold">{link.label}</span>
          </Link>
        ))}
      </CardContent>
    </Card>
  );
}
