import { Activity, CalendarClock, ClipboardList, HeartPulse } from "lucide-react"

const points = [
  { icon: Activity, label: "Log every workout", desc: "Track exercises, weight, and reps over time." },
  { icon: HeartPulse, label: "Follow your pain", desc: "A simple slider charts your recovery curve." },
  { icon: ClipboardList, label: "Build PT plans", desc: "Keep your therapist's exercises in one place." },
  { icon: CalendarClock, label: "Stay on schedule", desc: "Reminders keep your rehab consistent." },
]

export function AuthAside() {
  return (
    <aside className="relative hidden overflow-hidden bg-primary lg:flex lg:flex-col lg:justify-between lg:p-12">
      <div className="flex items-center gap-2 text-primary-foreground">
        <Activity className="size-5" />
            <span className="font-semibold tracking-tight">CorrectivePT</span>
      </div>

      <div className="max-w-md">
        <h2 className="text-3xl font-semibold leading-tight text-primary-foreground text-balance">
          Recover with intention, one session at a time.
        </h2>
        <ul className="mt-8 flex flex-col gap-5">
          {points.map((p) => (
            <li key={p.label} className="flex items-start gap-3">
              <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary-foreground/15 text-primary-foreground">
                <p.icon className="size-4.5" />
              </span>
              <div>
                <p className="font-medium text-primary-foreground">{p.label}</p>
                <p className="text-sm text-primary-foreground/70">{p.desc}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>

      <p className="text-sm text-primary-foreground/60">
        Built for people healing from injury — with their physio, not instead of them.
      </p>
    </aside>
  )
}
