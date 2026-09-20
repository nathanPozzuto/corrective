import { getPlans } from "@/app/actions/plans"
import { AppShell } from "@/components/app-shell"
import { PlansView } from "@/components/plans/plans-view"
import { requireUser } from "@/lib/get-user"

export default async function PlansPage() {
  const user = await requireUser()
  const plans = await getPlans()

  return (
    <AppShell user={user}>
      <PlansView plans={plans} />
    </AppShell>
  )
}
