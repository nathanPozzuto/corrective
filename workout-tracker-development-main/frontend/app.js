/* Recovery Tracker — vanilla JS client for the Spring Boot backend.
 * All state lives on the server; this file handles auth, fetching, and
 * rendering each view into #main. Auth uses a bearer token in localStorage. */

const API_BASE = localStorage.getItem("api_base") || "http://localhost:8080";
const TOKEN_KEY = "recovery_token";
const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

let token = localStorage.getItem(TOKEN_KEY) || null;
let currentUser = null;
let signUpMode = false;

/* --- API helper ----------------------------------------------------------- */
async function api(path, { method = "GET", body } = {}) {
  const headers = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: body != null ? JSON.stringify(body) : undefined,
  });
  if (res.status === 401) {
    signOut();
    throw new Error("Your session expired. Please sign in again.");
  }
  const text = await res.text();
  const data = text ? JSON.parse(text) : null;
  if (!res.ok) {
    throw new Error((data && (data.message || data.error)) || "Something went wrong");
  }
  return data;
}

/* --- Small DOM utilities -------------------------------------------------- */
const $ = (sel) => document.querySelector(sel);
const el = (html) => {
  const t = document.createElement("template");
  t.innerHTML = html.trim();
  return t.content.firstChild;
};
const esc = (s) =>
  String(s ?? "").replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]),
  );

let toastTimer;
function toast(msg) {
  const t = $("#toast");
  t.textContent = msg;
  t.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove("show"), 2600);
}

function fmtDate(v) {
  if (!v) return "";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

/* --- Dialog --------------------------------------------------------------- */
function openDialog(title, innerHtml, onMount) {
  const root = $("#dialog-root");
  const overlay = el(`
    <div class="overlay">
      <div class="dialog" role="dialog" aria-modal="true">
        <h3>${esc(title)}</h3>
        <div class="dialog-body"></div>
      </div>
    </div>`);
  overlay.querySelector(".dialog-body").appendChild(el(`<div>${innerHtml}</div>`));
  overlay.addEventListener("mousedown", (e) => {
    if (e.target === overlay) closeDialog();
  });
  root.appendChild(overlay);
  document.addEventListener("keydown", escClose);
  if (onMount) onMount(overlay);
}
function escClose(e) {
  if (e.key === "Escape") closeDialog();
}
function closeDialog() {
  $("#dialog-root").innerHTML = "";
  document.removeEventListener("keydown", escClose);
}

/* --- Auth flow ------------------------------------------------------------ */
function renderAuthMode() {
  $("#auth-title").textContent = signUpMode ? "Create your account" : "Welcome back";
  $("#auth-sub").textContent = signUpMode
    ? "Start tracking your recovery today."
    : "Sign in to continue your recovery.";
  $("#auth-submit").textContent = signUpMode ? "Create account" : "Sign in";
  $("#name-field").classList.toggle("hidden", !signUpMode);
  $("#auth-toggle-text").textContent = signUpMode ? "Already have an account?" : "New here?";
  $("#auth-toggle-btn").textContent = signUpMode ? "Sign in" : "Create an account";
  $("#password").setAttribute("autocomplete", signUpMode ? "new-password" : "current-password");
  $("#auth-error").classList.add("hidden");
}

$("#auth-toggle-btn").addEventListener("click", () => {
  signUpMode = !signUpMode;
  renderAuthMode();
});

$("#auth-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const errBox = $("#auth-error");
  errBox.classList.add("hidden");
  const submit = $("#auth-submit");
  submit.disabled = true;
  const original = submit.textContent;
  submit.innerHTML = `<span class="spinner"></span>`;
  try {
    const email = $("#email").value.trim();
    const password = $("#password").value;
    const payload = signUpMode
      ? { name: $("#name").value.trim(), email, password }
      : { email, password };
    const path = signUpMode ? "/api/auth/sign-up" : "/api/auth/sign-in";
    const data = await api(path, { method: "POST", body: payload });
    token = data.token;
    localStorage.setItem(TOKEN_KEY, token);
    currentUser = data.user;
    toast(`Good to see you, ${currentUser.name.split(" ")[0]}.`);
    showApp();
  } catch (err) {
    errBox.textContent = err.message;
    errBox.classList.remove("hidden");
  } finally {
    submit.disabled = false;
    submit.textContent = original;
  }
});

