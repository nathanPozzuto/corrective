package com;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.context.annotation.Bean;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

import java.math.BigDecimal;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.sql.Timestamp;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.*;

/**
 * Recovery Tracker backend.
 *
 * The whole Spring Boot application lives in this one file (matching the
 * `com/` single-file layout): the entry point, a session helper, and one
 * REST controller per feature. All queries scope by userId — there is no
 * row-level security — mirroring the original Next.js server actions.
 */
@SpringBootApplication
public class App {
    public static void main(String[] args) {
        SpringApplication.run(App.class, args);
    }

    /** Allow the static frontend (any origin) to call the API. Auth is via
     *  bearer token, not cookies, so credentials are not required. */
    @Bean
    WebMvcConfigurer corsConfig() {
        return new WebMvcConfigurer() {
            @Override
            public void addCorsMappings(CorsRegistry registry) {
                registry.addMapping("/**")
                        .allowedOrigins("*")
                        .allowedMethods("GET", "POST", "PUT", "DELETE", "OPTIONS")
                        .allowedHeaders("*");
            }
        };
    }

    @Bean
    BCryptPasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }
}

/* ---------------------------------------------------------------------------
 * Session helper — resolves the current user from a bearer token or cookie.
 * ------------------------------------------------------------------------ */
@Component
class Sessions {
    private final JdbcTemplate jt;

    Sessions(JdbcTemplate jt) {
        this.jt = jt;
    }

    /** Returns the userId for the request, or throws 401. */
    String requireUserId(HttpServletRequest req) {
        String token = extractToken(req);
        if (token == null) throw unauthorized();
        try {
            List<Map<String, Object>> rows = jt.queryForList(
                    "select \"userId\", \"expiresAt\" from \"session\" where token = ?", token);
            if (rows.isEmpty()) throw unauthorized();
            Object expires = rows.get(0).get("expiresAt");
            if (expires instanceof Timestamp ts && ts.toInstant().isBefore(Instant.now())) {
                throw unauthorized();
            }
            return (String) rows.get(0).get("userId");
        } catch (ResponseStatusException e) {
            throw e;
        } catch (Exception e) {
            throw unauthorized();
        }
    }

    private String extractToken(HttpServletRequest req) {
        String auth = req.getHeader("Authorization");
        if (auth != null && auth.startsWith("Bearer ")) {
            return auth.substring(7).trim();
        }
        if (req.getCookies() != null) {
            for (var c : req.getCookies()) {
                if ("session_token".equals(c.getName())) return c.getValue();
            }
        }
        return null;
    }

    static ResponseStatusException unauthorized() {
        return new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Unauthorized");
    }
}

/* ---------------------------------------------------------------------------
 * Small value helpers for pulling typed values out of JSON request bodies.
 * ------------------------------------------------------------------------ */
final class V {
    static String str(Object o) {
        if (o == null) return null;
        String s = String.valueOf(o).trim();
        return s.isEmpty() ? null : s;
    }

    static Integer intOrNull(Object o) {
        if (o == null) return null;
        if (o instanceof Number n) return n.intValue();
        try {
            return (int) Math.round(Double.parseDouble(String.valueOf(o)));
        } catch (NumberFormatException e) {
            return null;
        }
    }

    static Double dblOrNull(Object o) {
        if (o == null) return null;
        if (o instanceof Number n) return n.doubleValue();
        try {
            return Double.parseDouble(String.valueOf(o));
        } catch (NumberFormatException e) {
            return null;
        }
    }

    @SuppressWarnings("unchecked")
    static List<Map<String, Object>> listOfMaps(Object o) {
        if (o instanceof List<?> l) {
            List<Map<String, Object>> out = new ArrayList<>();
            for (Object item : l) if (item instanceof Map<?, ?> m) out.add((Map<String, Object>) m);
            return out;
        }
        return List.of();
    }
}

/* ---------------------------------------------------------------------------
 * Auth: email + password sign-up / sign-in / sign-out / me.
 * Uses the existing Better Auth tables (user / account / session), but hashes
 * passwords with BCrypt. Accounts created here are managed by this backend.
 * ------------------------------------------------------------------------ */
@RestController
@RequestMapping("/api/auth")
class AuthController {
    private final JdbcTemplate jt;
    private final BCryptPasswordEncoder encoder;
    private final Sessions sessions;

