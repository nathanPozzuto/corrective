package com.hackathon2026.corrective.store;

import com.hackathon2026.corrective.model.Exercise;
import com.hackathon2026.corrective.model.LoggedSet;
import com.hackathon2026.corrective.model.PainLog;
import com.hackathon2026.corrective.model.Plan;
import com.hackathon2026.corrective.model.PlanExercise;
import com.hackathon2026.corrective.model.Routine;
import com.hackathon2026.corrective.model.RoutineExercise;
import com.hackathon2026.corrective.model.ScheduledWorkout;
import com.hackathon2026.corrective.model.WorkoutLog;
import jakarta.annotation.PostConstruct;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicInteger;
import org.springframework.stereotype.Component;

/**
 * Thread-safe in-memory data store. Acts as the single source of truth for the
 * demo API; seeded with a preset exercise library and sample activity so the
 * dashboard is populated on first load.
 */
@Component
public class DataStore {

    private final Map<Integer, Exercise> exercises = new ConcurrentHashMap<>();
    private final Map<Integer, WorkoutLog> workouts = new ConcurrentHashMap<>();
    private final Map<Integer, PainLog> painLogs = new ConcurrentHashMap<>();
    private final Map<Integer, Routine> routines = new ConcurrentHashMap<>();
    private final Map<Integer, Plan> plans = new ConcurrentHashMap<>();
    private final Map<Integer, ScheduledWorkout> schedule = new ConcurrentHashMap<>();

    private final AtomicInteger exerciseSeq = new AtomicInteger();
    private final AtomicInteger workoutSeq = new AtomicInteger();
    private final AtomicInteger setSeq = new AtomicInteger();
    private final AtomicInteger painSeq = new AtomicInteger();
    private final AtomicInteger routineSeq = new AtomicInteger();
    private final AtomicInteger routineItemSeq = new AtomicInteger();
    private final AtomicInteger planSeq = new AtomicInteger();
    private final AtomicInteger planExerciseSeq = new AtomicInteger();
    private final AtomicInteger scheduleSeq = new AtomicInteger();

    public int nextExerciseId() { return exerciseSeq.incrementAndGet(); }
    public int nextWorkoutId() { return workoutSeq.incrementAndGet(); }
    public int nextSetId() { return setSeq.incrementAndGet(); }
    public int nextPainId() { return painSeq.incrementAndGet(); }
    public int nextRoutineId() { return routineSeq.incrementAndGet(); }
    public int nextRoutineItemId() { return routineItemSeq.incrementAndGet(); }
    public int nextPlanId() { return planSeq.incrementAndGet(); }
    public int nextPlanExerciseId() { return planExerciseSeq.incrementAndGet(); }
    public int nextScheduleId() { return scheduleSeq.incrementAndGet(); }

    public Map<Integer, Exercise> exercises() { return exercises; }
    public Map<Integer, WorkoutLog> workouts() { return workouts; }
    public Map<Integer, PainLog> painLogs() { return painLogs; }
    public Map<Integer, Routine> routines() { return routines; }
    public Map<Integer, Plan> plans() { return plans; }
    public Map<Integer, ScheduledWorkout> schedule() { return schedule; }

    @PostConstruct
    void seed() {
        seedExerciseLibrary();
        seedWorkouts();
        seedPainLogs();
        seedRoutines();
        seedPlans();
        seedSchedule();
    }

    private void addPreset(String name, String category, String muscle, String description) {
        int id = nextExerciseId();
        exercises.put(id, new Exercise(id, name, category, muscle, description, true));
    }

    private void seedExerciseLibrary() {
        addPreset("Back Squat", "Strength", "Legs", "Barbell squat targeting quads and glutes.");
        addPreset("Front Squat", "Strength", "Legs", "Front-racked barbell squat.");
        addPreset("Deadlift", "Strength", "Back", "Hip-hinge pull from the floor.");
        addPreset("Romanian Deadlift", "Strength", "Hamstrings", "Hamstring-focused hip hinge.");
        addPreset("Bench Press", "Strength", "Chest", "Flat barbell chest press.");
        addPreset("Overhead Press", "Strength", "Shoulders", "Standing barbell shoulder press.");
        addPreset("Barbell Row", "Strength", "Back", "Bent-over barbell row.");
        addPreset("Pull-Up", "Strength", "Back", "Bodyweight vertical pull.");
        addPreset("Lat Pulldown", "Strength", "Back", "Cable vertical pull.");
        addPreset("Dumbbell Curl", "Strength", "Arms", "Standing biceps curl.");
        addPreset("Triceps Pushdown", "Strength", "Arms", "Cable triceps extension.");
        addPreset("Leg Press", "Strength", "Legs", "Machine leg press.");
        addPreset("Walking Lunge", "Strength", "Legs", "Alternating forward lunges.");
        addPreset("Running", "Cardio", "Full Body", "Steady-state or interval run.");
        addPreset("Cycling", "Cardio", "Legs", "Stationary or road cycling.");
        addPreset("Rowing", "Cardio", "Full Body", "Erg rowing.");
        addPreset("Incline Walk", "Cardio", "Legs", "Treadmill incline walk.");
        addPreset("Jump Rope", "Cardio", "Full Body", "Skipping intervals.");
        addPreset("Plank", "Core", "Core", "Isometric anti-extension hold.");
        addPreset("Dead Bug", "Core", "Core", "Anti-extension core control drill.");
        addPreset("Bird Dog", "Core", "Core", "Contralateral core stability drill.");
        addPreset("Glute Bridge", "Mobility", "Glutes", "Supine hip extension.");
        addPreset("Hip Flexor Stretch", "Mobility", "Hips", "Half-kneeling hip flexor stretch.");
        addPreset("Thoracic Rotation", "Mobility", "Spine", "Open-book thoracic mobility drill.");
        addPreset("Shoulder Dislocate", "Mobility", "Shoulders", "Band or dowel shoulder mobility.");
        addPreset("Ankle Dorsiflexion", "Mobility", "Ankles", "Knee-to-wall ankle mobility drill.");
        addPreset("Calf Raise", "Strength", "Calves", "Standing calf raise.");
        addPreset("Face Pull", "Strength", "Shoulders", "Cable rear-delt pull.");
    }