function signOut() {
  if (token) api("/api/auth/sign-out", { method: "POST" }).catch(() => {});
  token = null;
  currentUser = null;
  localStorage.removeItem(TOKEN_KEY);
  $("#app").classList.add("hidden");
  $("#auth").classList.remove("hidden");
}
$("#signout").addEventListener("click", signOut);

/* --- App shell ------------------------------------------------------------ */
function showApp() {
  $("#auth").classList.add("hidden");
  $("#app").classList.remove("hidden");
  $("#who").textContent = currentUser ? currentUser.name : "";
  navigate("dashboard");
}

$("#nav").addEventListener("click", (e) => {
  const btn = e.target.closest("button[data-view]");
  if (!btn) return;
  navigate(btn.dataset.view);
});

function navigate(view) {
  document.querySelectorAll("#nav button").forEach((b) =>
    b.classList.toggle("active", b.dataset.view === view),
  );
  const main = $("#main");
  main.innerHTML = `<div class="empty"><span class="spinner" style="border-top-color:var(--teal);border-color:var(--border);border-top-color:var(--teal)"></span></div>`;
  const render = VIEWS[view];
  if (render) render(main).catch((err) => (main.innerHTML = `<div class="error">${esc(err.message)}</div>`));
}

/* ========================================================================= *
 * VIEWS
 * ========================================================================= */
const VIEWS = {};

/* --- Dashboard ------------------------------------------------------------ */
VIEWS.dashboard = async (main) => {
  const [pain, schedule, plans, workouts] = await Promise.all([
    api("/api/pain?days=90"),
    api("/api/schedule"),
    api("/api/plans"),
    api("/api/workouts"),
  ]);

  const todayIdx = new Date().getDay();
  const todays = schedule.filter((s) => s.dayOfWeek === todayIdx);
  const latestPain = pain[0];
  const planExerciseCount = plans.reduce((n, p) => n + (p.exercises ? p.exercises.length : 0), 0);

  main.innerHTML = `
    <div class="view-head">
      <h2>Dashboard</h2>
      <p>Your recovery at a glance.</p>
    </div>
    <div class="stat-grid">
      <div class="stat"><div class="n">${todays.length}</div><div class="l">Due today &middot; workouts</div></div>
      <div class="stat"><div class="n">${latestPain ? latestPain.level + "/10" : "—"}</div><div class="l">Latest pain level</div></div>
      <div class="stat"><div class="n">${workouts.length}</div><div class="l">Workouts logged</div></div>
      <div class="stat"><div class="n">${planExerciseCount}</div><div class="l">Prescribed exercises</div></div>
    </div>

    <div class="card">
      <h3>Today &middot; ${DAYS[todayIdx]}</h3>
      <div id="today-list"></div>
    </div>

    <div class="card">
      <h3>Recent pain trend</h3>
      <div id="pain-mini"></div>
    </div>
  `;

  const todayList = main.querySelector("#today-list");
  const planItems = [];
  plans.forEach((p) =>
    (p.exercises || []).forEach((ex) => {
      const list = ex.daysOfWeekList || [];
      if (list.length === 0 || list.map(String).includes(String(todayIdx)) ||
        list.map((d) => d.toLowerCase()).includes(DAYS[todayIdx].toLowerCase())) {
        planItems.push({ name: ex.name, sets: ex.sets, reps: ex.reps, from: p.title });
      }
    }),
  );

  if (todays.length === 0 && planItems.length === 0) {
    todayList.innerHTML = `<div class="empty">Nothing scheduled today. Enjoy the rest, or add something in Schedule.</div>`;
  } else {
    todays.forEach((s) => {
      todayList.appendChild(
        el(`<div class="item"><div class="between"><span class="title">${esc(s.title)}</span>${
          s.time ? `<span class="sched time">${esc(s.time)}</span>` : ""
        }</div>${s.notes ? `<div class="muted">${esc(s.notes)}</div>` : ""}</div>`),
      );
    });
    planItems.forEach((p) => {
      const meta = [p.sets ? `${p.sets} sets` : null, p.reps ? `${p.reps} reps` : null]
        .filter(Boolean)
        .join(" × ");
      todayList.appendChild(
        el(`<div class="item"><div class="between"><span class="title">${esc(p.name)}</span><span class="pill">${esc(
          p.from,
        )}</span></div>${meta ? `<div class="muted">${esc(meta)}</div>` : ""}</div>`),
      );
    });
  }

  renderPainMini(main.querySelector("#pain-mini"), pain);
};

