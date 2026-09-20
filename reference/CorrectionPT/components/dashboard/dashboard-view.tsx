import { getPainLogs } from "@/app/actions/pain"
import { getPlans } from "@/app/actions/plans"
import { getSchedule } from "@/app/actions/schedule"
import { getWorkoutLogs } from "@/app/actions/workouts"
import { PainChart } from "@/components/pain/pain-chart"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import {
  CalendarClock,
  CheckCircle2,
  Dumbbell,
  Flame,
  HeartPulse,
  Plus,
  Sparkles,
  TrendingDown,
  TrendingUp,
} from "lucide-react"
import Link from "next/link"

type Workouts = Awaited<ReturnType<typeof getWorkoutLogs>>
type Pain = Awaited<ReturnType<typeof getPainLogs>>
type Plans = Awaited<ReturnType<typeof getPlans>>
type Schedule = Awaited<ReturnType<typeof getSchedule>>

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]

function dateKey(d: Date) {
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`
}

function formatTime(time: string | null) {
  if (!time) return null
  const [h, m] = time.split(":").map(Number)
  if (Number.isNaN(h)) return time
  const period = h >= 12 ? "PM" : "AM"
  const hour12 = h % 12 === 0 ? 12 : h % 12
  return `${hour12}:${String(m ?? 0).padStart(2, "0")} ${period}`
}

function formatDuration(total: number) {
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = total % 60
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`
  return `${m}:${String(s).padStart(2, "0")}`
}

function formatSet(s: Workouts[number]["sets"][number]) {
  if (s.distance != null) {
    const parts = [`${s.distance} ${s.distanceUnit ?? "km"}`]
    if (s.durationSeconds != null) parts.push(formatDuration(s.durationSeconds))
    return parts.join(" · ")
  }
  if (s.durationSeconds != null) return formatDuration(s.durationSeconds)
  if (s.weight != null && s.reps != null) return `${s.weight} kg × ${s.reps}`
  if (s.reps != null) return `${s.reps} reps`
  return null
}

/** Consecutive days (ending today or yesterday) with at least one logged workout. */
function computeStreak(workouts: Workouts) {
  const keys = new Set(workouts.map((w) => dateKey(new Date(w.performedAt))))
  const cursor = new Date()
  cursor.setHours(0, 0, 0, 0)
  if (!keys.has(dateKey(cursor))) cursor.setDate(cursor.getDate() - 1)
  let streak = 0
  while (keys.has(dateKey(cursor))) {
    streak++
    cursor.setDate(cursor.getDate() - 1)
  }
  return streak
}

function reassurance({
  streak,
  sessionsThisWeek,
  painDelta,
  didWorkoutToday,
}: {
  streak: number
  sessionsThisWeek: number
  painDelta: number | null
  didWorkoutToday: boolean
}) {
  if (streak >= 3)
    return `You're on a ${streak}-day streak. This kind of consistency is exactly what steady recovery is built on — keep showing up.`
  if (didWorkoutToday)
    return "You've already moved today. Every rep is a small investment in feeling stronger — nicely done."
  if (painDelta != null && painDelta < 0)
    return "Your pain is trending down. That's real progress — your body is responding to the work you're putting in."
  if (sessionsThisWeek > 0)
    return `You've logged ${sessionsThisWeek} session${sessionsThisWeek === 1 ? "" : "s"} this week. Recovery isn't linear, and you're doing the right things.`
  return "Every recovery starts with a single session. Whenever you're ready, a small step today counts — you've got this."
}

