import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AppShell } from "@/components/app/AppShell";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";
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
  type Kind,
  type Stats,
  emptyStats,
  BATCH_SIZE,
  SLOTS,
  ImportHeader,
  ImportWarningCard,
  ImportSlotCard,
  ImportHistoryCard,
  ImportProgressDialog,
} from "@/components/admin/import";

export const Route = createFileRoute("/_authenticated/admin/import")({
  component: AdminWHMCSImportPage,
  head: () => ({
    meta: [
      { title: "Importador WHMCS | Eqsam" },
      {
        name: "description",
        content: "Migre clientes, serviços e faturas do WHMCS para o Eqsam via arquivos CSV.",
      },
      { property: "og:title", content: "Importador WHMCS | Eqsam" },
      {
        property: "og:description",
        content: "Migração de clientes, serviços e faturas do WHMCS para o Eqsam.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

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
        chunk(rows, BATCH_SIZE).map((b) => ({ kind, rows: b }))
      );
      if (batches.length === 0) throw new Error("Nenhuma linha válida encontrada nos arquivos.");

      let done = 0;
      try {
        for (const batch of batches) {
          setStep(
            `Enviando ${batch.kind === "clients" ? "clientes" : batch.kind === "services" ? "serviços" : "faturas"} (${done + 1}/${batches.length})`
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
        `Importação concluída: ${stats.clients.created} clientes, ${stats.services.created} serviços, ${stats.invoices.created} faturas.`
      );
      if (stats.errors.length > 0) {
        toast.warning(`${stats.errors.length} erro(s). Veja o histórico.`);
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
        <ImportHeader />
        <ImportWarningCard />

        <div className="grid gap-4">
          {SLOTS.map((slot) => (
            <ImportSlotCard
              key={slot.key}
              slot={slot}
              file={files[slot.key]}
              onFileSelect={(f) => setFiles((prev) => ({ ...prev, [slot.key]: f }))}
            />
          ))}
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

        <ImportHistoryCard history={history.data as any} />

        <ImportProgressDialog
          open={showStatus}
          onOpenChange={setShowStatus}
          isPending={mutation.isPending}
          isError={mutation.isError}
          errorMessage={mutation.error?.message}
          progress={progress}
          step={step}
          live={live}
        />
      </div>
    </AppShell>
  );
}