    AuthController(JdbcTemplate jt, BCryptPasswordEncoder encoder, Sessions sessions) {
        this.jt = jt;
        this.encoder = encoder;
        this.sessions = sessions;
    }

    @PostMapping("/sign-up")
    Map<String, Object> signUp(@RequestBody Map<String, Object> body) {
        String name = V.str(body.get("name"));
        String email = V.str(body.get("email"));
        String password = V.str(body.get("password"));
        if (name == null || email == null || password == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Name, email and password are required");
        }
        if (password.length() < 8) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Password must be at least 8 characters");
        }
        email = email.toLowerCase();

        Integer exists = jt.queryForObject(
                "select count(*) from \"user\" where lower(email) = ?", Integer.class, email);
        if (exists != null && exists > 0) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "An account with this email already exists");
        }

        String userId = UUID.randomUUID().toString();
        Timestamp now = Timestamp.from(Instant.now());
        jt.update("insert into \"user\" (id, name, email, \"emailVerified\", \"createdAt\", \"updatedAt\") " +
                "values (?, ?, ?, false, ?, ?)", userId, name, email, now, now);

        jt.update("insert into account (id, \"accountId\", \"providerId\", \"userId\", password, \"createdAt\", \"updatedAt\") " +
                        "values (?, ?, 'credential', ?, ?, ?, ?)",
                UUID.randomUUID().toString(), email, userId, encoder.encode(password), now, now);

        String token = newSession(userId);
        return Map.of("token", token, "user", Map.of("id", userId, "name", name, "email", email));
    }

    @PostMapping("/sign-in")
    Map<String, Object> signIn(@RequestBody Map<String, Object> body) {
        String email = V.str(body.get("email"));
        String password = V.str(body.get("password"));
        if (email == null || password == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Email and password are required");
        }
        email = email.toLowerCase();

        List<Map<String, Object>> users = jt.queryForList(
                "select id, name, email from \"user\" where lower(email) = ?", email);
        if (users.isEmpty()) throw badCredentials();
        String userId = (String) users.get(0).get("id");

        List<Map<String, Object>> accounts = jt.queryForList(
                "select password from account where \"userId\" = ? and \"providerId\" = 'credential'", userId);
        if (accounts.isEmpty() || accounts.get(0).get("password") == null) throw badCredentials();
        String hash = (String) accounts.get(0).get("password");
        if (!encoder.matches(password, hash)) throw badCredentials();

        String token = newSession(userId);
        return Map.of("token", token, "user", Map.of(
                "id", userId, "name", users.get(0).get("name"), "email", users.get(0).get("email")));
    }

    @PostMapping("/sign-out")
    Map<String, Object> signOut(HttpServletRequest req) {
        String auth = req.getHeader("Authorization");
        if (auth != null && auth.startsWith("Bearer ")) {
            jt.update("delete from \"session\" where token = ?", auth.substring(7).trim());
        }
        return Map.of("ok", true);
    }

    @GetMapping("/me")
    Map<String, Object> me(HttpServletRequest req) {
        String userId = sessions.requireUserId(req);
        List<Map<String, Object>> users = jt.queryForList(
                "select id, name, email from \"user\" where id = ?", userId);
        if (users.isEmpty()) throw Sessions.unauthorized();
        return Map.of("user", users.get(0));
    }

    private String newSession(String userId) {
        String id = UUID.randomUUID().toString();
        String token = UUID.randomUUID().toString() + UUID.randomUUID().toString();
        Timestamp now = Timestamp.from(Instant.now());
        Timestamp expires = Timestamp.from(Instant.now().plus(30, ChronoUnit.DAYS));
        jt.update("insert into \"session\" (id, \"expiresAt\", token, \"createdAt\", \"updatedAt\", \"userId\") " +
                "values (?, ?, ?, ?, ?, ?)", id, expires, token, now, now, userId);
        return token;
    }

    private ResponseStatusException badCredentials() {
        return new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid email or password");
    }
}

/* ---------------------------------------------------------------------------
 * Exercises: preset library + the user's custom exercises.
 * ------------------------------------------------------------------------ */
@RestController
@RequestMapping("/api/exercises")
class ExercisesController {
    private final JdbcTemplate jt;
    private final Sessions sessions;

    ExercisesController(JdbcTemplate jt, Sessions sessions) {
        this.jt = jt;
        this.sessions = sessions;
    }

