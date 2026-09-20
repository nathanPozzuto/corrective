package com.hackathon2026.corrective.controller;

import com.hackathon2026.corrective.dto.ExerciseHistoryPoint;
import com.hackathon2026.corrective.dto.ExerciseRequest;
import com.hackathon2026.corrective.error.NotFoundException;
import com.hackathon2026.corrective.model.Exercise;
import com.hackathon2026.corrective.model.LoggedSet;
import com.hackathon2026.corrective.model.WorkoutLog;
import com.hackathon2026.corrective.store.DataStore;
import jakarta.validation.Valid;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api")
public class ExerciseController {

    private final DataStore store;

    public ExerciseController(DataStore store) {
        this.store = store;
    }

    @GetMapping("/exercises")
    public List<Exercise> list() {
        return store.exercisesSorted();
    }

    @PostMapping("/exercises")
    @ResponseStatus(HttpStatus.CREATED)
    public Exercise create(@Valid @RequestBody ExerciseRequest req) {
        int id = store.nextExerciseId();
        Exercise e = new Exercise(id, req.name().trim(), req.category(), req.muscleGroup(),
                req.description(), false);
        store.exercises().put(id, e);
        return e;
    }

    @DeleteMapping("/exercises/{id}")
    public ResponseEntity<Void> delete(@PathVariable int id) {
        Exercise existing = store.exercises().get(id);
        if (existing == null) {
            throw new NotFoundException("Exercise " + id + " not found");
        }
        if (existing.isPreset) {
            throw new IllegalArgumentException("Preset exercises cannot be deleted");
        }
        store.exercises().remove(id);
        return ResponseEntity.noContent().build();
    }

    /**
     * History for a single exercise. Uses a query parameter instead of a path
     * variable because exercise names can contain spaces and special characters.
     */
    @GetMapping("/exercise-history")
    public List<ExerciseHistoryPoint> history(@RequestParam("name") String name) {
        List<ExerciseHistoryPoint> points = new ArrayList<>();
        for (WorkoutLog w : store.workouts().values()) {
            for (LoggedSet s : w.sets) {
                if (s.exerciseName != null && s.exerciseName.equalsIgnoreCase(name)) {
                    points.add(new ExerciseHistoryPoint(s.weight, s.reps, s.createdAt));
                }
            }
        }
        points.sort(Comparator.comparing(ExerciseHistoryPoint::createdAt));
        return points;
    }
}
