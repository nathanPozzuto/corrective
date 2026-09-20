"use client"

import { createCustomExercise, getExercises } from "@/app/actions/exercises"
import { createRoutine, deleteRoutine, getRoutines } from "@/app/actions/routines"
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
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"
import { Check, ListChecks, Plus, Search, Trash2 } from "lucide-react"
import { useMemo, useState } from "react"
import { toast } from "sonner"

type Routines = Awaited<ReturnType<typeof getRoutines>>
type Exercises = Awaited<ReturnType<typeof getExercises>>

export function RoutinesView({
  routines,
  exercises,
}: {
  routines: Routines
  exercises: Exercises
}) {
  const [builderOpen, setBuilderOpen] = useState(false)

  return (
    <div className="flex flex-col gap-8">
      <header className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Routines</h1>
          <p className="text-sm text-muted-foreground">
            Build your own workout from {exercises.length} preset exercises.
          </p>
        </div>
        <Button onClick={() => setBuilderOpen(true)}>
          <Plus className="size-4" /> New routine
        </Button>
      </header>

      {routines.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <span className="flex size-12 items-center justify-center rounded-2xl bg-secondary text-secondary-foreground">
              <ListChecks className="size-6" />
            </span>
            <div>
              <p className="font-medium">No routines yet</p>
              <p className="text-sm text-muted-foreground">
                Compose a reusable routine from the preset exercise library.
              </p>
            </div>
            <Button onClick={() => setBuilderOpen(true)}>
              <Plus className="size-4" /> Build a routine
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {routines.map((r) => (
            <RoutineCard key={r.id} routine={r} />
          ))}
        </div>
      )}

      <RoutineBuilder
        open={builderOpen}
        onOpenChange={setBuilderOpen}
        exercises={exercises}
      />
    </div>
  )
}

function RoutineCard({ routine }: { routine: Routines[number] }) {
  const [deleting, setDeleting] = useState(false)
  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div>
          <CardTitle className="text-lg">{routine.name}</CardTitle>
          {routine.description && <CardDescription>{routine.description}</CardDescription>}
        </div>
        <Button
          variant="ghost"
          size="icon"
          disabled={deleting}
          aria-label="Delete routine"
          onClick={async () => {
            setDeleting(true)
            try {
              await deleteRoutine(routine.id)
              toast.success("Routine deleted")
            } catch {
              toast.error("Could not delete routine")
              setDeleting(false)
            }
          }}
        >
          <Trash2 className="size-4 text-muted-foreground" />
        </Button>
      </CardHeader>
      <CardContent>
        <ol className="flex flex-col gap-2">
          {routine.items.map((it, i) => (
            <li key={it.id} className="flex items-center gap-3 text-sm">
              <span className="flex size-6 shrink-0 items-center justify-center rounded-md bg-secondary font-mono text-xs text-secondary-foreground">
                {i + 1}
              </span>
              <span className="flex-1">{it.exerciseName}</span>
              {it.targetSets && it.targetReps && (
                <Badge variant="secondary" className="font-mono text-xs">
                  {it.targetSets}×{it.targetReps}
                </Badge>
              )}
            </li>
          ))}
        </ol>
      </CardContent>
    </Card>
  )
}

type Picked = { exerciseId: number; name: string; targetSets: string; targetReps: string }

