import {
  pgTable,
  text,
  timestamp,
  boolean,
  serial,
  integer,
  numeric,
} from "drizzle-orm/pg-core"

// --- Better Auth required tables -------------------------------------------
// Column names are camelCase to match Better Auth's defaults. Do not rename.

export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("emailVerified").notNull().default(false),
  image: text("image"),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow(),
})

export const session = pgTable("session", {
  id: text("id").primaryKey(),
  expiresAt: timestamp("expiresAt").notNull(),
  token: text("token").notNull().unique(),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow(),
  ipAddress: text("ipAddress"),
  userAgent: text("userAgent"),
  userId: text("userId")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
})

export const account = pgTable("account", {
  id: text("id").primaryKey(),
  accountId: text("accountId").notNull(),
  providerId: text("providerId").notNull(),
  userId: text("userId")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  accessToken: text("accessToken"),
  refreshToken: text("refreshToken"),
  idToken: text("idToken"),
  accessTokenExpiresAt: timestamp("accessTokenExpiresAt"),
  refreshTokenExpiresAt: timestamp("refreshTokenExpiresAt"),
  scope: text("scope"),
  password: text("password"),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow(),
})

export const verification = pgTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expiresAt").notNull(),
  createdAt: timestamp("createdAt").defaultNow(),
  updatedAt: timestamp("updatedAt").defaultNow(),
})

// --- App tables ------------------------------------------------------------

// Preset exercise library (isPreset=true, userId null) plus any custom
// exercises a user adds (isPreset=false, userId set).
export const exercises = pgTable("exercises", {
  id: serial("id").primaryKey(),
  userId: text("userId"),
  name: text("name").notNull(),
  category: text("category").notNull(),
  muscleGroup: text("muscleGroup"),
  description: text("description"),
  isPreset: boolean("isPreset").notNull().default(false),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
})

// A user-built workout routine (a reusable template).
export const routines = pgTable("routines", {
  id: serial("id").primaryKey(),
  userId: text("userId").notNull(),
  name: text("name").notNull(),
  description: text("description"),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
})

export const routineExercises = pgTable("routine_exercises", {
  id: serial("id").primaryKey(),
  userId: text("userId").notNull(),
  routineId: integer("routineId").notNull(),
  exerciseName: text("exerciseName").notNull(),
  targetSets: integer("targetSets"),
  targetReps: integer("targetReps"),
  orderIndex: integer("orderIndex").notNull().default(0),
})

// A logged workout session.
export const workoutLogs = pgTable("workout_logs", {
  id: serial("id").primaryKey(),
  userId: text("userId").notNull(),
  name: text("name"),
  notes: text("notes"),
  performedAt: timestamp("performedAt").notNull().defaultNow(),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
})

// Individual sets logged within a workout session (exercise + weight + reps).
export const loggedSets = pgTable("logged_sets", {
  id: serial("id").primaryKey(),
  userId: text("userId").notNull(),
  workoutLogId: integer("workoutLogId").notNull(),
  exerciseName: text("exerciseName").notNull(),
  weight: numeric("weight"),
  reps: integer("reps"),
  setNumber: integer("setNumber").notNull().default(1),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
})

// Pain slider entries tracked over time for recovery.
export const painLogs = pgTable("pain_logs", {
  id: serial("id").primaryKey(),
  userId: text("userId").notNull(),
  level: integer("level").notNull(),
  location: text("location"),
  note: text("note"),
  loggedAt: timestamp("loggedAt").notNull().defaultNow(),
})

// A rehab plan created from a scanned PT handout.
export const plans = pgTable("plans", {
  id: serial("id").primaryKey(),
  userId: text("userId").notNull(),
  title: text("title").notNull(),
  professionalName: text("professionalName"),
  notes: text("notes"),
  sourceText: text("sourceText"),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
})

// A workout assigned to a specific day of the week (recurring weekly schedule).
// routineId is denormalized with a title so a scheduled entry survives routine
// deletion; dayOfWeek is 0 (Sunday) through 6 (Saturday).
export const scheduledWorkouts = pgTable("scheduled_workouts", {
  id: serial("id").primaryKey(),
  userId: text("userId").notNull(),
  routineId: integer("routineId"),
  title: text("title").notNull(),
  dayOfWeek: integer("dayOfWeek").notNull(),
  time: text("time"),
  notes: text("notes"),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
})

// Prescribed exercises within a plan, with scheduling / reminder metadata.
export const planExercises = pgTable("plan_exercises", {
  id: serial("id").primaryKey(),
  userId: text("userId").notNull(),
  planId: integer("planId").notNull(),
  name: text("name").notNull(),
  sets: integer("sets"),
  reps: integer("reps"),
  frequency: text("frequency"),
  daysOfWeek: text("daysOfWeek"),
  reminderTime: text("reminderTime"),
  instructions: text("instructions"),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
})