function renderPainMini(container, pain) {
  if (!pain || pain.length === 0) {
    container.innerHTML = `<div class="empty">No pain entries yet. Log one on the Pain tab.</div>`;
    return;
  }
  const points = [...pain].reverse().slice(-20);
  const w = 100, h = 40, max = 10;
  const step = points.length > 1 ? w / (points.length - 1) : 0;
  const path = points
    .map((p, i) => `${i === 0 ? "M" : "L"} ${(i * step).toFixed(1)} ${(h - (p.level / max) * h).toFixed(1)}`)
    .join(" ");
  container.innerHTML = `
    <svg viewBox="0 0 ${w} ${h}" preserveAspectRatio="none" style="width:100%;height:80px">
      <path d="${path}" fill="none" stroke="var(--teal)" stroke-width="1.5" vector-effect="non-scaling-stroke" />
    </svg>
    <div class="scale"><span>Oldest</span><span>Latest: ${points[points.length - 1].level}/10</span></div>`;
}

/* --- Workouts ------------------------------------------------------------- */
VIEWS.workouts = async (main) => {
  const [workouts, exercises] = await Promise.all([api("/api/workouts"), api("/api/exercises")]);
  main.innerHTML = `
    <div class="view-head between">
      <div><h2>Workouts</h2><p>Log sessions with exercises, weight, and reps.</p></div>
      <button class="btn" id="log-btn">Log a workout</button>
    </div>
    <div id="workout-list"></div>`;

  main.querySelector("#log-btn").addEventListener("click", () => openWorkoutDialog(exercises));

  const list = main.querySelector("#workout-list");
  if (workouts.length === 0) {
    list.innerHTML = `<div class="card"><div class="empty">No workouts yet.<br /><button class="btn" id="log-empty" style="margin-top:1rem">Log a workout</button></div></div>`;
    list.querySelector("#log-empty").addEventListener("click", () => openWorkoutDialog(exercises));
    return;
  }
  workouts.forEach((w) => {
    const sets = (w.sets || [])
      .map(
        (s) =>
          `<div class="muted">• ${esc(s.exerciseName)} — ${s.weight != null ? esc(s.weight) + " kg × " : ""}${
            s.reps != null ? esc(s.reps) + " reps" : ""
          }</div>`,
      )
      .join("");
    const card = el(`
      <div class="card">
        <div class="between">
          <div><div class="title">${esc(w.name || "Workout")}</div><div class="muted">${fmtDate(w.performedAt)}</div></div>
          <button class="btn-danger" data-id="${w.id}">Delete</button>
        </div>
        ${w.notes ? `<div class="muted" style="margin:.4rem 0">${esc(w.notes)}</div>` : ""}
        <div style="margin-top:.5rem">${sets || '<span class="muted">No sets</span>'}</div>
      </div>`);
    card.querySelector(".btn-danger").addEventListener("click", async () => {
      await api(`/api/workouts/${w.id}`, { method: "DELETE" });
      toast("Workout deleted");
      navigate("workouts");
    });
    list.appendChild(card);
  });
};

function openWorkoutDialog(exercises) {
  const options = exercises.map((e) => `<option value="${esc(e.name)}">${esc(e.name)}</option>`).join("");
  openDialog(
    "Log a workout",
    `
    <div class="field"><label>Name (optional)</label><input id="w-name" placeholder="Push day" /></div>
    <div class="field"><label>Notes (optional)</label><textarea id="w-notes" rows="2"></textarea></div>
    <label style="font-size:.82rem;font-weight:600">Sets</label>
    <div id="sets"></div>
    <button class="btn btn-ghost btn-sm" id="add-set" style="margin-top:.5rem">+ Add set</button>
    <div class="dialog-actions">
      <button class="btn btn-ghost" id="cancel">Cancel</button>
      <button class="btn" id="save">Save workout</button>
    </div>`,
    (overlay) => {
      const setsWrap = overlay.querySelector("#sets");
      const addSet = () => {
        const n = setsWrap.children.length + 1;
        setsWrap.appendChild(
          el(`
          <div class="set-row">
            <select class="s-name">${options}</select>
            <input class="s-weight" type="number" step="0.5" placeholder="kg" />
            <input class="s-reps" type="number" placeholder="reps" />
            <button class="btn-danger s-del" title="Remove">✕</button>
          </div>`),
        );
        setsWrap.lastChild.querySelector(".s-del").addEventListener("click", (e) => {
          e.preventDefault();
          setsWrap.lastChild === e.target.closest(".set-row");
          e.target.closest(".set-row").remove();
        });
        return n;
      };
      addSet();
      overlay.querySelector("#add-set").addEventListener("click", (e) => {
        e.preventDefault();
        addSet();
      });
      overlay.querySelector("#cancel").addEventListener("click", closeDialog);
      overlay.querySelector("#save").addEventListener("click", async (e) => {
        const btn = e.target;
        const sets = [...setsWrap.querySelectorAll(".set-row")].map((row, i) => ({
          exerciseName: row.querySelector(".s-name").value,
          weight: row.querySelector(".s-weight").value ? Number(row.querySelector(".s-weight").value) : null,
          reps: row.querySelector(".s-reps").value ? Number(row.querySelector(".s-reps").value) : null,
          setNumber: i + 1,
        }));
        if (sets.length === 0) return toast("Add at least one set");
        btn.disabled = true;
        try {
          await api("/api/workouts", {
            method: "POST",
            body: {
              name: overlay.querySelector("#w-name").value,
              notes: overlay.querySelector("#w-notes").value,
              sets,
            },
          });
          closeDialog();
          toast("Workout logged");
          navigate("workouts");
        } catch (err) {
          btn.disabled = false;
          toast(err.message);
        }
      });
    },
  );
}