export function DashboardView({
  user,
  workouts,
  pain,
  plans,
  schedule,
}: {
  user: { name?: string | null }
  workouts: Workouts
  pain: Pain
  plans: Plans
  schedule: Schedule
}) {
  const firstName = user.name?.trim().split(/\s+/)[0] || "there"

  const weekAgo = new Date()
  weekAgo.setDate(weekAgo.getDate() - 7)
  const sessionsThisWeek = workouts.filter((w) => new Date(w.performedAt) >= weekAgo).length

  const latestPain = pain[0]?.level ?? null
  const prevPain = pain[1]?.level ?? null
  const painDelta = latestPain != null && prevPain != null ? latestPain - prevPain : null

  const todayKey = dateKey(new Date())
  const today = DAY_LABELS[new Date().getDay()]

  // Exercises actually completed today (from logged workouts).
  const todaysLogs = workouts.filter((w) => dateKey(new Date(w.performedAt)) === todayKey)
  const exerciseMap = new Map<string, { name: string; sets: Workouts[number]["sets"] }>()
  for (const log of todaysLogs) {
    for (const s of log.sets) {
      const entry = exerciseMap.get(s.exerciseName) ?? { name: s.exerciseName, sets: [] }
      entry.sets = [...entry.sets, s]
      exerciseMap.set(s.exerciseName, entry)
    }
  }
  const todaysExercisesDone = Array.from(exerciseMap.values())
  const didWorkoutToday = todaysExercisesDone.length > 0

  // Pain logged today, if any.
  const painToday = pain.find((p) => dateKey(new Date(p.loggedAt)) === todayKey) ?? null

  const streak = computeStreak(workouts)
  const message = reassurance({ streak, sessionsThisWeek, painDelta, didWorkoutToday })

  // Scheduled items due today (plans + scheduled workouts).
  const todaysPlanExercises = plans.flatMap((p) =>
    p.exercises
      .filter((e) => e.daysOfWeekList.length === 0 || e.daysOfWeekList.includes(today))
      .map((e) => ({ ...e, planTitle: p.title })),
  )
  const todayDow = new Date().getDay()
  const todaysWorkouts = schedule.filter((s) => s.dayOfWeek === todayDow)
  const dueTodayCount = todaysPlanExercises.length + todaysWorkouts.length

  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-col gap-1">
        <p className="text-sm text-muted-foreground">Welcome back</p>
        <h1 className="text-2xl font-semibold tracking-tight text-balance">
          Good to see you, {firstName}.
        </h1>
      </header>

      {/* Reassurance + consistency */}
      <ConsistencyBanner streak={streak} message={message} sessionsThisWeek={sessionsThisWeek} />

      {/* Stat cards */}
      <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          icon={<Dumbbell className="size-4" />}
          label="Total workouts"
          value={String(workouts.length)}
          hint={`${sessionsThisWeek} this week`}
        />
        <StatCard
          icon={<HeartPulse className="size-4" />}
          label="Current pain"
          value={latestPain != null ? `${latestPain}/10` : "—"}
          hint={
            painDelta == null ? (
              "No trend yet"
            ) : painDelta < 0 ? (
              <span className="inline-flex items-center gap-1 text-primary">
                <TrendingDown className="size-3.5" /> Improving
              </span>
            ) : painDelta > 0 ? (
              <span className="inline-flex items-center gap-1 text-accent">
                <TrendingUp className="size-3.5" /> Up {painDelta}
              </span>
            ) : (
              "Holding steady"
            )
          }
        />
        <StatCard
          icon={<Flame className="size-4" />}
          label="Current streak"
          value={streak > 0 ? `${streak}d` : "0d"}
          hint={streak > 0 ? "Keep it going" : "Log today to start"}
        />
        <StatCard
          icon={<CalendarClock className="size-4" />}
          label="Due today"
          value={String(dueTodayCount)}
          hint={dueTodayCount ? "Workouts & exercises" : "Nothing scheduled"}
        />
      </section>

      {/* Today: what you did + how you feel */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Today&apos;s exercises</CardTitle>
              <CardDescription>What you&apos;ve completed so far today</CardDescription>
            </div>
            <Button render={<Link href="/workouts" />} variant="outline" size="sm">
              Log workout
            </Button>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {todaysExercisesDone.length === 0 ? (
              <div className="rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">
                Nothing logged yet today. When you finish a session, it&apos;ll show up here — no
                pressure, just progress.
              </div>
            ) : (
              todaysExercisesDone.map((ex) => (
                <div
                  key={ex.name}
                  className="flex items-center justify-between gap-3 border-b border-border pb-3 last:border-0 last:pb-0"
                >
                  <div className="flex min-w-0 items-center gap-2.5">
                    <CheckCircle2 className="size-4 shrink-0 text-primary" />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{ex.name}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {ex.sets.map((s) => formatSet(s)).filter(Boolean).join("  •  ") ||
                          `${ex.sets.length} set${ex.sets.length === 1 ? "" : "s"}`}
                      </p>
                    </div>
                  </div>
                  <Badge variant="secondary" className="shrink-0 font-mono text-xs">
                    {ex.sets.length} set{ex.sets.length === 1 ? "" : "s"}
                  </Badge>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>How you&apos;re feeling</CardTitle>
              <CardDescription>Today&apos;s pain check-in</CardDescription>
            </div>
            <Button render={<Link href="/pain" />} variant="outline" size="sm">
              Log pain
            </Button>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {painToday == null ? (
              <div className="rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">
                No pain logged today. A quick check-in helps you see the bigger picture over time.
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                <div className="flex items-center gap-4">
                  <div
                    className={cn(
                      "flex size-14 shrink-0 flex-col items-center justify-center rounded-2xl font-mono",
                      painToday.level <= 3
                        ? "bg-primary/10 text-primary"
                        : painToday.level <= 6
                          ? "bg-accent/15 text-accent"
                          : "bg-destructive/10 text-destructive",
                    )}
                  >
                    <span className="text-xl font-semibold leading-none">{painToday.level}</span>
                    <span className="text-[10px] opacity-70">/ 10</span>
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium">
                      {painToday.level <= 3
                        ? "Mild — that's encouraging"
                        : painToday.level <= 6
                          ? "Moderate — pace yourself"
                          : "High — be gentle today"}
                    </p>
                    {painToday.location && (
                      <p className="truncate text-xs text-muted-foreground">{painToday.location}</p>
                    )}
                  </div>
                </div>
                {painToday.note && (
                  <p className="rounded-lg bg-secondary/50 p-3 text-sm text-muted-foreground text-pretty">
                    {painToday.note}
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        {/* Pain trend */}
        <Card className="lg:col-span-3">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Recovery curve</CardTitle>
              <CardDescription>Your pain level over the last 30 days</CardDescription>
            </div>
            <Button render={<Link href="/pain" />} variant="outline" size="sm">
              Log pain
            </Button>
          </CardHeader>
          <CardContent>
            <PainChart data={pain} />
          </CardContent>
        </Card>

        {/* Today's plan */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Today&apos;s plan</CardTitle>
              <CardDescription>
                {today} — {dueTodayCount} item{dueTodayCount === 1 ? "" : "s"}
              </CardDescription>
            </div>
            <Button render={<Link href="/schedule" />} variant="outline" size="sm">
              Schedule
            </Button>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {dueTodayCount === 0 ? (
              <div className="rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">
                Nothing planned for today. Schedule a workout or build a PT plan to see it here.
              </div>
            ) : (
              <>
                {todaysWorkouts.map((w) => {
                  const time = formatTime(w.time)
                  return (
                    <div
                      key={`sched-${w.id}`}
                      className="flex items-center justify-between gap-3 border-b border-border pb-3 last:border-0 last:pb-0"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{w.title}</p>
                        <p className="truncate text-xs text-muted-foreground">Scheduled workout</p>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        <Badge className="text-[10px] uppercase tracking-wide">Workout</Badge>
                        {time && (
                          <span className="font-mono text-xs text-muted-foreground">{time}</span>
                        )}
                      </div>
                    </div>
                  )
                })}
                {todaysPlanExercises.slice(0, 5).map((e) => (
                  <div
                    key={e.id}
                    className="flex items-center justify-between gap-3 border-b border-border pb-3 last:border-0 last:pb-0"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{e.name}</p>
                      <p className="truncate text-xs text-muted-foreground">{e.planTitle}</p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      {e.sets && e.reps && (
                        <Badge variant="secondary" className="font-mono text-xs">
                          {e.sets}×{e.reps}
                        </Badge>
                      )}
                      {e.reminderTime && (
                        <span className="font-mono text-xs text-muted-foreground">
                          {e.reminderTime}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick actions */}
      <section className="grid gap-4 sm:grid-cols-3">
        <QuickAction
          href="/workouts"
          icon={<Dumbbell className="size-5" />}
          title="Log a workout"
          desc="Record exercises, weight, and reps."
        />
        <QuickAction
          href="/plans"
          icon={<CalendarClock className="size-5" />}
          title="Build a PT plan"
          desc="Add your physio's prescribed exercises."
        />
        <QuickAction
          href="/routines"
          icon={<Plus className="size-5" />}
          title="Build a routine"
          desc="Compose from preset exercises."
        />
      </section>

      {/* Recent workouts */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Recent workouts</CardTitle>
            <CardDescription>Your latest logged sessions</CardDescription>
          </div>
          <Button render={<Link href="/workouts" />} variant="ghost" size="sm">
            View all
          </Button>
        </CardHeader>
        <CardContent>
          {workouts.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
              No workouts yet. Log your first session to start tracking progress.
            </div>
          ) : (
            <ul className="flex flex-col gap-3">
              {workouts.slice(0, 4).map((w) => (
                <li
                  key={w.id}
                  className="flex items-center justify-between gap-3 border-b border-border pb-3 last:border-0 last:pb-0"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{w.name || "Workout"}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(w.performedAt).toLocaleDateString("en-US", {
                        weekday: "short",
                        month: "short",
                        day: "numeric",
                      })}
                    </p>
                  </div>
                  <Badge variant="secondary" className="shrink-0 font-mono text-xs">
                    {w.sets.length} set{w.sets.length === 1 ? "" : "s"}
                  </Badge>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function ConsistencyBanner({
  streak,
  message,
  sessionsThisWeek,
}: {
  streak: number
  message: string
  sessionsThisWeek: number
}) {
  const onStreak = streak >= 3
  return (
    <Card
      className={cn(
        "border-primary/20",
        onStreak && "bg-primary/5",
      )}
    >
      <CardContent className="flex items-center gap-4 p-5">
        <span
          className={cn(
            "flex size-12 shrink-0 items-center justify-center rounded-2xl",
            onStreak ? "bg-primary text-primary-foreground" : "bg-primary/10 text-primary",
          )}
        >
          {onStreak ? <Flame className="size-6" /> : <Sparkles className="size-6" />}
        </span>
        <div className="flex min-w-0 flex-col gap-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-medium">
              {onStreak
                ? `${streak}-day streak`
                : streak > 0
                  ? `${streak}-day start`
                  : "Ready when you are"}
            </p>
            {onStreak && (
              <Badge className="gap-1">
                <CheckCircle2 className="size-3" />
                Consistent
              </Badge>
            )}
            {sessionsThisWeek > 0 && (
              <Badge variant="secondary" className="font-mono text-xs">
                {sessionsThisWeek} this week
              </Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground text-pretty">{message}</p>
        </div>
      </CardContent>
    </Card>
  )
}

function StatCard({
  icon,
  label,
  value,
  hint,
}: {
  icon: React.ReactNode
  label: string
  value: string
  hint: React.ReactNode
}) {
  return (
    <Card>
      <CardContent className="flex flex-col gap-2 p-4">
        <div className="flex items-center gap-2 text-muted-foreground">
          <span className="flex size-7 items-center justify-center rounded-md bg-secondary text-secondary-foreground">
            {icon}
          </span>
          <span className="text-xs font-medium">{label}</span>
        </div>
        <p className="font-mono text-2xl font-semibold tracking-tight">{value}</p>
        <p className="text-xs text-muted-foreground">{hint}</p>
      </CardContent>
    </Card>
  )
}

function QuickAction({
  href,
  icon,
  title,
  desc,
}: {
  href: string
  icon: React.ReactNode
  title: string
  desc: string
}) {
  return (
    <Link href={href}>
      <Card className="h-full transition-colors hover:border-primary/40 hover:bg-secondary/40">
        <CardContent className="flex items-start gap-3 p-4">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            {icon}
          </span>
          <div>
            <p className="font-medium">{title}</p>
            <p className="text-sm text-muted-foreground text-pretty">{desc}</p>
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}