    private LoggedSet strengthSet(int workoutId, String name, double weight, int reps, int setNumber) {
        LoggedSet s = new LoggedSet();
        s.id = nextSetId();
        s.workoutLogId = workoutId;
        s.exerciseName = name;
        s.weight = weight;
        s.reps = reps;
        s.setNumber = setNumber;
        return s;
    }

    private LoggedSet cardioSet(int workoutId, String name, double distance, int durationSeconds) {
        LoggedSet s = new LoggedSet();
        s.id = nextSetId();
        s.workoutLogId = workoutId;
        s.exerciseName = name;
        s.distance = distance;
        s.distanceUnit = "km";
        s.durationSeconds = durationSeconds;
        s.setNumber = 1;
        return s;
    }

    private void seedWorkouts() {
        Instant now = Instant.now();

        WorkoutLog lower = new WorkoutLog();
        lower.id = nextWorkoutId();
        lower.name = "Lower Body Strength";
        lower.notes = "Felt strong, no knee pain.";
        lower.performedAt = now.minus(6, ChronoUnit.DAYS);
        lower.createdAt = lower.performedAt;
        lower.sets = new ArrayList<>(List.of(
                strengthSet(lower.id, "Back Squat", 60.0, 8, 1),
                strengthSet(lower.id, "Back Squat", 65.0, 6, 2),
                strengthSet(lower.id, "Back Squat", 70.0, 5, 3),
                strengthSet(lower.id, "Romanian Deadlift", 50.0, 10, 1),
                strengthSet(lower.id, "Glute Bridge", 40.0, 12, 1)));
        workouts.put(lower.id, lower);

        WorkoutLog cardio = new WorkoutLog();
        cardio.id = nextWorkoutId();
        cardio.name = "Zone 2 Run";
        cardio.notes = "Easy conversational pace.";
        cardio.performedAt = now.minus(3, ChronoUnit.DAYS);
        cardio.createdAt = cardio.performedAt;
        cardio.sets = new ArrayList<>(List.of(
                cardioSet(cardio.id, "Running", 5.2, 1800)));
        workouts.put(cardio.id, cardio);

        WorkoutLog upper = new WorkoutLog();
        upper.id = nextWorkoutId();
        upper.name = "Upper Body Push/Pull";
        upper.notes = "";
        upper.performedAt = now.minus(1, ChronoUnit.DAYS);
        upper.createdAt = upper.performedAt;
        upper.sets = new ArrayList<>(List.of(
                strengthSet(upper.id, "Bench Press", 50.0, 8, 1),
                strengthSet(upper.id, "Bench Press", 55.0, 6, 2),
                strengthSet(upper.id, "Barbell Row", 45.0, 8, 1),
                strengthSet(upper.id, "Face Pull", 20.0, 15, 1)));
        workouts.put(upper.id, upper);
    }

    private void seedPainLogs() {
        Instant now = Instant.now();
        int[] levels = {6, 5, 5, 4, 3, 3, 2};
        for (int i = 0; i < levels.length; i++) {
            PainLog p = new PainLog();
            p.id = nextPainId();
            p.level = levels[i];
            p.location = "Lower back";
            p.note = i == 0 ? "Stiff after sitting all day." : "Improving with daily mobility.";
            p.loggedAt = now.minus(levels.length - 1 - i, ChronoUnit.DAYS);
            painLogs.put(p.id, p);
        }
    }

