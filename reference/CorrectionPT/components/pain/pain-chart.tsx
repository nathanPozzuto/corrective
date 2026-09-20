"use client"

import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts"

type PainPoint = { loggedAt: Date | string; level: number }

export function PainChart({ data, height = 220 }: { data: PainPoint[]; height?: number }) {
  // Oldest -> newest for a left-to-right timeline.
  const points = [...data]
    .sort((a, b) => new Date(a.loggedAt).getTime() - new Date(b.loggedAt).getTime())
    .map((d) => ({
      date: new Date(d.loggedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      level: d.level,
    }))

  if (points.length === 0) {
    return (
      <div
        className="flex items-center justify-center rounded-lg border border-dashed border-border text-sm text-muted-foreground"
        style={{ height }}
      >
        No pain entries yet — log one to start your recovery curve.
      </div>
    )
  }

  return (
    <ChartContainer
      config={{ level: { label: "Pain level", color: "var(--chart-4)" } }}
      style={{ height }}
      className="w-full"
    >
      <AreaChart data={points} margin={{ left: -20, right: 8, top: 8 }}>
        <defs>
          <linearGradient id="painFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--color-level)" stopOpacity={0.35} />
            <stop offset="100%" stopColor="var(--color-level)" stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="var(--border)" />
        <XAxis dataKey="date" tickLine={false} axisLine={false} tickMargin={8} fontSize={12} />
        <YAxis domain={[0, 10]} ticks={[0, 2, 4, 6, 8, 10]} tickLine={false} axisLine={false} fontSize={12} />
        <ChartTooltip content={<ChartTooltipContent />} />
        <Area
          type="monotone"
          dataKey="level"
          stroke="var(--color-level)"
          strokeWidth={2}
          fill="url(#painFill)"
          dot={{ r: 3, fill: "var(--color-level)" }}
        />
      </AreaChart>
    </ChartContainer>
  )
}
