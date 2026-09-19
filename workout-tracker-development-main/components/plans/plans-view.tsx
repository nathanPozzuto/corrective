"use client"

import { createPlan, deletePlan, getPlans } from "@/app/actions/plans"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"
import { CalendarClock, Clock, Loader2, ScanLine, Sparkles, Trash2, Upload, X } from "lucide-react"
import { useRef, useState } from "react"
import { toast } from "sonner"

type Plans = Awaited<ReturnType<typeof getPlans>>

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]

type ScannedExercise = {
  name: string
  sets: number | null
  reps: number | null
  frequency: string | null
  notes: string | null
}

type DraftExercise = ScannedExercise & {
  id: string
  daysOfWeek: string[]
  reminderTime: string
}

export function PlansView({ plans }: { plans: Plans }) {
  const [scanOpen, setScanOpen] = useState(false)

  return (
    <div className="flex flex-col gap-8">
      <header className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">PT Plans</h1>
          <p className="text-sm text-muted-foreground">
            Scan a physio handout and turn it into a scheduled plan.
          </p>
        </div>
        <Button onClick={() => setScanOpen(true)}>
          <ScanLine className="size-4" /> Scan handout
        </Button>
      </header>

      {plans.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <span className="flex size-12 items-center justify-center rounded-2xl bg-accent/15 text-accent">
              <ScanLine className="size-6" />
            </span>
            <div>
              <p className="font-medium">No plans yet</p>
              <p className="mx-auto max-w-sm text-sm text-muted-foreground text-pretty">
                Upload a photo of your PT handout. We&apos;ll pull out the recommended exercises and
                let you schedule reminders.
              </p>
            </div>
            <Button onClick={() => setScanOpen(true)}>
              <Upload className="size-4" /> Upload handout
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="flex flex-col gap-4">
          {plans.map((p) => (
            <PlanCard key={p.id} plan={p} />
          ))}
        </div>
      )}

      <ScanDialog open={scanOpen} onOpenChange={setScanOpen} />
    </div>
  )
}

