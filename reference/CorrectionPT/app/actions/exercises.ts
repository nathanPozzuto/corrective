"use server"

import { db } from "@/lib/db"
import { exercises } from "@/lib/db/schema"
import { getUserId } from "@/lib/get-user"
import { and, asc, eq, or, isNull } from "drizzle-orm"
import { revalidatePath } from "next/cache"

/** Preset library plus this user's custom exercises. */
export async function getExercises() {
  const userId = await getUserId()
  return db
    .select()
    .from(exercises)
    .where(or(eq(exercises.isPreset, true), eq(exercises.userId, userId)))
    .orderBy(asc(exercises.name))
}

export async function createCustomExercise(input: {
  name: string
  category: string
  muscleGroup?: string
  description?: string
}) {
  const userId = await getUserId()
  if (!input.name.trim()) throw new Error("Name is required")
  await db.insert(exercises).values({
    userId,
    name: input.name.trim(),
    category: input.category.trim() || "Custom",
    muscleGroup: input.muscleGroup?.trim() || null,
    description: input.description?.trim() || null,
    isPreset: false,
  })
  revalidatePath("/routines")
}

export async function deleteCustomExercise(id: number) {
  const userId = await getUserId()
  // Only allow deleting the user's own (non-preset) exercises.
  await db
    .delete(exercises)
    .where(and(eq(exercises.id, id), eq(exercises.userId, userId), eq(exercises.isPreset, false)))
  revalidatePath("/routines")
}
