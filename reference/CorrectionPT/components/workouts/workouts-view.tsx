"use client"

import { createWorkoutLog, deleteWorkoutLog, getWorkoutLogs, type SetInput } from "@/app/actions/workouts"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Dumbbell, Plus, Trash2, X } from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"

type Workouts = Awaited<ReturnType<typeof getWorkoutLogs>>

type DistanceUnit = "km" | "mi"

type DraftSet = {
  id: string
  exerciseName: string
  weight: string
  reps: string
  distance: string
  distanceUnit: DistanceUnit
  duration: string
}

function newSet(exerciseName = "", distanceUnit: DistanceUnit = "km"): DraftSet {
  return {
    id: crypto.randomUUID(),
    exerciseName,
    weight: "",
    reps: "",
    distance: "",
    distanceUnit,
    duration: "",
  }
}

/**
 * Parse a duration string into seconds. Accepts "mm:ss" (e.g. "30:45"),
 * "hh:mm:ss", or a plain number treated as minutes (e.g. "30" -> 1800s).
 */
function parseDuration(input: string): number | null {
  const trimmed = input.trim()
  if (!trimmed) return null
  if (trimmed.includes(":")) {
    const parts = trimmed.split(":").map((p) => Number(p))
    if (parts.some((n) => Number.isNaN(n))) return null
    const secs = parts.reduce((acc, n) => acc * 60 + n, 0)
    return Number.isNaN(secs) ? null : secs
  }
  const mins = Number(trimmed)
  if (Number.isNaN(mins)) return null
  return Math.round(mins * 60)
}

/** Format seconds back into a compact "mm:ss" (or "h:mm:ss"). */
function formatDuration(totalSeconds: number): string {
  const s = Math.max(0, Math.round(totalSeconds))
  const hours = Math.floor(s / 3600)
  const minutes = Math.floor((s % 3600) / 60)
  const seconds = s % 60
  const pad = (n: number) => String(n).padStart(2, "0")
  return hours > 0 ? `${hours}:${pad(minutes)}:${pad(seconds)}` : `${minutes}:${pad(seconds)}`
}

export function WorkoutsView({
  workouts,
  exerciseNames,
  cardioNames,
}: {
  workouts: Workouts
  exerciseNames: string[]
  cardioNames: string[]
}) {
  const [open, setOpen] = useState(false)
  const cardioSet = new Set(cardioNames.map((n) => n.toLowerCase()))

  return (
    <div className="flex flex-col gap-8">
      <header className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Workouts</h1>
          <p className="text-sm text-muted-foreground">
            Strength moves log weight and reps; cardio logs distance and time.
          </p>
        </div>
        <LogWorkoutDialog
          open={open}
          onOpenChange={setOpen}
          exerciseNames={exerciseNames}
          cardioSet={cardioSet}
        />
      </header>

      {workouts.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <span className="flex size-12 items-center justify-center rounded-2xl bg-secondary text-secondary-foreground">
              <Dumbbell className="size-6" />
            </span>
            <div>
              <p className="font-medium">No workouts logged yet</p>
              <p className="text-sm text-muted-foreground">
                Record your first session to start tracking progress over time.
              </p>
            </div>
            <Button onClick={() => setOpen(true)}>
              <Plus className="size-4" /> Log a workout
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="flex flex-col gap-4">
          {workouts.map((w) => (
            <WorkoutCard key={w.id} workout={w} />
          ))}
        </div>
      )}
    </div>
  )
}

function WorkoutCard({ workout }: { workout: Workouts[number] }) {
  const [deleting, setDeleting] = useState(false)

  async function onDelete() {
    setDeleting(true)
    try {
      await deleteWorkoutLog(workout.id)
      toast.success("Workout deleted")
    } catch {
      toast.error("Could not delete workout")
      setDeleting(false)
    }
  }

  // Group sets by exercise for a tidy display.
  const byExercise = workout.sets.reduce<Record<string, typeof workout.sets>>((acc, s) => {
    ;(acc[s.exerciseName] ??= []).push(s)
    return acc
  }, {})

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div>
          <CardTitle className="text-lg">{workout.name || "Workout"}</CardTitle>
          <CardDescription>
            {new Date(workout.performedAt).toLocaleDateString("en-US", {
              weekday: "long",
              month: "long",
              day: "numeric",
            })}
          </CardDescription>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={onDelete}
          disabled={deleting}
          aria-label="Delete workout"
        >
          <Trash2 className="size-4 text-muted-foreground" />
        </Button>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {Object.entries(byExercise).map(([name, sets]) => (
          <div key={name} className="flex flex-col gap-2">
            <p className="text-sm font-medium">{name}</p>
            <div className="flex flex-wrap gap-2">
              {sets.map((s) => (
                <Badge key={s.id} variant="secondary" className="font-mono">
                  {formatSet(s)}
                </Badge>
              ))}
            </div>
          </div>
        ))}
        {workout.notes && (
          <p className="border-t border-border pt-3 text-sm text-muted-foreground text-pretty">
            {workout.notes}
          </p>
        )}
      </CardContent>
    </Card>
  )
}

/** Render a logged set as either a cardio (distance/time) or strength summary. */
function formatSet(s: Workouts[number]["sets"][number]): string {
  const isCardio = s.distance != null || s.durationSeconds != null
  if (isCardio) {
    const parts: string[] = []
    if (s.distance != null) parts.push(`${s.distance} ${s.distanceUnit ?? "km"}`)
    if (s.durationSeconds != null) parts.push(formatDuration(s.durationSeconds))
    return parts.length ? parts.join(" · ") : "—"
  }
  const weight = s.weight ? `${s.weight} × ` : ""
  const reps = s.reps ?? "—"
  return `${weight}${reps} rep${s.reps === 1 ? "" : "s"}`
}

