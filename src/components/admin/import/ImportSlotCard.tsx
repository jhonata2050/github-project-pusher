import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { CheckCircle2 } from "lucide-react";
import type { ImportSlotCardProps } from "./types";

export function ImportSlotCard({ slot, file, onFileSelect }: ImportSlotCardProps) {
  const Icon = slot.icon;

  return (
    <Card className="rounded-3xl border-none shadow-sm">
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
            if (f) onFileSelect(f);
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
}
