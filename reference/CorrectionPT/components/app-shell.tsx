"use client"

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
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
import { Button } from "@/components/ui/button"
import { SignOutButton } from "@/components/sign-out-button"
import { authClient } from "@/lib/auth-client"
import { cn } from "@/lib/utils"
import {
  Activity,
  CalendarClock,
  CalendarDays,
  Dumbbell,
  HeartPulse,
  LayoutGrid,
  ListChecks,
  Mail,
} from "lucide-react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { useState } from "react"
import { toast } from "sonner"

const nav = [
  { href: "/", label: "Dashboard", icon: LayoutGrid },
  { href: "/workouts", label: "Workouts", icon: Dumbbell },
  { href: "/routines", label: "Routines", icon: ListChecks },
  { href: "/schedule", label: "Schedule", icon: CalendarDays },
  { href: "/plans", label: "PT Plans", icon: CalendarClock },
  { href: "/pain", label: "Pain Tracker", icon: HeartPulse },
]

function initials(name?: string | null, email?: string | null) {
  if (name?.trim()) {
    return name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase())
      .join("")
  }
  return email?.[0]?.toUpperCase() ?? "U"
}

export function AppShell({
  user,
  children,
}: {
  user: { name?: string | null; email?: string | null }
  children: React.ReactNode
}) {
  const pathname = usePathname()

  return (
    <div className="flex min-h-screen flex-col bg-background md:flex-row">
      {/* Sidebar (desktop) */}
      <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r border-border bg-sidebar px-4 py-6 md:flex">
        <Link href="/" className="mb-8 flex items-center gap-2 px-2 text-sidebar-foreground">
          <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Activity className="size-4.5" />
          </span>
          <span className="font-semibold tracking-tight">CorrectivePT</span>
        </Link>

        <nav className="flex flex-1 flex-col gap-1">
          {nav.map((item) => {
            const active = pathname === item.href
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  active
                    ? "bg-sidebar-primary text-sidebar-primary-foreground"
                    : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                )}
              >
                <item.icon className="size-4.5" />
                {item.label}
              </Link>
            )
          })}
        </nav>

        <UserMenu user={user} />
      </aside>

      {/* Mobile top bar */}
      <header className="sticky top-0 z-20 flex items-center justify-between border-b border-border bg-sidebar/95 px-4 py-3 backdrop-blur md:hidden">
        <Link href="/" className="flex items-center gap-2 text-sidebar-foreground">
          <span className="flex size-7 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Activity className="size-4" />
          </span>
          <span className="font-semibold tracking-tight">CorrectivePT</span>
        </Link>
        <UserMenu user={user} />
      </header>

      <div className="flex min-w-0 flex-1 flex-col">
        <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6 md:px-8 md:py-10">{children}</main>

        {/* Mobile bottom nav */}
        <nav className="sticky bottom-0 z-20 grid grid-cols-6 border-t border-border bg-sidebar/95 backdrop-blur md:hidden">
          {nav.map((item) => {
            const active = pathname === item.href
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex flex-col items-center gap-1 py-2 text-[11px] font-medium",
                  active ? "text-primary" : "text-sidebar-foreground/60",
                )}
              >
                <item.icon className="size-5" />
                {item.label.split(" ")[0]}
              </Link>
            )
          })}
        </nav>
      </div>
    </div>
  )
}

function UserMenu({ user }: { user: { name?: string | null; email?: string | null } }) {
  const [emailOpen, setEmailOpen] = useState(false)

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger className="flex items-center gap-3 rounded-lg px-2 py-2 text-left outline-none transition-colors hover:bg-sidebar-accent">
          <span className="flex size-8 items-center justify-center rounded-full bg-accent text-sm font-semibold text-accent-foreground">
            {initials(user.name, user.email)}
          </span>
          <span className="hidden min-w-0 flex-col md:flex">
            <span className="truncate text-sm font-medium text-sidebar-foreground">
              {user.name || "Your account"}
            </span>
            <span className="truncate text-xs text-sidebar-foreground/60">{user.email}</span>
          </span>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <div className="truncate px-1.5 py-1 text-xs font-medium text-muted-foreground">
            {user.email}
          </div>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() => {
              // The menu closes itself on click (closeOnClick). Defer opening so
              // the menu's dismiss pointer event isn't treated as an outside-press
              // on the dialog, which would close it immediately.
              setTimeout(() => setEmailOpen(true), 10)
            }}
          >
            <Mail className="size-4" />
            Change email
          </DropdownMenuItem>
          <SignOutButton />
        </DropdownMenuContent>
      </DropdownMenu>

      <ChangeEmailDialog
        open={emailOpen}
        onOpenChange={setEmailOpen}
        currentEmail={user.email ?? ""}
      />
    </>
  )
}

function ChangeEmailDialog({
  open,
  onOpenChange,
  currentEmail,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  currentEmail: string
}) {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [saving, setSaving] = useState(false)

  async function onSave() {
    const next = email.trim()
    if (!next) {
      toast.error("Enter a new email address")
      return
    }
    if (next.toLowerCase() === currentEmail.toLowerCase()) {
      toast.error("That's already your email")
      return
    }
    setSaving(true)
    try {
      const { error } = await authClient.changeEmail({ newEmail: next })
      if (error) throw new Error(error.message || "Could not update email")
      toast.success("Email updated")
      setEmail("")
      onOpenChange(false)
      router.refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not update email")
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => (onOpenChange(v), !v && setEmail(""))}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Change email</DialogTitle>
          <DialogDescription>
            Update the email address used to sign in to your account.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label>Current email</Label>
            <Input value={currentEmail} disabled readOnly />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="new-email">New email</Label>
            <Input
              id="new-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.nativeEvent.isComposing && e.keyCode !== 229) {
                  e.preventDefault()
                  onSave()
                }
              }}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={onSave} disabled={saving}>
            {saving ? "Saving…" : "Update email"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
