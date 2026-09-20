"use server"

import { db } from "@/lib/db"
import { scheduledWorkouts } from "@/lib/db/schema"
import { getUserId } from "@/lib/get-user"
import { and, asc, eq } from "drizzle-orm"
import { revalidatePath } from "next/cache"

export async function getSchedule() {
  const userId = await getUserId()
  return db
    .select()
    .from(scheduledWorkouts)
    .where(eq(scheduledWorkouts.userId, userId))
    .orderBy(asc(scheduledWorkouts.dayOfWeek), asc(scheduledWorkouts.time))
}

export async function addScheduledWorkout(input: {
  title: string
  dayOfWeek: number
  routineId?: number | null
  time?: string | null
  notes?: string | null
}) {
  const userId = await getUserId()
  if (!input.title.trim()) throw new Error("A workout title is required")
  if (!Number.isInteger(input.dayOfWeek) || input.dayOfWeek < 0 || input.dayOfWeek > 6) {
    throw new Error("Pick a valid day of the week")
  }

  const [row] = await db
    .insert(scheduledWorkouts)
    .values({
      userId,
      title: input.title.trim(),
      dayOfWeek: input.dayOfWeek,
      routineId: input.routineId ?? null,
      time: input.time?.trim() || null,
      notes: input.notes?.trim() || null,
    })
    .returning()

  revalidatePath("/schedule")
  revalidatePath("/")
  return row.id
}

export async function deleteScheduledWorkout(id: number) {
  const userId = await getUserId()
  await db
    .delete(scheduledWorkouts)
    .where(and(eq(scheduledWorkouts.id, id), eq(scheduledWorkouts.userId, userId)))
  revalidatePath("/schedule")
  revalidatePath("/")
}
