import { getSession } from "@/lib/get-user"
import { generateObject } from "ai"
import { z } from "zod"

export const maxDuration = 60

const planSchema = z.object({
  title: z
    .string()
    .describe("A short title for this rehab plan, e.g. 'Knee ACL Recovery' or 'Lower Back Program'"),
  professionalName: z
    .string()
    .nullable()
    .describe("Name of the physical therapist or clinic if present, else null"),
  notes: z
    .string()
    .nullable()
    .describe("Any general notes, precautions, or goals mentioned in the handout"),
  exercises: z
    .array(
      z.object({
        name: z.string().describe("The exercise name"),
        sets: z.number().int().nullable().describe("Number of sets, or null if not specified"),
        reps: z.number().int().nullable().describe("Reps per set, or null if not specified"),
        frequency: z
          .string()
          .nullable()
          .describe("How often, e.g. 'Daily', '3x per week', 'Twice daily'"),
        instructions: z
          .string()
          .nullable()
          .describe("Form cues, holds, or special instructions for this exercise"),
      }),
    )
    .describe("Every prescribed exercise found in the handout"),
})

export async function POST(req: Request) {
  const session = await getSession()
  if (!session?.user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 })
  }

  let body: { text?: string; imageDataUrl?: string }
  try {
    body = await req.json()
  } catch {
    return Response.json({ error: "Invalid request" }, { status: 400 })
  }

  const { text, imageDataUrl } = body
  if (!text?.trim() && !imageDataUrl) {
    return Response.json({ error: "Provide handout text or an image" }, { status: 400 })
  }

  const instruction =
    "You are a medical rehab assistant. Extract the prescribed exercises from this physical therapy / physiotherapy handout. " +
    "Capture the exercise name, sets, reps, frequency, and any instructions exactly as prescribed by the professional. " +
    "If a value is not specified, use null. Do not invent exercises that are not present."

  const content: Array<
    { type: "text"; text: string } | { type: "image"; image: string }
  > = [{ type: "text", text: instruction }]

  if (text?.trim()) {
    content.push({ type: "text", text: `Handout text:\n${text.trim()}` })
  }
  if (imageDataUrl) {
    content.push({ type: "image", image: imageDataUrl })
  }

  try {
    const { object } = await generateObject({
      model: "openai/gpt-4o-mini",
      schema: planSchema,
      messages: [{ role: "user", content }],
    })
    return Response.json(object)
  } catch (err) {
    console.log("[v0] scan-handout error:", err instanceof Error ? err.message : String(err))
    return Response.json(
      { error: "Could not read the handout. Try clearer text or a sharper image." },
      { status: 500 },
    )
  }
}
