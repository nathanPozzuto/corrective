import { getPainLogs } from "@/app/actions/pain"
import { AppShell } from "@/components/app-shell"
import { PainView } from "@/components/pain/pain-view"
import { requireUser } from "@/lib/get-user"

export default async function PainPage() {
  const user = await requireUser()
  const logs = await getPainLogs(60)

  return (
    <AppShell user={user}>
      <PainView logs={logs} />
    </AppShell>
  )
}
