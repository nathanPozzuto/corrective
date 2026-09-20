"use client"

import { logPain, deletePainLog, getPainLogs } from "@/app/actions/pain"
import { PainChart } from "@/components/pain/pain-chart"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
import { cn } from "@/lib/utils"
import { Trash2 } from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"

type Logs = Awaited<ReturnType<typeof getPainLogs>>

const SCALE = [
  { max: 0, label: "No pain", tone: "text-primary" },
  { max: 3, label: "Mild", tone: "text-primary" },
  { max: 6, label: "Moderate", tone: "text-accent" },
  { max: 8, label: "Severe", tone: "text-accent" },
  { max: 10, label: "Worst imaginable", tone: "text-destructive" },
]

function describe(level: number) {
  return SCALE.find((s) => level <= s.max) ?? SCALE[SCALE.length - 1]
}

export function PainView({ logs }: { logs: Logs }) {
  const [level, setLevel] = useState(3)
  const [location, setLocation] = useState("")
  const [note, setNote] = useState("")
  const [saving, setSaving] = useState(false)

  const desc = describe(level)

  const avg7 = (() => {
    const weekAgo = new Date()
    weekAgo.setDate(weekAgo.getDate() - 7)
    const recent = logs.filter((l) => new Date(l.loggedAt) >= weekAgo)
    if (recent.length === 0) return null
    return (recent.reduce((n, l) => n + l.level, 0) / recent.length).toFixed(1)
  })()

  async function onLog() {
    setSaving(true)
    try {
      await logPain({ level, location, note })
      toast.success("Pain level logged")
      setNote("")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not log pain")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex flex-col gap-8">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Pain Tracker</h1>
        <p className="text-sm text-muted-foreground">
          Log how you feel to watch your recovery trend over time.
        </p>
      </header>

      <div className="grid gap-6 lg:grid-cols-5">
        {/* Logger */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>How&apos;s your pain right now?</CardTitle>
            <CardDescription>Slide to today&apos;s level, 0–10.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-6">
            <div className="flex flex-col items-center gap-1">
              <span className="font-mono text-5xl font-semibold tracking-tight">{level}</span>
              <span className={cn("text-sm font-medium", desc.tone)}>{desc.label}</span>
            </div>

            <Slider
              value={level}
              onValueChange={(v) => setLevel(Array.isArray(v) ? v[0] : v)}
              min={0}
              max={10}
              step={1}
              aria-label="Pain level"
            />
            <div className="flex justify-between px-1 text-xs text-muted-foreground">
              <span>0</span>
              <span>5</span>
              <span>10</span>
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="pain-location">Location (optional)</Label>
              <Input
                id="pain-location"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="Left knee, lower back…"
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="pain-note">Note (optional)</Label>
              <Input
                id="pain-note"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="After physio, felt stiff…"
              />
            </div>

            <Button onClick={onLog} disabled={saving}>
              {saving ? "Logging…" : "Log pain level"}
            </Button>
          </CardContent>
        </Card>

        {/* Trend */}
        <Card className="lg:col-span-3">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Recovery curve</CardTitle>
              <CardDescription>Last 60 days</CardDescription>
            </div>
            {avg7 && (
              <div className="text-right">
                <p className="font-mono text-2xl font-semibold">{avg7}</p>
                <p className="text-xs text-muted-foreground">7-day average</p>
              </div>
            )}
          </CardHeader>
          <CardContent>
            <PainChart data={logs} height={260} />
          </CardContent>
        </Card>
      </div>

      {/* History */}
      <Card>
        <CardHeader>
          <CardTitle>History</CardTitle>
          <CardDescription>Every entry you&apos;ve logged</CardDescription>
        </CardHeader>
        <CardContent>
          {logs.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
              No entries yet. Log your first pain level above.
            </div>
          ) : (
            <ul className="flex flex-col">
              {logs.map((l) => {
                const d = describe(l.level)
                return (
                  <li
                    key={l.id}
                    className="flex items-center gap-4 border-b border-border py-3 last:border-0"
                  >
                    <span
                      className={cn(
                        "flex size-10 shrink-0 items-center justify-center rounded-lg bg-secondary font-mono text-sm font-semibold",
                        d.tone,
                      )}
                    >
                      {l.level}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium">
                        {d.label}
                        {l.location ? ` — ${l.location}` : ""}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(l.loggedAt).toLocaleString("en-US", {
                          month: "short",
                          day: "numeric",
                          hour: "numeric",
                          minute: "2-digit",
                        })}
                        {l.note ? ` · ${l.note}` : ""}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label="Delete entry"
                      onClick={async () => {
                        try {
                          await deletePainLog(l.id)
                          toast.success("Entry deleted")
                        } catch {
                          toast.error("Could not delete entry")
                        }
                      }}
                    >
                      <Trash2 className="size-4 text-muted-foreground" />
                    </Button>
                  </li>
                )
              })}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