function RoutineBuilder({
  open,
  onOpenChange,
  exercises,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  exercises: Exercises
}) {
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [query, setQuery] = useState("")
  const [category, setCategory] = useState<string>("all")
  const [picked, setPicked] = useState<Record<number, Picked>>({})
  const [saving, setSaving] = useState(false)

  const categories = useMemo(
    () => ["all", ...Array.from(new Set(exercises.map((e) => e.category).filter(Boolean) as string[]))],
    [exercises],
  )

  const filtered = useMemo(
    () =>
      exercises.filter((e) => {
        const matchesQuery = e.name.toLowerCase().includes(query.toLowerCase())
        const matchesCat = category === "all" || e.category === category
        return matchesQuery && matchesCat
      }),
    [exercises, query, category],
  )

  function toggle(ex: Exercises[number]) {
    setPicked((prev) => {
      const next = { ...prev }
      if (next[ex.id]) {
        delete next[ex.id]
      } else {
        next[ex.id] = { exerciseId: ex.id, name: ex.name, targetSets: "3", targetReps: "10" }
      }
      return next
    })
  }

  function reset() {
    setName("")
    setDescription("")
    setQuery("")
    setCategory("all")
    setPicked({})
  }

  const pickedList = Object.values(picked)

  async function onSave() {
    if (!name.trim()) {
      toast.error("Give your routine a name")
      return
    }
    if (pickedList.length === 0) {
      toast.error("Pick at least one exercise")
      return
    }
    setSaving(true)
    try {
      await createRoutine({
        name,
        description,
        items: pickedList.map((p, i) => ({
          exerciseId: p.exerciseId,
          exerciseName: p.name,
          targetSets: p.targetSets ? Number(p.targetSets) : null,
          targetReps: p.targetReps ? Number(p.targetReps) : null,
          position: i,
        })),
      })
      toast.success("Routine created")
      reset()
      onOpenChange(false)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save routine")
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => (onOpenChange(v), !v && reset())}>
      <DialogContent className="flex max-h-[90vh] flex-col gap-4 sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Build a routine</DialogTitle>
          <DialogDescription>
            Name your routine, then pick exercises from the library.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="flex flex-col gap-2">
            <Label htmlFor="routine-name">Name</Label>
            <Input
              id="routine-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Knee rehab — week 2"
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="routine-desc">Description (optional)</Label>
            <Input
              id="routine-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Low-impact strengthening"
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search exercises…"
              className="pl-9"
            />
          </div>
          <Select value={category} onValueChange={(v) => setCategory(v ?? "all")}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {categories.map((c) => (
                <SelectItem key={c} value={c} className="capitalize">
                  {c === "all" ? "All categories" : c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <NewExerciseDialog />
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto rounded-lg border border-border">
          {filtered.length === 0 ? (
            <p className="p-6 text-center text-sm text-muted-foreground">No exercises match your search.</p>
          ) : (
            <ul className="divide-y divide-border">
              {filtered.map((ex) => {
                const isPicked = Boolean(picked[ex.id])
                return (
                  <li key={ex.id}>
                    <button
                      type="button"
                      onClick={() => toggle(ex)}
                      className={cn(
                        "flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-secondary/50",
                        isPicked && "bg-primary/5",
                      )}
                    >
                      <span
                        className={cn(
                          "flex size-5 shrink-0 items-center justify-center rounded-md border",
                          isPicked
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-border",
                        )}
                      >
                        {isPicked && <Check className="size-3.5" />}
                      </span>
                      <span className="flex-1 text-sm font-medium">{ex.name}</span>
                      {ex.category && (
                        <Badge variant="outline" className="text-xs capitalize">
                          {ex.category}
                        </Badge>
                      )}
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </div>

        <DialogFooter className="flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted-foreground">
            {pickedList.length} exercise{pickedList.length === 1 ? "" : "s"} selected
          </p>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={onSave} disabled={saving}>
              {saving ? "Saving…" : "Create routine"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function NewExerciseDialog() {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState("")
  const [category, setCategory] = useState("")
  const [instructions, setInstructions] = useState("")
  const [saving, setSaving] = useState(false)

  async function onSave() {
    if (!name.trim()) {
      toast.error("Enter an exercise name")
      return
    }
    setSaving(true)
    try {
      await createCustomExercise({ name, category, description: instructions })
      toast.success("Exercise added — reopen the builder to see it")
      setName("")
      setCategory("")
      setInstructions("")
      setOpen(false)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not add exercise")
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button variant="outline" size="icon" aria-label="Add custom exercise">
            <Plus className="size-4" />
          </Button>
        }
      />
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add a custom exercise</DialogTitle>
          <DialogDescription>Create an exercise that isn&apos;t in the preset library.</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="ex-name">Name</Label>
            <Input id="ex-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Banded clamshell" />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="ex-cat">Category (optional)</Label>
            <Input
              id="ex-cat"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="mobility, legs, core…"
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="ex-inst">Instructions (optional)</Label>
            <Textarea
              id="ex-inst"
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              rows={3}
              placeholder="How to perform it safely."
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={onSave} disabled={saving}>
            {saving ? "Saving…" : "Add exercise"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