/* --- Routines ------------------------------------------------------------- */
VIEWS.routines = async (main) => {
  const [routines, exercises] = await Promise.all([api("/api/routines"), api("/api/exercises")]);
  main.innerHTML = `
    <div class="view-head between">
      <div><h2>Routines</h2><p>Build reusable workouts from the exercise library.</p></div>
      <div class="between" style="gap:.5rem">
        <button class="btn btn-ghost" id="custom-btn">+ Custom exercise</button>
        <button class="btn" id="new-btn">New routine</button>
      </div>
    </div>
    <div id="routine-list"></div>`;

  main.querySelector("#new-btn").addEventListener("click", () => openRoutineDialog(exercises));
  main.querySelector("#custom-btn").addEventListener("click", openCustomExerciseDialog);

  const list = main.querySelector("#routine-list");
  if (routines.length === 0) {
    list.innerHTML = `<div class="card"><div class="empty">No routines yet. Create one to get started.</div></div>`;
    return;
  }
  routines.forEach((r) => {
    const items = (r.exercises || [])
      .map(
        (e) =>
          `<span class="pill">${esc(e.exerciseName)}${
            e.targetSets ? ` ${e.targetSets}×${e.targetReps ?? ""}` : ""
          }</span>`,
      )
      .join("");
    const card = el(`
      <div class="card">
        <div class="between">
          <div class="title">${esc(r.name)}</div>
          <button class="btn-danger" data-id="${r.id}">Delete</button>
        </div>
        ${r.description ? `<div class="muted" style="margin:.3rem 0">${esc(r.description)}</div>` : ""}
        <div style="margin-top:.5rem">${items || '<span class="muted">No exercises</span>'}</div>
      </div>`);
    card.querySelector(".btn-danger").addEventListener("click", async () => {
      await api(`/api/routines/${r.id}`, { method: "DELETE" });
      toast("Routine deleted");
      navigate("routines");
    });
    list.appendChild(card);
  });
};

function openRoutineDialog(exercises) {
  const options = exercises.map((e) => `<option value="${esc(e.name)}">${esc(e.name)}</option>`).join("");
  openDialog(
    "New routine",
    `
    <div class="field"><label>Routine name</label><input id="r-name" placeholder="Knee rehab — week 2" /></div>
    <div class="field"><label>Description (optional)</label><textarea id="r-desc" rows="2"></textarea></div>
    <label style="font-size:.82rem;font-weight:600">Exercises</label>
    <div id="r-ex"></div>
    <button class="btn btn-ghost btn-sm" id="add-ex" style="margin-top:.5rem">+ Add exercise</button>
    <div class="dialog-actions">
      <button class="btn btn-ghost" id="cancel">Cancel</button>
      <button class="btn" id="save">Create routine</button>
    </div>`,
    (overlay) => {
      const wrap = overlay.querySelector("#r-ex");
      const addEx = () => {
        wrap.appendChild(
          el(`
          <div class="set-row">
            <select class="e-name">${options}</select>
            <input class="e-sets" type="number" placeholder="sets" />
            <input class="e-reps" type="number" placeholder="reps" />
            <button class="btn-danger e-del">✕</button>
          </div>`),
        );
        wrap.lastChild.querySelector(".e-del").addEventListener("click", (e) => {
          e.preventDefault();
          e.target.closest(".set-row").remove();
        });
      };
      addEx();
      overlay.querySelector("#add-ex").addEventListener("click", (e) => {
        e.preventDefault();
        addEx();
      });
      overlay.querySelector("#cancel").addEventListener("click", closeDialog);
      overlay.querySelector("#save").addEventListener("click", async (e) => {
        const name = overlay.querySelector("#r-name").value.trim();
        if (!name) return toast("Routine name is required");
        const rows = [...wrap.querySelectorAll(".set-row")].map((row) => ({
          exerciseName: row.querySelector(".e-name").value,
          targetSets: row.querySelector(".e-sets").value ? Number(row.querySelector(".e-sets").value) : null,
          targetReps: row.querySelector(".e-reps").value ? Number(row.querySelector(".e-reps").value) : null,
        }));
        if (rows.length === 0) return toast("Add at least one exercise");
        e.target.disabled = true;
        try {
          await api("/api/routines", {
            method: "POST",
            body: { name, description: overlay.querySelector("#r-desc").value, exercises: rows },
          });
          closeDialog();
          toast("Routine created");
          navigate("routines");
        } catch (err) {
          e.target.disabled = false;
          toast(err.message);
        }
      });
    },
  );
}

