package com.hackathon2026.corrective.controller;

import com.hackathon2026.corrective.dto.LoggedSetRequest;
import com.hackathon2026.corrective.dto.WorkoutRequest;
import com.hackathon2026.corrective.error.NotFoundException;
import com.hackathon2026.corrective.model.LoggedSet;
import com.hackathon2026.corrective.model.WorkoutLog;
import com.hackathon2026.corrective.store.DataStore;
import jakarta.validation.Valid;
import java.time.Instant;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/workouts")
public class WorkoutController {

    private final DataStore store;

    public WorkoutController(DataStore store) {
        this.store = store;
    }

    @GetMapping
    public List<WorkoutLog> list() {
        return store.workoutsSorted();
    }

    @GetMapping("/{id}")
    public WorkoutLog get(@PathVariable int id) {
        WorkoutLog w = store.workouts().get(id);
        if (w == null) {
            throw new NotFoundException("Workout " + id + " not found");
        }
        return w;
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public WorkoutLog create(@Valid @RequestBody WorkoutRequest req) {
        WorkoutLog w = new WorkoutLog();
        w.id = store.nextWorkoutId();
        w.name = req.name() == null || req.name().isBlank() ? "Workout" : req.name().trim();
        w.notes = req.notes();
        w.performedAt = req.performedAt() != null ? req.performedAt() : Instant.now();
        w.createdAt = Instant.now();
        if (req.sets() != null) {
            int index = 1;
            for (LoggedSetRequest sr : req.sets()) {
                LoggedSet s = new LoggedSet();
                s.id = store.nextSetId();
                s.workoutLogId = w.id;
                s.exerciseName = sr.exerciseName();
                s.weight = sr.weight();
                s.reps = sr.reps();
                s.distance = sr.distance();
                s.distanceUnit = sr.distanceUnit() != null ? sr.distanceUnit() : "km";
                s.durationSeconds = sr.durationSeconds();
                s.setNumber = sr.setNumber() != null ? sr.setNumber() : index;
                s.createdAt = w.performedAt;
                w.sets.add(s);
                index++;
            }
        }
        store.workouts().put(w.id, w);
        return w;
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable int id) {
        if (store.workouts().remove(id) == null) {
            throw new NotFoundException("Workout " + id + " not found");
        }
        return ResponseEntity.noContent().build();
    }
}
