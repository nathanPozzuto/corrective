import { auth } from "@/lib/auth"
import { headers } from "next/headers"
import { redirect } from "next/navigation"

/** Returns the current session or null. Safe to call in server components. */
export async function getSession() {
  return auth.api.getSession({ headers: await headers() })
}

/** Throws for use in server actions/mutations where a user is required. */
export async function getUserId() {
  const session = await getSession()
  if (!session?.user) throw new Error("Unauthorized")
  return session.user.id
}

/** Redirects to sign-in for use in protected pages. Returns the user. */
export async function requireUser() {
  const session = await getSession()
  if (!session?.user) redirect("/sign-in")
  return session.user
}
