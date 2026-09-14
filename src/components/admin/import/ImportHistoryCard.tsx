import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { ImportHistoryCardProps, Stats } from "./types";

export function ImportHistoryCard({ history }: ImportHistoryCardProps) {
  const items = history ?? [];

  return (
    <Card className="rounded-3xl border-none shadow-sm">
      <CardHeader>
        <CardTitle className="text-base">Histórico de importações</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {items.length === 0 && (
          <p className="text-sm text-muted-foreground">Nenhuma importação executada ainda.</p>
        )}
        {items.map((job) => {
          const stats = job.stats as Partial<Stats> | null;
          return (
            <div key={job.id} className="rounded-2xl bg-muted/40 p-4 text-sm space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-bold capitalize">{job.status}</span>
                <span className="text-xs text-muted-foreground">
                  {job.created_at ? new Date(job.created_at).toLocaleString("pt-BR") : ""}
                </span>
              </div>
              {stats && (
                <p className="text-muted-foreground">
                  Clientes: {stats.clients?.created ?? 0} novos / {stats.clients?.updated ?? 0} atualizados · Serviços: {stats.services?.created ?? 0} · Faturas: {stats.invoices?.created ?? 0}
                </p>
              )}
              {job.error_message && <p className="text-destructive">{job.error_message}</p>}
              {stats?.errors && stats.errors.length > 0 && (
                <ul className="list-disc pl-5 text-xs text-muted-foreground">
                  {stats.errors.slice(0, 5).map((err, i) => (
                    <li key={i}>{err}</li>
                  ))}
                </ul>
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
