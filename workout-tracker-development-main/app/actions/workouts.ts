"use server"

import { db } from "@/lib/db"
import { loggedSets, workoutLogs } from "@/lib/db/schema"
import { getUserId } from "@/lib/get-user"
import { and, desc, eq } from "drizzle-orm"
import { revalidatePath } from "next/cache"

export type SetInput = {
  exerciseName: string
  weight?: number | null
  reps?: number | null
  setNumber: number
}

export async function createWorkoutLog(input: {
  name?: string
  notes?: string
  performedAt?: string
  sets: SetInput[]
}) {
  const userId = await getUserId()
  const cleanSets = input.sets.filter((s) => s.exerciseName?.trim())
  if (cleanSets.length === 0) throw new Error("Add at least one set")

  const [log] = await db
    .insert(workoutLogs)
    .values({
      userId,
      name: input.name?.trim() || null,
      notes: input.notes?.trim() || null,
      performedAt: input.performedAt ? new Date(input.performedAt) : new Date(),
    })
    .returning()

  await db.insert(loggedSets).values(
    cleanSets.map((s) => ({
      userId,
      workoutLogId: log.id,
      exerciseName: s.exerciseName.trim(),
      weight: s.weight != null && !Number.isNaN(s.weight) ? String(s.weight) : null,
      reps: s.reps != null && !Number.isNaN(s.reps) ? Math.round(s.reps) : null,
      setNumber: s.setNumber,
    })),
  )

  revalidatePath("/workouts")
  revalidatePath("/")
  return log.id
}

export async function getWorkoutLogs() {
  const userId = await getUserId()
  const logs = await db
    .select()
    .from(workoutLogs)
    .where(eq(workoutLogs.userId, userId))
    .orderBy(desc(workoutLogs.performedAt))

  const sets = await db
    .select()
    .from(loggedSets)
    .where(eq(loggedSets.userId, userId))
    .orderBy(desc(loggedSets.createdAt))

  return logs.map((log) => ({
    ...log,
    sets: sets
      .filter((s) => s.workoutLogId === log.id)
      .sort((a, b) => a.setNumber - b.setNumber),
  }))
}

export async function deleteWorkoutLog(id: number) {
  const userId = await getUserId()
  await db.delete(loggedSets).where(and(eq(loggedSets.workoutLogId, id), eq(loggedSets.userId, userId)))
  await db.delete(workoutLogs).where(and(eq(workoutLogs.id, id), eq(workoutLogs.userId, userId)))
  revalidatePath("/workouts")
  revalidatePath("/")
}

/** Distinct exercise names the user has logged, for progress charts. */
export async function getExerciseHistory(exerciseName: string) {
  const userId = await getUserId()
  const rows = await db
    .select({
      weight: loggedSets.weight,
      reps: loggedSets.reps,
      createdAt: loggedSets.createdAt,
    })
    .from(loggedSets)
    .where(and(eq(loggedSets.userId, userId), eq(loggedSets.exerciseName, exerciseName)))
    .orderBy(desc(loggedSets.createdAt))
  return rows
}
