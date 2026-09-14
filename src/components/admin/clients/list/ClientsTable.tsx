import { Link } from "@tanstack/react-router";
import { ExternalLink } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { ClientItem } from "./types";

interface ClientsTableProps {
  paginatedData: ClientItem[];
  filtered: ClientItem[];
  selectedIds: string[];
  onToggleSelect: (id: string) => void;
  onToggleSelectAll: () => void;
}

export function ClientsTable({
  paginatedData,
  filtered,
  selectedIds,
  onToggleSelect,
  onToggleSelectAll,
}: ClientsTableProps) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-12">
              <Checkbox
                checked={selectedIds.length === filtered.length && filtered.length > 0}
                onCheckedChange={onToggleSelectAll}
                aria-label="Selecionar todos"
              />
            </TableHead>
            <TableHead>Cliente</TableHead>
            <TableHead className="hidden md:table-cell">E-mail</TableHead>
            <TableHead className="hidden lg:table-cell">Telefone</TableHead>
            <TableHead>Situação</TableHead>
            <TableHead className="text-right">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {paginatedData.map((client) => (
            <TableRow key={client.id} className={selectedIds.includes(client.id) ? "bg-muted/30" : ""}>
              <TableCell>
                <Checkbox
                  checked={selectedIds.includes(client.id)}
                  onCheckedChange={() => onToggleSelect(client.id)}
                  aria-label={`Selecionar ${client.full_name}`}
                />
              </TableCell>
              <TableCell className="font-medium">
                <div className="flex flex-col">
                  <div className="flex items-center gap-2">
                    <span>{client.full_name ?? "Sem nome"}</span>
                    {client.whmcs_id && (
                      <Badge variant="outline" className="text-[10px] h-4 px-1">
                        WHMCS: {client.whmcs_id}
                      </Badge>
                    )}
                  </div>
                  <span className="text-xs text-muted-foreground md:hidden">{client.email}</span>
                </div>
                {client.company_name && (
                  <span className="block text-xs text-muted-foreground">{client.company_name}</span>
                )}
              </TableCell>
              <TableCell className="hidden text-muted-foreground md:table-cell">
                {client.email ?? "—"}
              </TableCell>
              <TableCell className="hidden text-muted-foreground lg:table-cell">
                {client.phone ?? "—"}
              </TableCell>
              <TableCell>
                <Badge variant={client.status === "active" ? "default" : "secondary"}>
                  {client.status === "active" ? "Ativo" : client.status}
                </Badge>
              </TableCell>
              <TableCell className="text-right">
                <Button variant="ghost" size="icon" asChild>
                  <Link to="/admin/clients/$clientId" params={{ clientId: client.id }}>
                    <ExternalLink className="size-4" />
                  </Link>
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