    private void seedRoutines() {
        Routine r = new Routine();
        r.id = nextRoutineId();
        r.name = "Lower Body Rehab";
        r.description = "Knee-friendly strength and mobility circuit.";
        RoutineExercise a = new RoutineExercise();
        a.id = nextRoutineItemId();
        a.routineId = r.id;
        a.exerciseName = "Glute Bridge";
        a.targetSets = 3;
        a.targetReps = 12;
        a.orderIndex = 0;
        RoutineExercise b = new RoutineExercise();
        b.id = nextRoutineItemId();
        b.routineId = r.id;
        b.exerciseName = "Walking Lunge";
        b.targetSets = 3;
        b.targetReps = 10;
        b.orderIndex = 1;
        RoutineExercise c = new RoutineExercise();
        c.id = nextRoutineItemId();
        c.routineId = r.id;
        c.exerciseName = "Hip Flexor Stretch";
        c.targetSets = 2;
        c.targetReps = 30;
        c.orderIndex = 2;
        r.items = new ArrayList<>(List.of(a, b, c));
        routines.put(r.id, r);
    }

    private void seedPlans() {
        Plan plan = new Plan();
        plan.id = nextPlanId();
        plan.title = "Lower Back Recovery Plan";
        plan.professionalName = "Dr. Alex Rivera, PT";
        plan.notes = "Progress gradually. Stop if sharp pain occurs.";
        plan.sourceText = "Daily core stability and hip mobility for 4 weeks.";

        PlanExercise pe1 = new PlanExercise();
        pe1.id = nextPlanExerciseId();
        pe1.planId = plan.id;
        pe1.name = "Dead Bug";
        pe1.sets = 3;
        pe1.reps = 10;
        pe1.frequency = "Daily";
        setDays(pe1, List.of(1, 2, 3, 4, 5));
        pe1.reminderTime = "08:00";
        pe1.instructions = "Keep lower back flat against the floor.";

        PlanExercise pe2 = new PlanExercise();
        pe2.id = nextPlanExerciseId();
        pe2.planId = plan.id;
        pe2.name = "Bird Dog";
        pe2.sets = 3;
        pe2.reps = 8;
        pe2.frequency = "Daily";
        setDays(pe2, List.of(1, 3, 5));
        pe2.reminderTime = "08:15";
        pe2.instructions = "Move slowly and avoid rotating the hips.";

        plan.exercises = new ArrayList<>(List.of(pe1, pe2));
        plans.put(plan.id, plan);
    }

    /** Sets both the comma-separated string and parsed list day representations. */
    public void setDays(PlanExercise pe, List<Integer> days) {
        if (days == null) {
            pe.daysOfWeek = null;
            pe.daysOfWeekList = new ArrayList<>();
            return;
        }
        pe.daysOfWeekList = new ArrayList<>(days);
        StringBuilder sb = new StringBuilder();
        for (int i = 0; i < days.size(); i++) {
            if (i > 0) sb.append(",");
            sb.append(days.get(i));
        }
        pe.daysOfWeek = sb.toString();
    }

    private void seedSchedule() {
        ScheduledWorkout s1 = new ScheduledWorkout();
        s1.id = nextScheduleId();
        s1.title = "Lower Body Rehab";
        s1.dayOfWeek = 1;
        s1.time = "07:30";
        s1.notes = "Warm up thoroughly.";
        schedule.put(s1.id, s1);

        ScheduledWorkout s2 = new ScheduledWorkout();
        s2.id = nextScheduleId();
        s2.title = "Zone 2 Run";
        s2.dayOfWeek = 3;
        s2.time = "18:00";
        s2.notes = "";
        schedule.put(s2.id, s2);

        ScheduledWorkout s3 = new ScheduledWorkout();
        s3.id = nextScheduleId();
        s3.title = "Upper Body Push/Pull";
        s3.dayOfWeek = 5;
        s3.time = "07:30";
        s3.notes = "";
        schedule.put(s3.id, s3);
    }

    /** Sorted snapshot helpers used by controllers. */
    public List<Exercise> exercisesSorted() {
        List<Exercise> list = new ArrayList<>(exercises.values());
        list.sort(Comparator.comparing((Exercise e) -> e.name.toLowerCase()));
        return list;
    }

    public List<WorkoutLog> workoutsSorted() {
        List<WorkoutLog> list = new ArrayList<>(workouts.values());
        list.sort(Comparator.comparing((WorkoutLog w) -> w.performedAt).reversed());
        return list;
    }

    public List<PainLog> painLogsSorted() {
        List<PainLog> list = new ArrayList<>(painLogs.values());
        list.sort(Comparator.comparing((PainLog p) -> p.loggedAt).reversed());
        return list;
    }

    public List<Routine> routinesSorted() {
        List<Routine> list = new ArrayList<>(routines.values());
        list.sort(Comparator.comparing((Routine r) -> r.createdAt).reversed());
        return list;
    }

    public List<Plan> plansSorted() {
        List<Plan> list = new ArrayList<>(plans.values());
        list.sort(Comparator.comparing((Plan p) -> p.createdAt).reversed());
        return list;
    }

    public List<ScheduledWorkout> scheduleSorted() {
        List<ScheduledWorkout> list = new ArrayList<>(schedule.values());
        list.sort(Comparator.comparingInt((ScheduledWorkout s) -> s.dayOfWeek));
        return list;
    }
}
