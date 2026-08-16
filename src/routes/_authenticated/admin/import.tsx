import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AppShell } from "@/components/app/AppShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RefreshCw, AlertCircle, Users, Server, Receipt, CheckCircle2, Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { parseCsv, chunk } from "@/lib/csv";
import {
  startWhmcsImport,
  importWhmcsBatch,
  finishWhmcsImport,
  listWhmcsImports,
} from "@/lib/whmcs.functions";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";

export const Route = createFileRoute("/_authenticated/admin/import")({
  component: AdminWHMCSImportPage,
  head: () => ({
    meta: [
      { title: "Importador WHMCS | HostPanel" },
      {
        name: "description",
        content: "Migre clientes, serviços e faturas do WHMCS para o HostPanel via arquivos CSV.",
      },
      { property: "og:title", content: "Importador WHMCS | HostPanel" },
      {
        property: "og:description",
        content: "Migração de clientes, serviços e faturas do WHMCS para o HostPanel.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

type Kind = "clients" | "services" | "invoices";

type Stats = {
  clients: { created: number; updated: number; failed: number };
  services: { created: number; failed: number };
  invoices: { created: number; failed: number };
  errors: string[];
};

const emptyStats = (): Stats => ({
  clients: { created: 0, updated: 0, failed: 0 },
  services: { created: 0, failed: 0 },
  invoices: { created: 0, failed: 0 },
  errors: [],
});

const BATCH_SIZE = 100;

const SLOTS: { key: Kind; title: string; icon: typeof Users; hint: string }[] = [
  {
    key: "clients",
    title: "Tabela de Clientes",
    icon: Users,
    hint: "Ex: tblclients.csv. O sistema filtrará automaticamente os campos relevantes.",
  },
  {
    key: "services",
    title: "Tabela de Serviços / Hospedagem",
    icon: Server,
    hint: "Ex: tblhosting.csv. Vincula ao cliente pelo e-mail.",
  },
  {
    key: "invoices",
    title: "Tabela de Faturas",
    icon: Receipt,
    hint: "Ex: tblinvoices.csv. Vincula ao cliente pelo e-mail.",
  },
];

function AdminWHMCSImportPage() {
  const [files, setFiles] = useState<Partial<Record<Kind, File>>>({});
  const [showStatus, setShowStatus] = useState(false);
  const [progress, setProgress] = useState(0);
  const [step, setStep] = useState("");
  const [live, setLive] = useState<Stats>(emptyStats());

  const startJob = useServerFn(startWhmcsImport);
  const sendBatch = useServerFn(importWhmcsBatch);
  const finishJob = useServerFn(finishWhmcsImport);
  const fetchImports = useServerFn(listWhmcsImports);
  const queryClient = useQueryClient();

  const history = useQuery({
    queryKey: ["whmcs-imports"],
    queryFn: () => fetchImports(),
  });

  const mutation = useMutation({
    mutationFn: async () => {
      setShowStatus(true);
      setProgress(0);
      setStep("Preparando arquivos...");
      const total = emptyStats();
      setLive(total);
      
      const sessionStart = new Date();

      const { jobId } = await startJob();

      // Lê e converte os CSVs no navegador (evita enviar arquivos gigantes de uma vez)
      const parsed: { kind: Kind; rows: Record<string, string>[] }[] = [];
      for (const slot of SLOTS) {
        const file = files[slot.key];
        if (!file) continue;
        setStep(`Lendo ${file.name}...`);
        const rows = parseCsv(await file.text());
        if (rows.length > 0) parsed.push({ kind: slot.key, rows });
      }

      const batches = parsed.flatMap(({ kind, rows }) =>
        chunk(rows, BATCH_SIZE).map((b) => ({ kind, rows: b })),
      );
      if (batches.length === 0) throw new Error("Nenhuma linha válida encontrada nos arquivos.");

      let done = 0;
      try {
        for (const batch of batches) {
          setStep(
            `Enviando ${batch.kind === "clients" ? "clientes" : batch.kind === "services" ? "serviços" : "faturas"} (${done + 1}/${batches.length})`,
          );
          const res = (await sendBatch({ data: batch })) as Stats;
          total.clients.created += res.clients.created;
          total.clients.updated += res.clients.updated;
          total.clients.failed += res.clients.failed;
          total.services.created += res.services.created;
          total.services.failed += res.services.failed;
          total.invoices.created += res.invoices.created;
          total.invoices.failed += res.invoices.failed;
          for (const err of res.errors) {
            if (total.errors.length < 50) total.errors.push(err);
          }
          done++;
          setProgress(Math.round((done / batches.length) * 100));
          setLive({
            clients: { ...total.clients },
            services: { ...total.services },
            invoices: { ...total.invoices },
            errors: [...total.errors],
          });
        }
      } catch (e) {
        if (jobId) {
          await finishJob({
            data: { jobId, stats: total, errorMessage: (e as Error).message },
          });
        }
        throw e;
      }

      if (jobId) await finishJob({ data: { jobId, stats: total } });
      setStep("Concluído");
      return total;
    },
    onSuccess: (stats) => {
      toast.success(
        `Importação concluída: ${stats.clients.created} clientes, ${stats.services.created} serviços, ${stats.invoices.created} faturas.`,
      );
      if (stats.errors.length > 0) {
        toast.warning(`${stats.errors.length} erro(s). Veja o histórico.`);
        // Note: The global banner in __root.tsx already shows the error message requested by user.
      }
      void queryClient.invalidateQueries();
    },
    onError: (e: Error) => {
      toast.error(e.message);
    },
  });

  const hasFiles = Object.keys(files).length > 0;

  return (
    <AppShell area="admin" breadcrumb={<span>Sistema / Importador WHMCS</span>}>
      <div className="space-y-8 max-w-4xl mx-auto">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Importador WHMCS</h1>
          <p className="text-muted-foreground mt-2">
            Migre clientes, serviços e faturas exportando as tabelas do seu WHMCS em CSV.
          </p>
        </div>

        <Card className="rounded-3xl border border-warning/20 bg-warning/5 shadow-sm">
          <CardContent className="pt-6">
            <div className="flex gap-4">
              <AlertCircle className="h-6 w-6 text-warning shrink-0" />
              <div className="text-sm space-y-2">
                <p className="font-bold text-warning-foreground">Importação Simplificada</p>
                <p className="text-muted-foreground">
                  Você pode exportar as tabelas <strong>completas</strong> (todos os campos) do
                  WHMCS em formato CSV. O sistema identifica automaticamente o que é necessário e
                  envia os dados em lotes de {BATCH_SIZE} linhas, suportando arquivos grandes.
                  Importe primeiro os Clientes, depois Serviços e Faturas.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-4">
          {SLOTS.map((slot) => {
            const Icon = slot.icon;
            const file = files[slot.key];
            return (
              <Card key={slot.key} className="rounded-3xl border-none shadow-sm">
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <Icon className="h-5 w-5 text-brand" />
                    <CardTitle className="text-base">{slot.title}</CardTitle>
                    {file && <CheckCircle2 className="h-4 w-4 text-brand" />}
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Label className="text-xs text-muted-foreground">{slot.hint}</Label>
                  <input
                    type="file"
                    accept=".csv,text/csv"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) setFiles((prev) => ({ ...prev, [slot.key]: f }));
                    }}
                    className="block w-full text-sm text-muted-foreground file:mr-4 file:rounded-xl file:border-0 file:bg-brand/10 file:px-4 file:py-2 file:text-sm file:font-bold file:text-brand"
                  />
                  {file && (
                    <p className="text-xs text-muted-foreground">
                      Arquivo carregado: {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)
                    </p>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>

        <div className="flex justify-end">
          <Button
            onClick={() => mutation.mutate()}
            disabled={!hasFiles || mutation.isPending}
            className="bg-brand text-brand-foreground hover:bg-brand/90 rounded-2xl px-12 font-bold shadow-lg shadow-brand/20"
          >
            <RefreshCw className={cn("mr-2 h-4 w-4", mutation.isPending && "animate-spin")} />
            {mutation.isPending ? "Importando..." : "Iniciar Importação"}
          </Button>
        </div>

        <Card className="rounded-3xl border-none shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">Histórico de importações</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {(history.data ?? []).length === 0 && (
              <p className="text-sm text-muted-foreground">Nenhuma importação executada ainda.</p>
            )}
            {(history.data ?? []).map((job) => {
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
                      Clientes: {stats.clients?.created ?? 0} novos / {stats.clients?.updated ?? 0}{" "}
                      atualizados · Serviços: {stats.services?.created ?? 0} · Faturas:{" "}
                      {stats.invoices?.created ?? 0}
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

        <Dialog open={showStatus} onOpenChange={setShowStatus}>
          <DialogContent className="rounded-3xl sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                {mutation.isPending ? (
                  <Loader2 className="h-5 w-5 animate-spin text-brand" />
                ) : mutation.isError ? (
                  <AlertCircle className="h-5 w-5 text-destructive" />
                ) : (
                  <CheckCircle2 className="h-5 w-5 text-brand" />
                )}
                Status da Importação
              </DialogTitle>
              <DialogDescription>
                {mutation.isPending
                  ? step || "Processando arquivos..."
                  : mutation.isError
                    ? "Ocorreu um erro durante a importação."
                    : "Migração finalizada com sucesso!"}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <div className="flex justify-between text-xs font-medium">
                  <span>Progresso</span>
                  <span>{mutation.isError ? "Erro" : `${progress}%`}</span>
                </div>
                <Progress value={progress} className="h-2" />
              </div>

              <div className="grid grid-cols-3 gap-2 text-center pt-2">
                <div className="rounded-2xl bg-muted/50 p-3">
                  <p className="text-xl font-bold text-brand">{live.clients.created}</p>
                  <p className="text-[10px] text-muted-foreground uppercase">Clientes</p>
                </div>
                <div className="rounded-2xl bg-muted/50 p-3">
                  <p className="text-xl font-bold text-brand">{live.services.created}</p>
                  <p className="text-[10px] text-muted-foreground uppercase">Serviços</p>
                </div>
                <div className="rounded-2xl bg-muted/50 p-3">
                  <p className="text-xl font-bold text-brand">{live.invoices.created}</p>
                  <p className="text-[10px] text-muted-foreground uppercase">Faturas</p>
                </div>
              </div>

              {mutation.isError && (
                <div className="rounded-2xl bg-destructive/10 p-3 text-sm text-destructive font-medium">
                  {mutation.error?.message || "Erro desconhecido ao processar os arquivos."}
                </div>
              )}
            </div>
            {!mutation.isPending && (
              <Button
                onClick={() => setShowStatus(false)}
                className="w-full rounded-2xl bg-brand font-bold"
              >
                Fechar
              </Button>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </AppShell>
  );
}
