"use client"

import { authClient } from "@/lib/auth-client"
import { DropdownMenuItem } from "@/components/ui/dropdown-menu"
import { useRouter } from "next/navigation"
import { LogOut } from "lucide-react"

export function SignOutButton() {
  const router = useRouter()
  return (
    <DropdownMenuItem
      onSelect={async (e) => {
        e.preventDefault()
        await authClient.signOut()
        router.push("/sign-in")
        router.refresh()
      }}
    >
      <LogOut className="size-4" />
      Sign out
    </DropdownMenuItem>
  )
}