function openCustomExerciseDialog() {
  openDialog(
    "Custom exercise",
    `
    <div class="field"><label>Name</label><input id="c-name" placeholder="Banded clamshell" /></div>
    <div class="field"><label>Category</label><input id="c-cat" placeholder="Mobility" /></div>
    <div class="field"><label>Muscle group (optional)</label><input id="c-muscle" placeholder="Glutes" /></div>
    <div class="field"><label>Description (optional)</label><textarea id="c-desc" rows="2"></textarea></div>
    <div class="dialog-actions">
      <button class="btn btn-ghost" id="cancel">Cancel</button>
      <button class="btn" id="save">Add exercise</button>
    </div>`,
    (overlay) => {
      overlay.querySelector("#cancel").addEventListener("click", closeDialog);
      overlay.querySelector("#save").addEventListener("click", async (e) => {
        const name = overlay.querySelector("#c-name").value.trim();
        if (!name) return toast("Name is required");
        e.target.disabled = true;
        try {
          await api("/api/exercises", {
            method: "POST",
            body: {
              name,
              category: overlay.querySelector("#c-cat").value,
              muscleGroup: overlay.querySelector("#c-muscle").value,
              description: overlay.querySelector("#c-desc").value,
            },
          });
          closeDialog();
          toast("Exercise added");
          navigate("routines");
        } catch (err) {
          e.target.disabled = false;
          toast(err.message);
        }
      });
    },
  );
}

/* --- Schedule ------------------------------------------------------------- */
VIEWS.schedule = async (main) => {
  const [schedule, routines] = await Promise.all([api("/api/schedule"), api("/api/routines")]);
  const todayIdx = new Date().getDay();
  main.innerHTML = `
    <div class="view-head between">
      <div><h2>Schedule</h2><p>Assign specific workouts to specific days.</p></div>
      <button class="btn" id="add-btn">Add to schedule</button>
    </div>
    <div class="week" id="week"></div>`;

  main.querySelector("#add-btn").addEventListener("click", () => openScheduleDialog(routines));

  const week = main.querySelector("#week");
  DAYS.forEach((day, idx) => {
    const items = schedule.filter((s) => s.dayOfWeek === idx);
    const dayEl = el(`
      <div class="day ${idx === todayIdx ? "is-today" : ""}">
        <h4>${day}${idx === todayIdx ? '<span class="tag-today">Today</span>' : ""}</h4>
        <div class="day-items"></div>
      </div>`);
    const di = dayEl.querySelector(".day-items");
    if (items.length === 0) {
      di.innerHTML = `<div class="muted" style="font-size:.8rem">—</div>`;
    } else {
      items.forEach((s) => {
        const row = el(`
          <div class="sched">
            <div class="between">
              <span class="t">${esc(s.title)}</span>
              <button class="btn-danger btn-sm" data-id="${s.id}" style="padding:0 .3rem">✕</button>
            </div>
            ${s.time ? `<span class="time">${esc(s.time)}</span>` : ""}
            ${s.notes ? `<div class="muted" style="font-size:.78rem">${esc(s.notes)}</div>` : ""}
          </div>`);
        row.querySelector(".btn-danger").addEventListener("click", async () => {
          await api(`/api/schedule/${s.id}`, { method: "DELETE" });
          toast("Removed from schedule");
          navigate("schedule");
        });
        di.appendChild(row);
      });
    }
    week.appendChild(dayEl);
  });
};

