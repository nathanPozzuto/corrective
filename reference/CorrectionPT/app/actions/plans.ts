"use server"

import { db } from "@/lib/db"
import { planExercises, plans } from "@/lib/db/schema"
import { getUserId } from "@/lib/get-user"
import { and, asc, desc, eq } from "drizzle-orm"
import { revalidatePath } from "next/cache"

export type PlanExerciseInput = {
  name: string
  sets?: number | null
  reps?: number | null
  frequency?: string | null
  daysOfWeek?: string[] | null
  reminderTime?: string | null
  instructions?: string | null
}

export async function createPlan(input: {
  title: string
  professionalName?: string
  notes?: string
  sourceText?: string
  exercises: PlanExerciseInput[]
}) {
  const userId = await getUserId()
  if (!input.title.trim()) throw new Error("Plan title is required")
  const clean = (input.exercises ?? []).filter((e) => e.name?.trim())

  const [plan] = await db
    .insert(plans)
    .values({
      userId,
      title: input.title.trim(),
      professionalName: input.professionalName?.trim() || null,
      notes: input.notes?.trim() || null,
      sourceText: input.sourceText?.trim() || null,
    })
    .returning()

  if (clean.length > 0) {
    await db.insert(planExercises).values(
      clean.map((e) => ({
        userId,
        planId: plan.id,
        name: e.name.trim(),
        sets: e.sets ?? null,
        reps: e.reps ?? null,
        frequency: e.frequency?.trim() || null,
        daysOfWeek: e.daysOfWeek && e.daysOfWeek.length > 0 ? e.daysOfWeek.join(",") : null,
        reminderTime: e.reminderTime?.trim() || null,
        instructions: e.instructions?.trim() || null,
      })),
    )
  }

  revalidatePath("/plans")
  revalidatePath("/")
  return plan.id
}

export async function getPlans() {
  const userId = await getUserId()
  const list = await db
    .select()
    .from(plans)
    .where(eq(plans.userId, userId))
    .orderBy(desc(plans.createdAt))

  const items = await db
    .select()
    .from(planExercises)
    .where(eq(planExercises.userId, userId))
    .orderBy(asc(planExercises.id))

  return list.map((p) => ({
    ...p,
    exercises: items
      .filter((i) => i.planId === p.id)
      .map((i) => ({ ...i, daysOfWeekList: i.daysOfWeek ? i.daysOfWeek.split(",") : [] })),
  }))
}

export async function deletePlan(id: number) {
  const userId = await getUserId()
  await db
    .delete(planExercises)
    .where(and(eq(planExercises.planId, id), eq(planExercises.userId, userId)))
  await db.delete(plans).where(and(eq(plans.id, id), eq(plans.userId, userId)))
  revalidatePath("/plans")
  revalidatePath("/")
}
