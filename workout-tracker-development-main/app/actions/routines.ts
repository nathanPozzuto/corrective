"use server"

import { db } from "@/lib/db"
import { routineExercises, routines } from "@/lib/db/schema"
import { getUserId } from "@/lib/get-user"
import { and, asc, desc, eq } from "drizzle-orm"
import { revalidatePath } from "next/cache"

export type RoutineExerciseInput = {
  exerciseName: string
  targetSets?: number | null
  targetReps?: number | null
}

export async function createRoutine(input: {
  name: string
  description?: string
  exercises: RoutineExerciseInput[]
}) {
  const userId = await getUserId()
  if (!input.name.trim()) throw new Error("Routine name is required")
  const clean = input.exercises.filter((e) => e.exerciseName?.trim())
  if (clean.length === 0) throw new Error("Add at least one exercise")

  const [routine] = await db
    .insert(routines)
    .values({ userId, name: input.name.trim(), description: input.description?.trim() || null })
    .returning()

  await db.insert(routineExercises).values(
    clean.map((e, i) => ({
      userId,
      routineId: routine.id,
      exerciseName: e.exerciseName.trim(),
      targetSets: e.targetSets ?? null,
      targetReps: e.targetReps ?? null,
      orderIndex: i,
    })),
  )

  revalidatePath("/routines")
  return routine.id
}

export async function getRoutines() {
  const userId = await getUserId()
  const list = await db
    .select()
    .from(routines)
    .where(eq(routines.userId, userId))
    .orderBy(desc(routines.createdAt))

  const items = await db
    .select()
    .from(routineExercises)
    .where(eq(routineExercises.userId, userId))
    .orderBy(asc(routineExercises.orderIndex))

  return list.map((r) => ({
    ...r,
    exercises: items.filter((i) => i.routineId === r.id),
  }))
}

export async function deleteRoutine(id: number) {
  const userId = await getUserId()
  await db
    .delete(routineExercises)
    .where(and(eq(routineExercises.routineId, id), eq(routineExercises.userId, userId)))
  await db.delete(routines).where(and(eq(routines.id, id), eq(routines.userId, userId)))
  revalidatePath("/routines")
}