function PlanCard({ plan }: { plan: Plans[number] }) {
  const [deleting, setDeleting] = useState(false)
  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div>
          <CardTitle className="text-lg">{plan.title}</CardTitle>
          <CardDescription>
            {plan.source === "handout" ? "From PT handout" : "Manual plan"}
            {plan.notes ? ` — ${plan.notes}` : ""}
          </CardDescription>
        </div>
        <Button
          variant="ghost"
          size="icon"
          disabled={deleting}
          aria-label="Delete plan"
          onClick={async () => {
            setDeleting(true)
            try {
              await deletePlan(plan.id)
              toast.success("Plan deleted")
            } catch {
              toast.error("Could not delete plan")
              setDeleting(false)
            }
          }}
        >
          <Trash2 className="size-4 text-muted-foreground" />
        </Button>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {plan.exercises.map((e) => (
          <div key={e.id} className="flex flex-col gap-2 rounded-lg border border-border p-3">
            <div className="flex items-start justify-between gap-3">
              <p className="font-medium">{e.name}</p>
              <div className="flex shrink-0 items-center gap-2">
                {e.sets && e.reps && (
                  <Badge variant="secondary" className="font-mono text-xs">
                    {e.sets}×{e.reps}
                  </Badge>
                )}
                {e.reminderTime && (
                  <Badge variant="outline" className="gap-1 font-mono text-xs">
                    <Clock className="size-3" />
                    {e.reminderTime}
                  </Badge>
                )}
              </div>
            </div>
            {e.notes && <p className="text-sm text-muted-foreground text-pretty">{e.notes}</p>}
            {e.daysOfWeekList.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {DAYS.map((d) => (
                  <span
                    key={d}
                    className={cn(
                      "rounded px-1.5 py-0.5 text-xs font-medium",
                      e.daysOfWeekList.includes(d)
                        ? "bg-primary/10 text-primary"
                        : "bg-muted text-muted-foreground/50",
                    )}
                  >
                    {d}
                  </span>
                ))}
              </div>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  )
}

function ScanDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const fileInput = useRef<HTMLInputElement>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [scanning, setScanning] = useState(false)
  const [saving, setSaving] = useState(false)
  const [title, setTitle] = useState("")
  const [exercises, setExercises] = useState<DraftExercise[]>([])

  function reset() {
    setPreview(null)
    setScanning(false)
    setSaving(false)
    setTitle("")
    setExercises([])
    if (fileInput.current) fileInput.current.value = ""
  }

  async function onFile(file: File) {
    const reader = new FileReader()
    reader.onload = async () => {
      const dataUrl = reader.result as string
      setPreview(dataUrl)
      setScanning(true)
      try {
        const res = await fetch("/api/scan-handout", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ image: dataUrl }),
        })
        if (!res.ok) throw new Error("Scan failed")
        const data = (await res.json()) as { title?: string; exercises?: ScannedExercise[] }
        setTitle(data.title || "Physio plan")
        setExercises(
          (data.exercises ?? []).map((e) => ({
            ...e,
            id: crypto.randomUUID(),
            daysOfWeek: ["Mon", "Wed", "Fri"],
            reminderTime: "09:00",
          })),
        )
        if (!data.exercises?.length) {
          toast.message("No exercises detected", {
            description: "Try a clearer photo, or add exercises manually.",
          })
        } else {
          toast.success(`Found ${data.exercises.length} exercises`)
        }
      } catch {
        toast.error("Could not scan the handout. Please try another image.")
      } finally {
        setScanning(false)
      }
    }
    reader.readAsDataURL(file)
  }

  function updateExercise(id: string, patch: Partial<DraftExercise>) {
    setExercises((prev) => prev.map((e) => (e.id === id ? { ...e, ...patch } : e)))
  }

  function toggleDay(id: string, day: string) {
    setExercises((prev) =>
      prev.map((e) =>
        e.id === id
          ? {
              ...e,
              daysOfWeek: e.daysOfWeek.includes(day)
                ? e.daysOfWeek.filter((d) => d !== day)
                : [...e.daysOfWeek, day],
            }
          : e,
      ),
    )
  }

  async function onSave() {
    if (!title.trim()) {
      toast.error("Give your plan a title")
      return
    }
    if (exercises.length === 0) {
      toast.error("No exercises to save")
      return
    }
    setSaving(true)
    try {
      await createPlan({
        title,
        source: "handout",
        exercises: exercises.map((e) => ({
          name: e.name,
          sets: e.sets,
          reps: e.reps,
          frequency: e.frequency,
          notes: e.notes,
          daysOfWeek: e.daysOfWeek,
          reminderTime: e.reminderTime || null,
        })),
      })
      toast.success("Plan created")
      reset()
      onOpenChange(false)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save plan")
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => (onOpenChange(v), !v && reset())}>
      <DialogContent className="flex max-h-[90vh] flex-col gap-4 sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="size-5 text-accent" />
            Scan a PT handout
          </DialogTitle>
          <DialogDescription>
            Upload a photo of your handout. We&apos;ll extract the recommended exercises so you can
            schedule them.
          </DialogDescription>
        </DialogHeader>

        <input
          ref={fileInput}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0]
            if (f) onFile(f)
          }}
        />

        <div className="min-h-0 flex-1 overflow-y-auto">
          {!preview ? (
            <button
              type="button"
              onClick={() => fileInput.current?.click()}
              className="flex w-full flex-col items-center gap-3 rounded-xl border-2 border-dashed border-border py-12 text-center transition-colors hover:border-primary/40 hover:bg-secondary/30"
            >
              <span className="flex size-12 items-center justify-center rounded-2xl bg-secondary text-secondary-foreground">
                <Upload className="size-6" />
              </span>
              <span className="text-sm font-medium">Click to upload a handout photo</span>
              <span className="text-xs text-muted-foreground">JPG or PNG</span>
            </button>
          ) : (
            <div className="flex flex-col gap-4">
              <div className="flex items-start gap-4">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={preview || "/placeholder.svg"}
                  alt="Handout preview"
                  className="h-32 w-24 shrink-0 rounded-lg border border-border object-cover"
                />
                <div className="flex flex-1 flex-col gap-2">
                  <Label htmlFor="plan-title">Plan title</Label>
                  <Input id="plan-title" value={title} onChange={(e) => setTitle(e.target.value)} />
                  <Button
                    variant="ghost"
                    size="sm"
                    className="self-start"
                    onClick={() => fileInput.current?.click()}
                  >
                    Choose a different image
                  </Button>
                </div>
              </div>

              {scanning && (
                <div className="flex items-center justify-center gap-2 rounded-lg bg-secondary/50 py-8 text-sm text-muted-foreground">
                  <Loader2 className="size-4 animate-spin" />
                  Reading your handout…
                </div>
              )}

              {!scanning && exercises.length > 0 && (
                <div className="flex flex-col gap-3">
                  {exercises.map((e) => (
                    <div key={e.id} className="flex flex-col gap-3 rounded-lg border border-border p-3">
                      <div className="flex items-start justify-between gap-2">
                        <Input
                          value={e.name}
                          onChange={(ev) => updateExercise(e.id, { name: ev.target.value })}
                          className="font-medium"
                          aria-label="Exercise name"
                        />
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label="Remove exercise"
                          onClick={() => setExercises((prev) => prev.filter((x) => x.id !== e.id))}
                        >
                          <X className="size-4" />
                        </Button>
                      </div>

                      <div className="grid grid-cols-3 gap-2">
                        <div className="flex flex-col gap-1">
                          <Label className="text-xs">Sets</Label>
                          <Input
                            type="number"
                            value={e.sets ?? ""}
                            onChange={(ev) =>
                              updateExercise(e.id, { sets: ev.target.value ? Number(ev.target.value) : null })
                            }
                          />
                        </div>
                        <div className="flex flex-col gap-1">
                          <Label className="text-xs">Reps</Label>
                          <Input
                            type="number"
                            value={e.reps ?? ""}
                            onChange={(ev) =>
                              updateExercise(e.id, { reps: ev.target.value ? Number(ev.target.value) : null })
                            }
                          />
                        </div>
                        <div className="flex flex-col gap-1">
                          <Label className="text-xs">Reminder</Label>
                          <Input
                            type="time"
                            value={e.reminderTime}
                            onChange={(ev) => updateExercise(e.id, { reminderTime: ev.target.value })}
                          />
                        </div>
                      </div>

                      {e.notes && <p className="text-xs text-muted-foreground text-pretty">{e.notes}</p>}

                      <div className="flex flex-wrap gap-1">
                        {DAYS.map((d) => (
                          <button
                            key={d}
                            type="button"
                            onClick={() => toggleDay(e.id, d)}
                            className={cn(
                              "rounded-md px-2 py-1 text-xs font-medium transition-colors",
                              e.daysOfWeek.includes(d)
                                ? "bg-primary text-primary-foreground"
                                : "bg-secondary text-secondary-foreground hover:bg-secondary/70",
                            )}
                          >
                            {d}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={onSave} disabled={saving || scanning || exercises.length === 0}>
            {saving ? "Saving…" : "Save plan"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
