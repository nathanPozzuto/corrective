import { AuthForm } from "@/components/auth-form"
import { getSession } from "@/lib/get-user"
import { redirect } from "next/navigation"
import { AuthAside } from "@/components/auth-aside"

export default async function SignInPage() {
  const session = await getSession()
  if (session?.user) redirect("/")
  return (
    <main className="grid min-h-screen lg:grid-cols-2">
      <div className="flex items-center justify-center px-6 py-12">
        <AuthForm mode="sign-in" />
      </div>
      <AuthAside />
    </main>
  )
}
