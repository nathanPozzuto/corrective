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
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"
import { CalendarClock, Clock, ClipboardList, Plus, Trash2, X } from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"

type Plans = Awaited<ReturnType<typeof getPlans>>

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]

type DraftExercise = {
  id: string
  name: string
  sets: string
  reps: string
  daysOfWeek: string[]
  reminderTime: string
  notes: string
}

function newExercise(): DraftExercise {
  return {
    id: crypto.randomUUID(),
    name: "",
    sets: "3",
    reps: "10",
    daysOfWeek: ["Mon", "Wed", "Fri"],
    reminderTime: "09:00",
    notes: "",
  }
}

export function PlansView({ plans }: { plans: Plans }) {
  const [builderOpen, setBuilderOpen] = useState(false)

  return (
    <div className="flex flex-col gap-8">
      <header className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">PT Plans</h1>
          <p className="text-sm text-muted-foreground">
            Build a plan from your physio&apos;s exercises and schedule reminders.
          </p>
        </div>
        <Button onClick={() => setBuilderOpen(true)}>
          <Plus className="size-4" /> New plan
        </Button>
      </header>

      {plans.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <span className="flex size-12 items-center justify-center rounded-2xl bg-accent/15 text-accent">
              <ClipboardList className="size-6" />
            </span>
            <div>
              <p className="font-medium">No plans yet</p>
              <p className="mx-auto max-w-sm text-sm text-muted-foreground text-pretty">
                Add the exercises your physical therapist prescribed, set the days and reminder
                times, and keep everything in one place.
              </p>
            </div>
            <Button onClick={() => setBuilderOpen(true)}>
              <Plus className="size-4" /> Build a plan
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

      <PlanBuilder open={builderOpen} onOpenChange={setBuilderOpen} />
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
            {plan.professionalName ? `From ${plan.professionalName}` : "Personal plan"}
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
        {plan.exercises.length === 0 ? (
          <p className="text-sm text-muted-foreground">No exercises in this plan.</p>
        ) : (
          plan.exercises.map((e) => (
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
              {e.instructions && (
                <p className="text-sm text-muted-foreground text-pretty">{e.instructions}</p>
              )}
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
          ))
        )}
      </CardContent>
    </Card>
  )
}

function PlanBuilder({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
}) {
  const [title, setTitle] = useState("")
  const [professionalName, setProfessionalName] = useState("")
  const [notes, setNotes] = useState("")
  const [exercises, setExercises] = useState<DraftExercise[]>([newExercise()])
  const [saving, setSaving] = useState(false)

  function reset() {
    setTitle("")
    setProfessionalName("")
    setNotes("")
    setExercises([newExercise()])
    setSaving(false)
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
    const clean = exercises.filter((e) => e.name.trim())
    if (clean.length === 0) {
      toast.error("Add at least one exercise")
      return
    }
    setSaving(true)
    try {
      await createPlan({
        title,
        professionalName: professionalName.trim() || undefined,
        notes: notes.trim() || undefined,
        exercises: clean.map((e) => ({
          name: e.name,
          sets: e.sets ? Number(e.sets) : null,
          reps: e.reps ? Number(e.reps) : null,
          daysOfWeek: e.daysOfWeek,
          reminderTime: e.reminderTime || null,
          instructions: e.notes.trim() || null,
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
            <CalendarClock className="size-5 text-accent" />
            Build a PT plan
          </DialogTitle>
          <DialogDescription>
            Enter the exercises your physical therapist prescribed and schedule reminders.
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto pr-1">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <Label htmlFor="plan-title">Plan title</Label>
              <Input
                id="plan-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Knee ACL recovery"
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="plan-pro">Therapist / clinic (optional)</Label>
              <Input
                id="plan-pro"
                value={professionalName}
                onChange={(e) => setProfessionalName(e.target.value)}
                placeholder="Dr. Rivera"
              />
            </div>
          </div>

          <div className="mt-3 flex flex-col gap-2">
            <Label htmlFor="plan-notes">Notes / precautions (optional)</Label>
            <Input
              id="plan-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Avoid deep squats for 2 weeks"
            />
          </div>

          <div className="mt-5 flex flex-col gap-3">
            {exercises.map((e, idx) => (
              <div key={e.id} className="flex flex-col gap-3 rounded-lg border border-border p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex flex-1 flex-col gap-1">
                    <Label className="text-xs">Exercise {idx + 1}</Label>
                    <Input
                      value={e.name}
                      onChange={(ev) => updateExercise(e.id, { name: ev.target.value })}
                      className="font-medium"
                      placeholder="Straight-leg raise"
                      aria-label="Exercise name"
                    />
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="mt-5"
                    aria-label="Remove exercise"
                    disabled={exercises.length === 1}
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
                      inputMode="numeric"
                      value={e.sets}
                      onChange={(ev) => updateExercise(e.id, { sets: ev.target.value })}
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <Label className="text-xs">Reps</Label>
                    <Input
                      type="number"
                      inputMode="numeric"
                      value={e.reps}
                      onChange={(ev) => updateExercise(e.id, { reps: ev.target.value })}
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

                <div className="flex flex-col gap-1">
                  <Label className="text-xs">Notes (optional)</Label>
                  <Textarea
                    value={e.notes}
                    onChange={(ev) => updateExercise(e.id, { notes: ev.target.value })}
                    rows={2}
                    placeholder="Hold 5s at the top, keep knee locked."
                  />
                </div>

                <div className="flex flex-wrap gap-1">
                  {DAYS.map((d) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => toggleDay(e.id, d)}
                      aria-pressed={e.daysOfWeek.includes(d)}
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

            <Button
              variant="outline"
              className="self-start"
              onClick={() => setExercises((prev) => [...prev, newExercise()])}
            >
              <Plus className="size-4" /> Add exercise
            </Button>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={onSave} disabled={saving}>
            {saving ? "Saving…" : "Save plan"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
