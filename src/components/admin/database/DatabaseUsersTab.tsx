import React from "react";
import { Users } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { DatabaseUsersTabProps } from "./types";

export const DatabaseUsersTab: React.FC<DatabaseUsersTabProps> = ({ users }) => {
  return (
    <Card className="rounded-3xl border shadow-sm overflow-hidden">
      <CardHeader className="border-b bg-muted/20">
        <CardTitle className="text-lg flex items-center gap-2">
          <Users className="size-5 text-primary" /> Usuários Cadastrados
        </CardTitle>
        <CardDescription>Lista recente de perfis registrados no banco de dados</CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>E-mail</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Criado em</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users && users.length > 0 ? (
              users.map((u) => (
                <TableRow key={u.id}>
                  <TableCell className="font-medium text-xs">{u.full_name || "Sem nome"}</TableCell>
                  <TableCell className="text-xs">{u.email}</TableCell>
                  <TableCell>
                    <Badge variant={u.status === "active" ? "default" : "secondary"} className="rounded-md text-[10px]">
                      {u.status || "active"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {u.created_at ? format(new Date(u.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR }) : "-"}
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-6 text-muted-foreground text-xs">
                  Nenhum usuário encontrado.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};