function openScheduleDialog(routines) {
  const routineOptions = routines
    .map((r) => `<option value="${r.id}">${esc(r.name)}</option>`)
    .join("");
  const dayOptions = DAYS.map((d, i) => `<option value="${i}">${d}</option>`).join("");
  openDialog(
    "Add to schedule",
    `
    <div class="field">
      <label>Workout</label>
      <select id="s-routine">
        <option value="custom">Custom workout</option>
        ${routineOptions}
      </select>
    </div>
    <div class="field"><label>Title</label><input id="s-title" placeholder="Lower body strength" /></div>
    <div class="field"><label>Day</label><select id="s-day">${dayOptions}</select></div>
    <div class="field"><label>Time (optional)</label><input id="s-time" type="time" /></div>
    <div class="field"><label>Notes (optional)</label><textarea id="s-notes" rows="2"></textarea></div>
    <div class="dialog-actions">
      <button class="btn btn-ghost" id="cancel">Cancel</button>
      <button class="btn" id="save">Add to schedule</button>
    </div>`,
    (overlay) => {
      const routineSel = overlay.querySelector("#s-routine");
      const titleInput = overlay.querySelector("#s-title");
      routineSel.value = "custom";
      overlay.querySelector("#s-day").value = String(new Date().getDay());
      routineSel.addEventListener("change", () => {
        if (routineSel.value !== "custom") {
          const r = routines.find((x) => String(x.id) === routineSel.value);
          if (r && !titleInput.value) titleInput.value = r.name;
        }
      });
      overlay.querySelector("#cancel").addEventListener("click", closeDialog);
      overlay.querySelector("#save").addEventListener("click", async (e) => {
        const title = titleInput.value.trim();
        if (!title) return toast("A workout title is required");
        e.target.disabled = true;
        try {
          await api("/api/schedule", {
            method: "POST",
            body: {
              title,
              dayOfWeek: Number(overlay.querySelector("#s-day").value),
              routineId: routineSel.value === "custom" ? null : Number(routineSel.value),
              time: overlay.querySelector("#s-time").value,
              notes: overlay.querySelector("#s-notes").value,
            },
          });
          closeDialog();
          toast("Added to schedule");
          navigate("schedule");
        } catch (err) {
          e.target.disabled = false;
          toast(err.message);
        }
      });
    },
  );
}

/* --- Pain ----------------------------------------------------------------- */
VIEWS.pain = async (main) => {
  const pain = await api("/api/pain?days=90");
  main.innerHTML = `
    <div class="view-head"><h2>Pain tracker</h2><p>Log how your injury feels to track recovery over time.</p></div>
    <div class="card">
      <h3>How is your pain right now?</h3>
      <div class="slider-wrap">
        <div class="slider-val" id="pain-val">3</div>
        <input type="range" id="pain-range" min="0" max="10" value="3" />
        <div class="scale"><span>0 · None</span><span>10 · Severe</span></div>
      </div>
      <div class="field"><label>Location (optional)</label><input id="pain-loc" placeholder="Left knee" /></div>
      <div class="field"><label>Note (optional)</label><textarea id="pain-note" rows="2"></textarea></div>
      <button class="btn btn-block" id="pain-save">Log pain level</button>
    </div>
    <div class="card">
      <h3>History</h3>
      <div id="pain-history"></div>
    </div>`;

  const range = main.querySelector("#pain-range");
  const val = main.querySelector("#pain-val");
  range.addEventListener("input", () => (val.textContent = range.value));

  main.querySelector("#pain-save").addEventListener("click", async (e) => {
    e.target.disabled = true;
    try {
      await api("/api/pain", {
        method: "POST",
        body: {
          level: Number(range.value),
          location: main.querySelector("#pain-loc").value,
          note: main.querySelector("#pain-note").value,
        },
      });
      toast("Pain level logged");
      navigate("pain");
    } catch (err) {
      e.target.disabled = false;
      toast(err.message);
    }
  });

  const history = main.querySelector("#pain-history");
  if (pain.length === 0) {
    history.innerHTML = `<div class="empty">No entries yet.</div>`;
  } else {
    pain.forEach((p) => {
      history.appendChild(
        el(`
        <div class="item">
          <div class="between">
            <span class="title">${p.level}/10 ${p.location ? `· ${esc(p.location)}` : ""}</span>
            <div class="between" style="gap:.5rem">
              <span class="muted" style="font-size:.82rem">${fmtDate(p.loggedAt)}</span>
              <button class="btn-danger btn-sm" data-id="${p.id}">✕</button>
            </div>
          </div>
          ${p.note ? `<div class="muted">${esc(p.note)}</div>` : ""}
        </div>`),
      );
    });
    history.querySelectorAll(".btn-danger").forEach((b) =>
      b.addEventListener("click", async () => {
        await api(`/api/pain/${b.dataset.id}`, { method: "DELETE" });
        toast("Entry deleted");
        navigate("pain");
      }),
    );
  }
};