    @GetMapping
    List<Map<String, Object>> list(HttpServletRequest req) {
        String userId = sessions.requireUserId(req);
        return jt.queryForList(
                "select * from exercises where \"isPreset\" = true or \"userId\" = ? order by name asc", userId);
    }

    @PostMapping
    Map<String, Object> create(HttpServletRequest req, @RequestBody Map<String, Object> body) {
        String userId = sessions.requireUserId(req);
        String name = V.str(body.get("name"));
        if (name == null) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Name is required");
        String category = V.str(body.get("category"));
        jt.update("insert into exercises (\"userId\", name, category, \"muscleGroup\", description, \"isPreset\") " +
                        "values (?, ?, ?, ?, ?, false)",
                userId, name, category == null ? "Custom" : category,
                V.str(body.get("muscleGroup")), V.str(body.get("description")));
        return Map.of("ok", true);
    }

    @DeleteMapping("/{id}")
    Map<String, Object> delete(HttpServletRequest req, @PathVariable int id) {
        String userId = sessions.requireUserId(req);
        jt.update("delete from exercises where id = ? and \"userId\" = ? and \"isPreset\" = false", id, userId);
        return Map.of("ok", true);
    }
}

/* ---------------------------------------------------------------------------
 * Workouts: logged sessions with their individual sets.
 * ------------------------------------------------------------------------ */
@RestController
@RequestMapping("/api/workouts")
class WorkoutsController {
    private final JdbcTemplate jt;
    private final Sessions sessions;

    WorkoutsController(JdbcTemplate jt, Sessions sessions) {
        this.jt = jt;
        this.sessions = sessions;
    }

    @GetMapping
    List<Map<String, Object>> list(HttpServletRequest req) {
        String userId = sessions.requireUserId(req);
        List<Map<String, Object>> logs = jt.queryForList(
                "select * from workout_logs where \"userId\" = ? order by \"performedAt\" desc", userId);
        List<Map<String, Object>> sets = jt.queryForList(
                "select * from logged_sets where \"userId\" = ? order by \"setNumber\" asc", userId);
        for (Map<String, Object> log : logs) {
            Object logId = log.get("id");
            List<Map<String, Object>> own = new ArrayList<>();
            for (Map<String, Object> s : sets) {
                if (Objects.equals(s.get("workoutLogId"), logId)) own.add(s);
            }
            log.put("sets", own);
        }
        return logs;
    }

    @PostMapping
    Map<String, Object> create(HttpServletRequest req, @RequestBody Map<String, Object> body) {
        String userId = sessions.requireUserId(req);
        List<Map<String, Object>> sets = V.listOfMaps(body.get("sets"));
        List<Map<String, Object>> clean = new ArrayList<>();
        for (Map<String, Object> s : sets) if (V.str(s.get("exerciseName")) != null) clean.add(s);
        if (clean.isEmpty()) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Add at least one set");

        Timestamp performedAt = Timestamp.from(Instant.now());
        Integer logId = jt.queryForObject(
                "insert into workout_logs (\"userId\", name, notes, \"performedAt\") values (?, ?, ?, ?) returning id",
                Integer.class, userId, V.str(body.get("name")), V.str(body.get("notes")), performedAt);

        int i = 1;
        for (Map<String, Object> s : clean) {
            Double weight = V.dblOrNull(s.get("weight"));
            Integer setNumber = V.intOrNull(s.get("setNumber"));
            jt.update("insert into logged_sets (\"userId\", \"workoutLogId\", \"exerciseName\", weight, reps, \"setNumber\") " +
                            "values (?, ?, ?, ?, ?, ?)",
                    userId, logId, V.str(s.get("exerciseName")),
                    weight == null ? null : new BigDecimal(weight.toString()),
                    V.intOrNull(s.get("reps")), setNumber == null ? i : setNumber);
            i++;
        }
        return Map.of("id", logId);
    }

    @DeleteMapping("/{id}")
    Map<String, Object> delete(HttpServletRequest req, @PathVariable int id) {
        String userId = sessions.requireUserId(req);
        jt.update("delete from logged_sets where \"workoutLogId\" = ? and \"userId\" = ?", id, userId);
        jt.update("delete from workout_logs where id = ? and \"userId\" = ?", id, userId);
        return Map.of("ok", true);
    }
}

/* ---------------------------------------------------------------------------
 * Routines: reusable workout templates built from exercises.
 * ------------------------------------------------------------------------ */
