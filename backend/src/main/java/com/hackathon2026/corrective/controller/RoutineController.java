package com.hackathon2026.corrective.controller;

import com.hackathon2026.corrective.dto.RoutineExerciseRequest;
import com.hackathon2026.corrective.dto.RoutineRequest;
import com.hackathon2026.corrective.error.NotFoundException;
import com.hackathon2026.corrective.model.Routine;
import com.hackathon2026.corrective.model.RoutineExercise;
import com.hackathon2026.corrective.store.DataStore;
import jakarta.validation.Valid;
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
@RequestMapping("/api/routines")
public class RoutineController {

    private final DataStore store;

    public RoutineController(DataStore store) {
        this.store = store;
    }

    @GetMapping
    public List<Routine> list() {
        return store.routinesSorted();
    }

    @GetMapping("/{id}")
    public Routine get(@PathVariable int id) {
        Routine r = store.routines().get(id);
        if (r == null) {
            throw new NotFoundException("Routine " + id + " not found");
        }
        return r;
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public Routine create(@Valid @RequestBody RoutineRequest req) {
        Routine r = new Routine();
        r.id = store.nextRoutineId();
        r.name = req.name().trim();
        r.description = req.description();
        if (req.items() != null) {
            int index = 0;
            for (RoutineExerciseRequest ir : req.items()) {
                RoutineExercise item = new RoutineExercise();
                item.id = store.nextRoutineItemId();
                item.routineId = r.id;
                item.exerciseName = ir.exerciseName();
                item.targetSets = ir.targetSets();
                item.targetReps = ir.targetReps();
                item.orderIndex = ir.position() != null ? ir.position() : index;
                r.items.add(item);
                index++;
            }
        }
        store.routines().put(r.id, r);
        return r;
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable int id) {
        if (store.routines().remove(id) == null) {
            throw new NotFoundException("Routine " + id + " not found");
        }
        return ResponseEntity.noContent().build();
    }
}