/* --- Plans ---------------------------------------------------------------- */
VIEWS.plans = async (main) => {
  const plans = await api("/api/plans");
  main.innerHTML = `
    <div class="view-head between">
      <div><h2>PT plans</h2><p>Scan a handout or build a plan with reminders.</p></div>
      <div class="between" style="gap:.5rem">
        <button class="btn btn-ghost" id="scan-btn">Scan handout</button>
        <button class="btn" id="manual-btn">New plan</button>
      </div>
    </div>
    <div id="plan-list"></div>`;

  main.querySelector("#scan-btn").addEventListener("click", openScanDialog);
  main.querySelector("#manual-btn").addEventListener("click", () => openPlanDialog());

  const list = main.querySelector("#plan-list");
  if (plans.length === 0) {
    list.innerHTML = `<div class="card"><div class="empty">No plans yet. Scan a PT handout or create one manually.</div></div>`;
    return;
  }
  plans.forEach((p) => {
    const ex = (p.exercises || [])
      .map((e) => {
        const meta = [e.sets ? `${e.sets} sets` : null, e.reps ? `${e.reps} reps` : null, e.frequency]
          .filter(Boolean)
          .join(" · ");
        return `<div class="item"><div class="title">${esc(e.name)}</div>${
          meta ? `<div class="muted">${esc(meta)}</div>` : ""
        }${e.instructions ? `<div class="muted" style="font-size:.82rem">${esc(e.instructions)}</div>` : ""}${
          e.reminderTime ? `<span class="pill coral">Reminder ${esc(e.reminderTime)}</span>` : ""
        }</div>`;
      })
      .join("");
    const card = el(`
      <div class="card">
        <div class="between">
          <div><div class="title">${esc(p.title)}</div>${
            p.professionalName ? `<div class="muted">${esc(p.professionalName)}</div>` : ""
          }</div>
          <button class="btn-danger" data-id="${p.id}">Delete</button>
        </div>
        ${p.notes ? `<div class="muted" style="margin:.4rem 0">${esc(p.notes)}</div>` : ""}
        <div style="margin-top:.5rem">${ex || '<span class="muted">No exercises</span>'}</div>
      </div>`);
    card.querySelector(".btn-danger").addEventListener("click", async () => {
      await api(`/api/plans/${p.id}`, { method: "DELETE" });
      toast("Plan deleted");
      navigate("plans");
    });
    list.appendChild(card);
  });
};