@RestController
@RequestMapping("/api/routines")
class RoutinesController {
    private final JdbcTemplate jt;
    private final Sessions sessions;

    RoutinesController(JdbcTemplate jt, Sessions sessions) {
        this.jt = jt;
        this.sessions = sessions;
    }

    @GetMapping
    List<Map<String, Object>> list(HttpServletRequest req) {
        String userId = sessions.requireUserId(req);
        List<Map<String, Object>> routines = jt.queryForList(
                "select * from routines where \"userId\" = ? order by \"createdAt\" desc", userId);
        List<Map<String, Object>> items = jt.queryForList(
                "select * from routine_exercises where \"userId\" = ? order by \"orderIndex\" asc", userId);
        for (Map<String, Object> r : routines) {
            Object rid = r.get("id");
            List<Map<String, Object>> own = new ArrayList<>();
            for (Map<String, Object> it : items) if (Objects.equals(it.get("routineId"), rid)) own.add(it);
            r.put("exercises", own);
        }
        return routines;
    }

    @PostMapping
    Map<String, Object> create(HttpServletRequest req, @RequestBody Map<String, Object> body) {
        String userId = sessions.requireUserId(req);
        String name = V.str(body.get("name"));
        if (name == null) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Routine name is required");
        List<Map<String, Object>> exercises = V.listOfMaps(body.get("exercises"));
        List<Map<String, Object>> clean = new ArrayList<>();
        for (Map<String, Object> e : exercises) if (V.str(e.get("exerciseName")) != null) clean.add(e);
        if (clean.isEmpty()) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Add at least one exercise");

        Integer routineId = jt.queryForObject(
                "insert into routines (\"userId\", name, description) values (?, ?, ?) returning id",
                Integer.class, userId, name, V.str(body.get("description")));

        int i = 0;
        for (Map<String, Object> e : clean) {
            jt.update("insert into routine_exercises (\"userId\", \"routineId\", \"exerciseName\", \"targetSets\", \"targetReps\", \"orderIndex\") " +
                            "values (?, ?, ?, ?, ?, ?)",
                    userId, routineId, V.str(e.get("exerciseName")),
                    V.intOrNull(e.get("targetSets")), V.intOrNull(e.get("targetReps")), i);
            i++;
        }
        return Map.of("id", routineId);
    }

    @DeleteMapping("/{id}")
    Map<String, Object> delete(HttpServletRequest req, @PathVariable int id) {
        String userId = sessions.requireUserId(req);
        jt.update("delete from routine_exercises where \"routineId\" = ? and \"userId\" = ?", id, userId);
        jt.update("delete from routines where id = ? and \"userId\" = ?", id, userId);
        return Map.of("ok", true);
    }
}

/* ---------------------------------------------------------------------------
 * Pain: slider entries tracked over time for recovery.
 * ------------------------------------------------------------------------ */
@RestController
@RequestMapping("/api/pain")
class PainController {
    private final JdbcTemplate jt;
    private final Sessions sessions;

    PainController(JdbcTemplate jt, Sessions sessions) {
        this.jt = jt;
        this.sessions = sessions;
    }

    @GetMapping
    List<Map<String, Object>> list(HttpServletRequest req,
                                   @RequestParam(defaultValue = "90") int days) {
        String userId = sessions.requireUserId(req);
        Timestamp since = Timestamp.from(Instant.now().minus(days, ChronoUnit.DAYS));
        return jt.queryForList(
                "select * from pain_logs where \"userId\" = ? and \"loggedAt\" >= ? order by \"loggedAt\" desc",
                userId, since);
    }

    @PostMapping
    Map<String, Object> create(HttpServletRequest req, @RequestBody Map<String, Object> body) {
        String userId = sessions.requireUserId(req);
        Integer raw = V.intOrNull(body.get("level"));
        int level = Math.max(0, Math.min(10, raw == null ? 0 : raw));
        jt.update("insert into pain_logs (\"userId\", level, location, note) values (?, ?, ?, ?)",
                userId, level, V.str(body.get("location")), V.str(body.get("note")));
        return Map.of("ok", true);
    }

    @DeleteMapping("/{id}")
    Map<String, Object> delete(HttpServletRequest req, @PathVariable int id) {
        String userId = sessions.requireUserId(req);
        jt.update("delete from pain_logs where id = ? and \"userId\" = ?", id, userId);
        return Map.of("ok", true);
    }
}

