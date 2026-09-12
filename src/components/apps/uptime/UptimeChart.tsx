import React from "react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import { Cpu, Activity, HardDrive } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { MetricFilter, ResourcePoint } from "./types";

export interface UptimeChartProps {
  data: ResourcePoint[];
  metricFilter: MetricFilter;
  totalRam: number;
  totalDisk: number;
  metricsTotalDiskFormatted?: string | undefined;
}

export function UptimeChart({
  data,
  metricFilter,
  totalRam,
  totalDisk,
  metricsTotalDiskFormatted,
}: UptimeChartProps) {
  return (
    <div className="h-44 w-full border rounded-2xl p-2 sm:p-3 bg-muted/10">
      <ResponsiveContainer width="100%" height="100%">
        {metricFilter === "all" ? (
          <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="cpuGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.35} />
                <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0.0} />
              </linearGradient>
              <linearGradient id="ramGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.35} />
                <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="currentColor" opacity={0.08} />
            <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={10} tickMargin={6} stroke="currentColor" opacity={0.5} />
            <YAxis
              tickLine={false}
              axisLine={false}
              fontSize={10}
              unit="%"
              stroke="currentColor"
              opacity={0.5}
              domain={[0, (max: number) => Math.min(100, Math.max(25, Math.ceil(max * 1.3)))]}
            />
            <Tooltip
              content={({ active, payload }) => {
                const d = payload?.[0]?.payload as ResourcePoint | undefined;
                if (active && d) {
                  return (
                    <div className="bg-popover text-popover-foreground border rounded-xl p-2.5 shadow-lg text-xs space-y-1.5 font-mono">
                      <p className="font-bold text-[11px] text-muted-foreground">{d.timestamp}</p>
                      <div className="flex items-center justify-between gap-4 text-purple-600 dark:text-purple-400">
                        <span className="flex items-center gap-1"><Cpu className="h-3 w-3" /> CPU:</span>
                        <strong className="font-bold">{d.cpuPercent}%</strong>
                      </div>
                      <div className="flex items-center justify-between gap-4 text-emerald-600 dark:text-emerald-400">
                        <span className="flex items-center gap-1"><Activity className="h-3 w-3" /> RAM:</span>
                        <strong className="font-bold">{d.ramMb} MB ({d.ramPercent}%)</strong>
                      </div>
                      {!d.isOnline && (
                        <Badge variant="outline" className="text-[10px] text-zinc-500 py-0 px-1 mt-1 block">
                          Container Inativo / Antes do Deploy
                        </Badge>
                      )}
                    </div>
                  );
                }
                return null;
              }}
            />
            <Area type="monotone" dataKey="cpuPercent" name="CPU (%)" stroke="#8b5cf6" strokeWidth={2} fillOpacity={1} fill="url(#cpuGrad)" />
            <Area type="monotone" dataKey="ramPercent" name="RAM (%)" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#ramGrad)" />
          </AreaChart>
        ) : metricFilter === "cpu" ? (
          <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="cpuSingleGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.4} />
                <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0.0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="currentColor" opacity={0.08} />
            <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={10} tickMargin={6} stroke="currentColor" opacity={0.5} />
            <YAxis
              tickLine={false}
              axisLine={false}
              fontSize={10}
              unit="%"
              stroke="currentColor"
              opacity={0.5}
              domain={[0, (max: number) => Math.min(100, Math.max(20, Math.ceil(max * 1.4)))]}
            />
            <Tooltip
              content={({ active, payload }) => {
                const d = payload?.[0]?.payload as ResourcePoint | undefined;
                if (active && d) {
                  return (
                    <div className="bg-popover text-popover-foreground border rounded-xl p-2.5 shadow-lg text-xs space-y-1 font-mono">
                      <p className="font-bold text-[11px] text-muted-foreground">{d.timestamp}</p>
                      <div className="flex items-center gap-2 text-purple-600 dark:text-purple-400">
                        <Cpu className="h-3.5 w-3.5" />
                        <span>Uso de CPU: <strong>{d.cpuPercent}%</strong></span>
                      </div>
                      {!d.isOnline && (
                        <span className="text-[10px] text-zinc-500 block">Inativo no momento</span>
                      )}
                    </div>
                  );
                }
                return null;
              }}
            />
            <Area type="monotone" dataKey="cpuPercent" stroke="#8b5cf6" strokeWidth={2} fillOpacity={1} fill="url(#cpuSingleGrad)" />
          </AreaChart>
        ) : metricFilter === "ram" ? (
          <AreaChart data={data} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
            <defs>
              <linearGradient id="ramSingleGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="currentColor" opacity={0.08} />
            <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={10} tickMargin={6} stroke="currentColor" opacity={0.5} />
            <YAxis tickLine={false} axisLine={false} fontSize={10} unit="MB" stroke="currentColor" opacity={0.5} domain={[0, totalRam]} />
            <Tooltip
              content={({ active, payload }) => {
                const d = payload?.[0]?.payload as ResourcePoint | undefined;
                if (active && d) {
                  return (
                    <div className="bg-popover text-popover-foreground border rounded-xl p-2.5 shadow-lg text-xs space-y-1 font-mono">
                      <p className="font-bold text-[11px] text-muted-foreground">{d.timestamp}</p>
                      <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
                        <Activity className="h-3.5 w-3.5" />
                        <span>RAM: <strong>{d.ramMb} MB</strong> ({d.ramPercent}% de {totalRam}MB)</span>
                      </div>
                      {!d.isOnline && (
                        <span className="text-[10px] text-zinc-500 block">Inativo no momento</span>
                      )}
                    </div>
                  );
                }
                return null;
              }}
            />
            <Area type="monotone" dataKey="ramMb" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#ramSingleGrad)" />
          </AreaChart>
        ) : (
          <AreaChart data={data} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
            <defs>
              <linearGradient id="hdSingleGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4} />
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="currentColor" opacity={0.08} />
            <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={10} tickMargin={6} stroke="currentColor" opacity={0.5} />
            <YAxis tickLine={false} axisLine={false} fontSize={10} unit="GB" stroke="currentColor" opacity={0.5} domain={[0, totalDisk]} />
            <Tooltip
              content={({ active, payload }) => {
                const d = payload?.[0]?.payload as ResourcePoint | undefined;
                if (active && d) {
                  return (
                    <div className="bg-popover text-popover-foreground border rounded-xl p-2.5 shadow-lg text-xs space-y-1 font-mono">
                      <p className="font-bold text-[11px] text-muted-foreground">{d.timestamp}</p>
                      <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400">
                        <HardDrive className="h-3.5 w-3.5" />
                        <span>Armazenamento: <strong>{d.diskFormatted || `${d.diskGb} GB`}</strong> ({d.diskPercent}% de {metricsTotalDiskFormatted || `${totalDisk}GB`})</span>
                      </div>
                      {!d.isOnline && (
                        <span className="text-[10px] text-zinc-500 block">Container Inativo / Não Criado</span>
                      )}
                    </div>
                  );
                }
                return null;
              }}
            />
            <Area type="monotone" dataKey="diskGb" stroke="#3b82f6" strokeWidth={2} fillOpacity={1} fill="url(#hdSingleGrad)" />
          </AreaChart>
        )}
      </ResponsiveContainer>
    </div>
  );
}
