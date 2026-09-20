"use server"

import { db } from "@/lib/db"
import { painLogs } from "@/lib/db/schema"
import { getUserId } from "@/lib/get-user"
import { and, desc, eq, gte } from "drizzle-orm"
import { revalidatePath } from "next/cache"

export async function logPain(input: { level: number; location?: string; note?: string }) {
  const userId = await getUserId()
  const level = Math.max(0, Math.min(10, Math.round(input.level)))
  await db.insert(painLogs).values({
    userId,
    level,
    location: input.location?.trim() || null,
    note: input.note?.trim() || null,
  })
  revalidatePath("/pain")
  revalidatePath("/")
}

export async function getPainLogs(days = 90) {
  const userId = await getUserId()
  const since = new Date()
  since.setDate(since.getDate() - days)
  return db
    .select()
    .from(painLogs)
    .where(and(eq(painLogs.userId, userId), gte(painLogs.loggedAt, since)))
    .orderBy(desc(painLogs.loggedAt))
}

export async function deletePainLog(id: number) {
  const userId = await getUserId()
  await db.delete(painLogs).where(and(eq(painLogs.id, id), eq(painLogs.userId, userId)))
  revalidatePath("/pain")
}