/* ---------------------------------------------------------------------------
 * Schedule: workouts assigned to specific days of the week.
 * ------------------------------------------------------------------------ */
@RestController
@RequestMapping("/api/schedule")
class ScheduleController {
    private final JdbcTemplate jt;
    private final Sessions sessions;

    ScheduleController(JdbcTemplate jt, Sessions sessions) {
        this.jt = jt;
        this.sessions = sessions;
    }

    @GetMapping
    List<Map<String, Object>> list(HttpServletRequest req) {
        String userId = sessions.requireUserId(req);
        return jt.queryForList(
                "select * from scheduled_workouts where \"userId\" = ? order by \"dayOfWeek\" asc, time asc", userId);
    }

    @PostMapping
    Map<String, Object> create(HttpServletRequest req, @RequestBody Map<String, Object> body) {
        String userId = sessions.requireUserId(req);
        String title = V.str(body.get("title"));
        if (title == null) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "A workout title is required");
        Integer dayOfWeek = V.intOrNull(body.get("dayOfWeek"));
        if (dayOfWeek == null || dayOfWeek < 0 || dayOfWeek > 6) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Pick a valid day of the week");
        }
        Integer routineId = V.intOrNull(body.get("routineId"));
        Integer id = jt.queryForObject(
                "insert into scheduled_workouts (\"userId\", \"routineId\", title, \"dayOfWeek\", time, notes) " +
                        "values (?, ?, ?, ?, ?, ?) returning id",
                Integer.class, userId, routineId, title, dayOfWeek,
                V.str(body.get("time")), V.str(body.get("notes")));
        return Map.of("id", id);
    }

    @DeleteMapping("/{id}")
    Map<String, Object> delete(HttpServletRequest req, @PathVariable int id) {
        String userId = sessions.requireUserId(req);
        jt.update("delete from scheduled_workouts where id = ? and \"userId\" = ?", id, userId);
        return Map.of("ok", true);
    }
}

/* ---------------------------------------------------------------------------
 * Plans: rehab plans (often from a scanned PT handout) with prescribed
 * exercises and reminder metadata.
 * ------------------------------------------------------------------------ */
@RestController
@RequestMapping("/api/plans")
class PlansController {
    private final JdbcTemplate jt;
    private final Sessions sessions;

    PlansController(JdbcTemplate jt, Sessions sessions) {
        this.jt = jt;
        this.sessions = sessions;
    }

    @GetMapping
    List<Map<String, Object>> list(HttpServletRequest req) {
        String userId = sessions.requireUserId(req);
        List<Map<String, Object>> plans = jt.queryForList(
                "select * from plans where \"userId\" = ? order by \"createdAt\" desc", userId);
        List<Map<String, Object>> items = jt.queryForList(
                "select * from plan_exercises where \"userId\" = ? order by id asc", userId);
        for (Map<String, Object> p : plans) {
            Object pid = p.get("id");
            List<Map<String, Object>> own = new ArrayList<>();
            for (Map<String, Object> it : items) {
                if (Objects.equals(it.get("planId"), pid)) {
                    Object dow = it.get("daysOfWeek");
                    List<String> daysList = new ArrayList<>();
                    if (dow != null && !String.valueOf(dow).isBlank()) {
                        daysList = Arrays.asList(String.valueOf(dow).split(","));
                    }
                    it.put("daysOfWeekList", daysList);
                    own.add(it);
                }
            }
            p.put("exercises", own);
        }
        return plans;
    }

    @PostMapping
    Map<String, Object> create(HttpServletRequest req, @RequestBody Map<String, Object> body) {
        String userId = sessions.requireUserId(req);
        String title = V.str(body.get("title"));
        if (title == null) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Plan title is required");

        Integer planId = jt.queryForObject(
                "insert into plans (\"userId\", title, \"professionalName\", notes, \"sourceText\") " +
                        "values (?, ?, ?, ?, ?) returning id",
                Integer.class, userId, title, V.str(body.get("professionalName")),
                V.str(body.get("notes")), V.str(body.get("sourceText")));

        for (Map<String, Object> e : V.listOfMaps(body.get("exercises"))) {
            String name = V.str(e.get("name"));
            if (name == null) continue;
            String days = null;
            Object dow = e.get("daysOfWeek");
            if (dow instanceof List<?> l && !l.isEmpty()) {
                List<String> parts = new ArrayList<>();
                for (Object d : l) parts.add(String.valueOf(d));
                days = String.join(",", parts);
            }
            jt.update("insert into plan_exercises (\"userId\", \"planId\", name, sets, reps, frequency, \"daysOfWeek\", \"reminderTime\", instructions) " +
                            "values (?, ?, ?, ?, ?, ?, ?, ?, ?)",
                    userId, planId, name, V.intOrNull(e.get("sets")), V.intOrNull(e.get("reps")),
                    V.str(e.get("frequency")), days, V.str(e.get("reminderTime")), V.str(e.get("instructions")));
        }
        return Map.of("id", planId);
    }

