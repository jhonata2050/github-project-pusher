import React from "react";
import { Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ContainerEventItem } from "./types";

export interface UptimeEventListProps {
  events: ContainerEventItem[];
}

export function UptimeEventList({ events }: UptimeEventListProps) {
  return (
    <div className="pt-3 border-t space-y-2.5">
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
          <Clock className="h-3.5 w-3.5 text-primary" /> Registro de Eventos do Container
        </span>
        <Badge variant="outline" className="text-[10px] font-mono py-0 px-2">
          {events.length} eventos detectados
        </Badge>
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        {events.map((evt) => (
          <div
            key={evt.id}
            className="flex items-start justify-between p-2.5 rounded-xl border bg-muted/20 text-xs font-mono gap-2 hover:bg-muted/40 transition-colors"
          >
            <div className="flex items-start gap-2.5">
              <div className={`h-6 w-6 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${evt.iconBg}`}>
                {evt.icon}
              </div>
              <div className="space-y-0.5">
                <strong className="text-foreground text-[11px] block leading-snug">{evt.title}</strong>
                <span className="text-[10px] text-muted-foreground block leading-tight">{evt.description}</span>
              </div>
            </div>
            <span className="text-[10px] text-muted-foreground shrink-0 ml-1 bg-muted px-1.5 py-0.5 rounded-md">
              {evt.timeFormatted}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