function openScanDialog() {
  openDialog(
    "Scan PT handout",
    `
    <p class="muted" style="margin-top:0">Paste the handout text or upload a photo. The AI extracts the prescribed exercises.</p>
    <div class="field"><label>Handout text</label><textarea id="scan-text" rows="5" placeholder="Paste the exercises your PT prescribed..."></textarea></div>
    <div class="field"><label>Or upload an image</label><input id="scan-img" type="file" accept="image/*" /></div>
    <div class="dialog-actions">
      <button class="btn btn-ghost" id="cancel">Cancel</button>
      <button class="btn" id="scan">Scan</button>
    </div>`,
    (overlay) => {
      overlay.querySelector("#cancel").addEventListener("click", closeDialog);
      overlay.querySelector("#scan").addEventListener("click", async (e) => {
        const text = overlay.querySelector("#scan-text").value.trim();
        const file = overlay.querySelector("#scan-img").files[0];
        if (!text && !file) return toast("Provide handout text or an image");
        const btn = e.target;
        btn.disabled = true;
        btn.innerHTML = `<span class="spinner"></span> Scanning`;
        try {
          let imageDataUrl = null;
          if (file) imageDataUrl = await fileToDataUrl(file);
          const result = await api("/api/scan-handout", {
            method: "POST",
            body: { text: text || null, imageDataUrl },
          });
          closeDialog();
          openPlanDialog(result);
        } catch (err) {
          btn.disabled = false;
          btn.textContent = "Scan";
          toast(err.message);
        }
      });
    },
  );
}

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function openPlanDialog(prefill) {
  const p = prefill || { title: "", professionalName: "", notes: "", exercises: [] };
  openDialog(
    prefill ? "Review scanned plan" : "New plan",
    `
    <div class="field"><label>Plan title</label><input id="p-title" value="${esc(p.title || "")}" placeholder="Knee ACL recovery" /></div>
    <div class="field"><label>Professional (optional)</label><input id="p-pro" value="${esc(
      p.professionalName || "",
    )}" placeholder="Dr. Lee, City PT" /></div>
    <div class="field"><label>Notes (optional)</label><textarea id="p-notes" rows="2">${esc(p.notes || "")}</textarea></div>
    <label style="font-size:.82rem;font-weight:600">Exercises</label>
    <div id="p-ex"></div>
    <button class="btn btn-ghost btn-sm" id="add-pex" style="margin-top:.5rem">+ Add exercise</button>
    <div class="dialog-actions">
      <button class="btn btn-ghost" id="cancel">Cancel</button>
      <button class="btn" id="save">Save plan</button>
    </div>`,
    (overlay) => {
      const wrap = overlay.querySelector("#p-ex");
      const addPex = (data = {}) => {
        const row = el(`
          <div class="item" style="margin-bottom:.6rem">
            <input class="pe-name" placeholder="Exercise name" value="${esc(data.name || "")}" style="width:100%;padding:.45rem .55rem;border:1px solid var(--border);border-radius:8px;margin-bottom:.4rem" />
            <div class="row">
              <input class="pe-sets" type="number" placeholder="sets" value="${data.sets ?? ""}" style="padding:.4rem;border:1px solid var(--border);border-radius:8px" />
              <input class="pe-reps" type="number" placeholder="reps" value="${data.reps ?? ""}" style="padding:.4rem;border:1px solid var(--border);border-radius:8px" />
              <input class="pe-freq" placeholder="frequency" value="${esc(data.frequency || "")}" style="padding:.4rem;border:1px solid var(--border);border-radius:8px" />
              <input class="pe-remind" type="time" title="Reminder" style="padding:.4rem;border:1px solid var(--border);border-radius:8px" />
            </div>
            <input class="pe-instr" placeholder="instructions (optional)" value="${esc(data.instructions || "")}" style="width:100%;padding:.4rem .55rem;border:1px solid var(--border);border-radius:8px;margin-top:.4rem" />
            <button class="btn-danger btn-sm pe-del" style="margin-top:.3rem">Remove</button>
          </div>`);
        row.querySelector(".pe-del").addEventListener("click", (e) => {
          e.preventDefault();
          row.remove();
        });
        wrap.appendChild(row);
      };
      if (p.exercises && p.exercises.length) p.exercises.forEach((e) => addPex(e));
      else addPex();
      overlay.querySelector("#add-pex").addEventListener("click", (e) => {
        e.preventDefault();
        addPex();
      });
      overlay.querySelector("#cancel").addEventListener("click", closeDialog);
      overlay.querySelector("#save").addEventListener("click", async (e) => {
        const title = overlay.querySelector("#p-title").value.trim();
        if (!title) return toast("Plan title is required");
        const exercises = [...wrap.querySelectorAll(".item")].map((row) => ({
          name: row.querySelector(".pe-name").value,
          sets: row.querySelector(".pe-sets").value ? Number(row.querySelector(".pe-sets").value) : null,
          reps: row.querySelector(".pe-reps").value ? Number(row.querySelector(".pe-reps").value) : null,
          frequency: row.querySelector(".pe-freq").value || null,
          reminderTime: row.querySelector(".pe-remind").value || null,
          instructions: row.querySelector(".pe-instr").value || null,
        }));
        e.target.disabled = true;
        try {
          await api("/api/plans", {
            method: "POST",
            body: {
              title,
              professionalName: overlay.querySelector("#p-pro").value,
              notes: overlay.querySelector("#p-notes").value,
              exercises,
            },
          });
          closeDialog();
          toast("Plan saved");
          navigate("plans");
        } catch (err) {
          e.target.disabled = false;
          toast(err.message);
        }
      });
    },
  );
}

/* --- Boot ----------------------------------------------------------------- */
(async function boot() {
  renderAuthMode();
  if (token) {
    try {
      const data = await api("/api/auth/me");
      currentUser = data.user;
      showApp();
      return;
    } catch {
      // token invalid/expired — fall through to auth screen
    }
  }
  $("#auth").classList.remove("hidden");
})();
