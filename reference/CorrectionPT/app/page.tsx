import { getPainLogs } from "@/app/actions/pain"
import { getPlans } from "@/app/actions/plans"
import { getSchedule } from "@/app/actions/schedule"
import { getWorkoutLogs } from "@/app/actions/workouts"
import { AppShell } from "@/components/app-shell"
import { DashboardView } from "@/components/dashboard/dashboard-view"
import { requireUser } from "@/lib/get-user"

export default async function DashboardPage() {
  const user = await requireUser()
  const [workouts, pain, plans, schedule] = await Promise.all([
    getWorkoutLogs(),
    getPainLogs(30),
    getPlans(),
    getSchedule(),
  ])

  return (
    <AppShell user={user}>
      <DashboardView user={user} workouts={workouts} pain={pain} plans={plans} schedule={schedule} />
    </AppShell>
  )
}