function LogWorkoutDialog({
  open,
  onOpenChange,
  exerciseNames,
  cardioSet,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  exerciseNames: string[]
  cardioSet: Set<string>
}) {
  const [name, setName] = useState("")
  const [notes, setNotes] = useState("")
  const [sets, setSets] = useState<DraftSet[]>([newSet()])
  const [saving, setSaving] = useState(false)

  function reset() {
    setName("")
    setNotes("")
    setSets([newSet()])
  }

  function updateSet(id: string, patch: Partial<DraftSet>) {
    setSets((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)))
  }

  async function onSave() {
    const payload: SetInput[] = sets.map((s, i) => {
      const isCardio = cardioSet.has(s.exerciseName.trim().toLowerCase())
      return {
        exerciseName: s.exerciseName,
        weight: !isCardio && s.weight ? Number(s.weight) : null,
        reps: !isCardio && s.reps ? Number(s.reps) : null,
        distance: isCardio && s.distance ? Number(s.distance) : null,
        distanceUnit: s.distanceUnit,
        durationSeconds: isCardio ? parseDuration(s.duration) : null,
        setNumber: i + 1,
      }
    })
    if (!payload.some((s) => s.exerciseName.trim())) {
      toast.error("Add at least one exercise")
      return
    }
    setSaving(true)
    try {
      await createWorkoutLog({ name, notes, sets: payload })
      toast.success("Workout logged")
      reset()
      onOpenChange(false)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save workout")
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => (onOpenChange(v), !v && reset())}>
      <DialogTrigger
        render={
          <Button>
            <Plus className="size-4" /> Log workout
          </Button>
        }
      />
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Log a workout</DialogTitle>
          <DialogDescription>
            Pick an exercise — cardio entries switch to distance and time, with a km/mi toggle.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="workout-name">Name (optional)</Label>
            <Input
              id="workout-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Upper body, Leg day…"
            />
          </div>

          <datalist id="exercise-options">
            {exerciseNames.map((n) => (
              <option key={n} value={n} />
            ))}
          </datalist>

          <div className="flex flex-col gap-3">
            <Label>Sets</Label>
            {sets.map((s, i) => {
              const isCardio = cardioSet.has(s.exerciseName.trim().toLowerCase())
              return (
                <div key={s.id} className="flex items-end gap-2">
                  <div className="flex-1">
                    <Input
                      list="exercise-options"
                      value={s.exerciseName}
                      onChange={(e) => updateSet(s.id, { exerciseName: e.target.value })}
                      placeholder={`Exercise ${i + 1}`}
                      aria-label="Exercise name"
                    />
                  </div>
                  {isCardio ? (
                    <>
                      <div className="w-20">
                        <Input
                          type="number"
                          inputMode="decimal"
                          value={s.distance}
                          onChange={(e) => updateSet(s.id, { distance: e.target.value })}
                          placeholder={s.distanceUnit}
                          aria-label={`Distance in ${s.distanceUnit === "mi" ? "miles" : "kilometers"}`}
                        />
                      </div>
                      <div className="flex rounded-md border border-input p-0.5" role="group" aria-label="Distance unit">
                        {(["km", "mi"] as DistanceUnit[]).map((u) => (
                          <button
                            key={u}
                            type="button"
                            onClick={() => updateSet(s.id, { distanceUnit: u })}
                            aria-pressed={s.distanceUnit === u}
                            className={
                              "rounded px-2 py-1 text-xs font-medium transition-colors " +
                              (s.distanceUnit === u
                                ? "bg-primary text-primary-foreground"
                                : "text-muted-foreground hover:text-foreground")
                            }
                          >
                            {u}
                          </button>
                        ))}
                      </div>
                      <div className="w-24">
                        <Input
                          inputMode="numeric"
                          value={s.duration}
                          onChange={(e) => updateSet(s.id, { duration: e.target.value })}
                          placeholder="mm:ss"
                          aria-label="Duration (minutes and seconds)"
                        />
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="w-20">
                        <Input
                          type="number"
                          inputMode="decimal"
                          value={s.weight}
                          onChange={(e) => updateSet(s.id, { weight: e.target.value })}
                          placeholder="kg"
                          aria-label="Weight"
                        />
                      </div>
                      <div className="w-16">
                        <Input
                          type="number"
                          inputMode="numeric"
                          value={s.reps}
                          onChange={(e) => updateSet(s.id, { reps: e.target.value })}
                          placeholder="reps"
                          aria-label="Reps"
                        />
                      </div>
                    </>
                  )}
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => setSets((prev) => (prev.length > 1 ? prev.filter((x) => x.id !== s.id) : prev))}
                    disabled={sets.length === 1}
                    aria-label="Remove set"
                  >
                    <X className="size-4" />
                  </Button>
                </div>
              )
            })}
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() =>
                  setSets((prev) => [...prev, newSet("", prev[prev.length - 1]?.distanceUnit)])
                }
              >
                <Plus className="size-4" /> Add exercise
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() =>
                  setSets((prev) => [
                    ...prev,
                    newSet(prev[prev.length - 1]?.exerciseName, prev[prev.length - 1]?.distanceUnit),
                  ])
                }
              >
                <Plus className="size-4" /> Add set to last
              </Button>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="workout-notes">Notes (optional)</Label>
            <Textarea
              id="workout-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="How did it feel? Any pain or wins?"
              rows={2}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={onSave} disabled={saving}>
            {saving ? "Saving…" : "Save workout"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
