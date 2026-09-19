"use client"

import { getRoutines } from "@/app/actions/routines"
import {
  addScheduledWorkout,
  deleteScheduledWorkout,
  getSchedule,
} from "@/app/actions/schedule"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"
import { CalendarClock, Clock, Plus, Trash2 } from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"

type Schedule = Awaited<ReturnType<typeof getSchedule>>
type Routines = Awaited<ReturnType<typeof getRoutines>>

const DAYS = [
  { value: 1, label: "Monday", short: "Mon" },
  { value: 2, label: "Tuesday", short: "Tue" },
  { value: 3, label: "Wednesday", short: "Wed" },
  { value: 4, label: "Thursday", short: "Thu" },
  { value: 5, label: "Friday", short: "Fri" },
  { value: 6, label: "Saturday", short: "Sat" },
  { value: 0, label: "Sunday", short: "Sun" },
]

function formatTime(time: string | null) {
  if (!time) return null
  const [h, m] = time.split(":").map(Number)
  if (Number.isNaN(h)) return time
  const period = h >= 12 ? "PM" : "AM"
  const hour12 = h % 12 === 0 ? 12 : h % 12
  return `${hour12}:${String(m ?? 0).padStart(2, "0")} ${period}`
}

export function ScheduleView({
  schedule,
  routines,
}: {
  schedule: Schedule
  routines: Routines
}) {
  const [open, setOpen] = useState(false)
  const [presetDay, setPresetDay] = useState<number | null>(null)
  const todayDow = new Date().getDay()

  function openForDay(day: number) {
    setPresetDay(day)
    setOpen(true)
  }

  const total = schedule.length

  return (
    <div className="flex flex-col gap-8">
      <header className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Schedule</h1>
          <p className="text-sm text-muted-foreground">
            Assign specific workouts to each day of your week.
          </p>
        </div>
        <Button
          onClick={() => {
            setPresetDay(null)
            setOpen(true)
          }}
        >
          <Plus className="size-4" /> Schedule workout
        </Button>
      </header>

      {total === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <span className="flex size-12 items-center justify-center rounded-2xl bg-secondary text-secondary-foreground">
              <CalendarClock className="size-6" />
            </span>
            <div>
              <p className="font-medium">Your week is open</p>
              <p className="text-sm text-muted-foreground">
                Plan specific workouts on specific days to build a consistent routine.
              </p>
            </div>
            <Button
              onClick={() => {
                setPresetDay(null)
                setOpen(true)
              }}
            >
              <Plus className="size-4" /> Schedule your first workout
            </Button>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {DAYS.map((day) => {
          const items = schedule.filter((s) => s.dayOfWeek === day.value)
          const isToday = day.value === todayDow
          return (
            <Card
              key={day.value}
              className={cn(isToday && "border-primary/50 ring-1 ring-primary/20")}
            >
              <CardHeader className="flex flex-row items-center justify-between gap-2 pb-3">
                <div className="flex items-center gap-2">
                  <CardTitle className="text-base">{day.label}</CardTitle>
                  {isToday && (
                    <Badge variant="secondary" className="text-[10px] uppercase tracking-wide">
                      Today
                    </Badge>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={`Add workout to ${day.label}`}
                  onClick={() => openForDay(day.value)}
                >
                  <Plus className="size-4 text-muted-foreground" />
                </Button>
              </CardHeader>
              <CardContent className="flex flex-col gap-2">
                {items.length === 0 ? (
                  <button
                    type="button"
                    onClick={() => openForDay(day.value)}
                    className="rounded-lg border border-dashed border-border py-4 text-center text-xs text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
                  >
                    Rest day — tap to add
                  </button>
                ) : (
                  items.map((item) => (
                    <ScheduledItem key={item.id} item={item} />
                  ))
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>

      <ScheduleDialog
        open={open}
        onOpenChange={setOpen}
        routines={routines}
        presetDay={presetDay}
      />
    </div>
  )
}

function ScheduledItem({ item }: { item: Schedule[number] }) {
  const [deleting, setDeleting] = useState(false)
  const time = formatTime(item.time)
  return (
    <div className="group flex items-start justify-between gap-2 rounded-lg border border-border bg-card p-3">
      <div className="min-w-0">
        <p className="truncate text-sm font-medium">{item.title}</p>
        {time && (
          <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
            <Clock className="size-3" /> {time}
          </p>
        )}
        {item.notes && (
          <p className="mt-1 text-xs text-muted-foreground text-pretty">{item.notes}</p>
        )}
      </div>
      <Button
        variant="ghost"
        size="icon"
        className="size-7 shrink-0 opacity-0 transition-opacity group-hover:opacity-100"
        disabled={deleting}
        aria-label={`Remove ${item.title}`}
        onClick={async () => {
          setDeleting(true)
          try {
            await deleteScheduledWorkout(item.id)
            toast.success("Removed from schedule")
          } catch {
            toast.error("Could not remove workout")
            setDeleting(false)
          }
        }}
      >
        <Trash2 className="size-3.5 text-muted-foreground" />
      </Button>
    </div>
  )
}

function ScheduleDialog({
  open,
  onOpenChange,
  routines,
  presetDay,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  routines: Routines
  presetDay: number | null
}) {
  const [source, setSource] = useState("custom")
  const [title, setTitle] = useState("")
  const [day, setDay] = useState("1")
  const [time, setTime] = useState("")
  const [notes, setNotes] = useState("")
  const [saving, setSaving] = useState(false)

  // Sync the day selector with the day the user tapped, and reset the form
  // each time the dialog opens.
  const [lastOpen, setLastOpen] = useState(false)
  if (open !== lastOpen) {
    setLastOpen(open)
    if (open) {
      setSource("custom")
      setTitle("")
      setDay(String(presetDay ?? new Date().getDay()))
      setTime("")
      setNotes("")
    }
  }

  function onSourceChange(value: string) {
    setSource(value)
    if (value !== "custom") {
      const routine = routines.find((r) => String(r.id) === value)
      if (routine) setTitle(routine.name)
    } else {
      setTitle("")
    }
  }

  async function onSave() {
    if (!title.trim()) {
      toast.error("Give the workout a title")
      return
    }
    setSaving(true)
    try {
      await addScheduledWorkout({
        title,
        dayOfWeek: Number(day),
        routineId: source === "custom" ? null : Number(source),
        time: time || null,
        notes: notes || null,
      })
      toast.success("Workout scheduled")
      onOpenChange(false)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not schedule workout")
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Schedule a workout</DialogTitle>
          <DialogDescription>
            Pick one of your routines or enter a custom workout for a specific day.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label>Workout</Label>
            <Select value={source} onValueChange={onSourceChange}>
              <SelectTrigger>
                <SelectValue>
                  {(value: string) =>
                    value === "custom"
                      ? "Custom workout"
                      : (routines.find((r) => String(r.id) === value)?.name ?? "Custom workout")
                  }
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="custom">Custom workout</SelectItem>
                {routines.map((r) => (
                  <SelectItem key={r.id} value={String(r.id)}>
                    {r.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="sched-title">Title</Label>
            <Input
              id="sched-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Lower body strength"
              disabled={source !== "custom"}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-2">
              <Label>Day</Label>
              <Select value={day} onValueChange={setDay}>
                <SelectTrigger>
                  <SelectValue>
                    {(value: string) => DAYS.find((d) => String(d.value) === value)?.label}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {DAYS.map((d) => (
                    <SelectItem key={d.value} value={String(d.value)}>
                      {d.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="sched-time">Time (optional)</Label>
              <Input
                id="sched-time"
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
              />
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="sched-notes">Notes (optional)</Label>
            <Textarea
              id="sched-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder="Focus, intensity, reminders…"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={onSave} disabled={saving}>
            {saving ? "Saving…" : "Add to schedule"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
