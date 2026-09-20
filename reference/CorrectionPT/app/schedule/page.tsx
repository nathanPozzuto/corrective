import { getRoutines } from "@/app/actions/routines"
import { getSchedule } from "@/app/actions/schedule"
import { AppShell } from "@/components/app-shell"
import { ScheduleView } from "@/components/schedule/schedule-view"
import { requireUser } from "@/lib/get-user"

export default async function SchedulePage() {
  const user = await requireUser()
  const [schedule, routines] = await Promise.all([getSchedule(), getRoutines()])

  return (
    <AppShell user={user}>
      <ScheduleView schedule={schedule} routines={routines} />
    </AppShell>
  )
}