    @DeleteMapping("/{id}")
    Map<String, Object> delete(HttpServletRequest req, @PathVariable int id) {
        String userId = sessions.requireUserId(req);
        jt.update("delete from plan_exercises where \"planId\" = ? and \"userId\" = ?", id, userId);
        jt.update("delete from plans where id = ? and \"userId\" = ?", id, userId);
        return Map.of("ok", true);
    }
}

/* ---------------------------------------------------------------------------
 * Scan handout: sends text/image to the AI Gateway (OpenAI-compatible) and
 * returns extracted plan data. Requires AI_GATEWAY_API_KEY to be set.
 * ------------------------------------------------------------------------ */
@RestController
@RequestMapping("/api/scan-handout")
class ScanController {
    private final Sessions sessions;
    private final ObjectMapper mapper = new ObjectMapper();
    private final HttpClient http = HttpClient.newHttpClient();

    @Value("${ai.gateway.key}")
    private String gatewayKey;
    @Value("${ai.gateway.url}")
    private String gatewayUrl;
    @Value("${ai.gateway.model}")
    private String gatewayModel;

    ScanController(Sessions sessions) {
        this.sessions = sessions;
    }

    @PostMapping
    JsonNode scan(HttpServletRequest req, @RequestBody Map<String, Object> body) {
        sessions.requireUserId(req);
        String text = V.str(body.get("text"));
        String imageDataUrl = V.str(body.get("imageDataUrl"));
        if (text == null && imageDataUrl == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Provide handout text or an image");
        }
        if (gatewayKey == null || gatewayKey.isBlank()) {
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE,
                    "AI scanning is not configured. Set AI_GATEWAY_API_KEY on the backend.");
        }

        String instruction = "You are a medical rehab assistant. Extract the prescribed exercises from this " +
                "physical therapy / physiotherapy handout. Capture the exercise name, sets, reps, frequency, and any " +
                "instructions exactly as prescribed. Respond ONLY with a JSON object of the form " +
                "{\"title\":string,\"professionalName\":string|null,\"notes\":string|null," +
                "\"exercises\":[{\"name\":string,\"sets\":number|null,\"reps\":number|null," +
                "\"frequency\":string|null,\"instructions\":string|null}]}. " +
                "Use null when a value is not specified. Do not invent exercises that are not present.";

        try {
            ObjectNode payload = mapper.createObjectNode();
            payload.put("model", gatewayModel);
            payload.putObject("response_format").put("type", "json_object");

            ArrayNode messages = payload.putArray("messages");
            ObjectNode userMsg = messages.addObject();
            userMsg.put("role", "user");
            ArrayNode content = userMsg.putArray("content");
            content.addObject().put("type", "text").put("text", instruction);
            if (text != null) {
                content.addObject().put("type", "text").put("text", "Handout text:\n" + text);
            }
            if (imageDataUrl != null) {
                ObjectNode img = content.addObject();
                img.put("type", "image_url");
                img.putObject("image_url").put("url", imageDataUrl);
            }

            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(gatewayUrl))
                    .header("Authorization", "Bearer " + gatewayKey)
                    .header("Content-Type", "application/json")
                    .POST(HttpRequest.BodyPublishers.ofString(mapper.writeValueAsString(payload)))
                    .build();

            HttpResponse<String> resp = http.send(request, HttpResponse.BodyHandlers.ofString());
            if (resp.statusCode() / 100 != 2) {
                throw new RuntimeException("Gateway returned " + resp.statusCode() + ": " + resp.body());
            }
            JsonNode root = mapper.readTree(resp.body());
            String contentStr = root.path("choices").path(0).path("message").path("content").asText("");
            return mapper.readTree(contentStr);
        } catch (Exception e) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR,
                    "Could not read the handout. Try clearer text or a sharper image.");
        }
    }
}
