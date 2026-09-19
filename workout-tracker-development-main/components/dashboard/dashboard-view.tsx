import { getPainLogs } from "@/app/actions/pain"
import { getPlans } from "@/app/actions/plans"
import { getSchedule } from "@/app/actions/schedule"
import { getWorkoutLogs } from "@/app/actions/workouts"
import { PainChart } from "@/components/pain/pain-chart"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { CalendarClock, Dumbbell, HeartPulse, Plus, TrendingDown, TrendingUp } from "lucide-react"
import Link from "next/link"

type Workouts = Awaited<ReturnType<typeof getWorkoutLogs>>
type Pain = Awaited<ReturnType<typeof getPainLogs>>
type Plans = Awaited<ReturnType<typeof getPlans>>
type Schedule = Awaited<ReturnType<typeof getSchedule>>

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]

function formatTime(time: string | null) {
  if (!time) return null
  const [h, m] = time.split(":").map(Number)
  if (Number.isNaN(h)) return time
  const period = h >= 12 ? "PM" : "AM"
  const hour12 = h % 12 === 0 ? 12 : h % 12
  return `${hour12}:${String(m ?? 0).padStart(2, "0")} ${period}`
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

  const today = DAY_LABELS[new Date().getDay()]
  const todaysExercises = plans.flatMap((p) =>
    p.exercises
      .filter((e) => e.daysOfWeekList.length === 0 || e.daysOfWeekList.includes(today))
      .map((e) => ({ ...e, planTitle: p.title })),
  )

  const todayDow = new Date().getDay()
  const todaysWorkouts = schedule.filter((s) => s.dayOfWeek === todayDow)
  const dueTodayCount = todaysExercises.length + todaysWorkouts.length

  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-col gap-1">
        <p className="text-sm text-muted-foreground">Welcome back</p>
        <h1 className="text-2xl font-semibold tracking-tight text-balance">
          Good to see you, {firstName}.
        </h1>
      </header>

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
          icon={<CalendarClock className="size-4" />}
          label="Active plans"
          value={String(plans.length)}
          hint={`${plans.reduce((n, p) => n + p.exercises.length, 0)} exercises`}
        />
        <StatCard
          icon={<CalendarClock className="size-4" />}
          label="Due today"
          value={String(dueTodayCount)}
          hint={dueTodayCount ? "Workouts & exercises" : "Nothing scheduled"}
        />
      </section>

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

        {/* Today */}
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
                Nothing planned for today. Schedule a workout or scan a PT handout to build a plan.
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
                {todaysExercises.slice(0, 5).map((e) => (
                  <div key={e.id} className="flex items-center justify-between gap-3 border-b border-border pb-3 last:border-0 last:pb-0">
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
                        <span className="font-mono text-xs text-muted-foreground">{e.reminderTime}</span>
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
          title="Scan a handout"
          desc="Turn a PT sheet into a plan."
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
                <li key={w.id} className="flex items-center justify-between gap-3 border-b border-border pb-3 last:border-0 last:pb-0">
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
