/* Corrective — vanilla JS single-page app.
 * Talks to the Spring Boot API. No build step, no dependencies. */

const API_BASE_URL = "https://corrective-api.onrender.com";

/* ---------------------------------------------------------------- utils */
const $ = (sel, root = document) => root.querySelector(sel);
const el = (html) => {
  const t = document.createElement("template");
  t.innerHTML = html.trim();
  return t.content.firstElementChild;
};
const esc = (v) =>
  String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

const fmtDate = (iso) => {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d)) return "";
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
};
const fmtDay = (iso) => {
  const d = new Date(iso);
  return isNaN(d) ? "" : d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
};
const startOfDay = (d) => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; };
const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const DAYS_FULL = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const CATEGORIES = ["Strength", "Cardio", "Mobility", "Rehab", "Stretch", "Core"];
const isCardio = (cat) => String(cat || "").toLowerCase() === "cardio";

const painDescriptor = (n) => {
  n = Number(n);
  if (n <= 0) return "No pain";
  if (n <= 2) return "Mild";
  if (n <= 4) return "Noticeable";
  if (n <= 6) return "Moderate";
  if (n <= 8) return "Severe";
  return "Worst possible";
};

/* ---------------------------------------------------------------- icons */
const I = {
  dashboard: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="9"/><rect x="14" y="3" width="7" height="5"/><rect x="14" y="12" width="7" height="9"/><rect x="3" y="16" width="7" height="5"/></svg>',
  workouts: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6.5 6.5 17.5 17.5"/><path d="m21 21-1-1"/><path d="m3 3 1 1"/><path d="m18 22 4-4"/><path d="m2 6 4-4"/><path d="m3 10 7-7"/><path d="m14 21 7-7"/></svg>',
  routines: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 6h13"/><path d="M8 12h13"/><path d="M8 18h13"/><path d="M3 6h.01"/><path d="M3 12h.01"/><path d="M3 18h.01"/></svg>',
  schedule: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>',
  plans: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/><path d="M9 15h6M9 11h2"/></svg>',
  pain: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/></svg>',
  plus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M12 5v14"/></svg>',
  trash: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m2 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/></svg>',
  flame: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/></svg>',
  activity: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>',
  close: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18M6 6l12 12"/></svg>',
  inbox: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M22 12h-6l-2 3h-4l-2-3H2"/><path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/></svg>',
};

const NAV = [
  { path: "#/", label: "Dashboard", icon: I.dashboard },
  { path: "#/workouts", label: "Workouts", icon: I.workouts },
  { path: "#/routines", label: "Routines", icon: I.routines },
  { path: "#/schedule", label: "Schedule", icon: I.schedule },
  { path: "#/plans", label: "PT Plans", icon: I.plans },
  { path: "#/pain", label: "Pain", icon: I.pain },
];

/* ---------------------------------------------------------------- api */
async function api(path, { method = "GET", body } = {}) {
  const opts = { method, headers: {} };
  if (body !== undefined) {
    opts.headers["Content-Type"] = "application/json";
    opts.body = JSON.stringify(body);
  }
  let res;
  try {
    res = await fetch(`${API_BASE_URL}${path}`, opts);
  } catch (e) {
    throw new Error("Network error — the API may be waking up. Please retry in a moment.");
  }
  if (res.status === 204) return null;
  const text = await res.text();
  let data = null;
  if (text) { try { data = JSON.parse(text); } catch { data = text; } }
  if (!res.ok) {
    const msg = (data && data.error) || (typeof data === "string" && data) || `Request failed (${res.status})`;
    const err = new Error(msg);
    err.fieldErrors = data && data.fieldErrors;
    throw err;
  }
  return data;
}

/* ---------------------------------------------------------------- toast */
function toast(msg, type = "success") {
  const t = el(`<div class="toast ${type}">${esc(msg)}</div>`);
  $("#toast-stack").appendChild(t);
  setTimeout(() => { t.style.opacity = "0"; t.style.transition = "opacity .3s"; }, 2600);
  setTimeout(() => t.remove(), 2950);
}

/* ---------------------------------------------------------------- dialog */
function openDialog({ title, subtitle, bodyNode, submitLabel = "Save", onSubmit }) {
  const root = $("#dialog-root");
  const form = el(`<form class="dialog" role="dialog" aria-modal="true" aria-label="${esc(title)}"></form>`);
  form.innerHTML = `
    <div class="dialog-head">
      <div>
        <h3>${esc(title)}</h3>
        ${subtitle ? `<p>${esc(subtitle)}</p>` : ""}
      </div>
      <button type="button" class="icon-btn" data-close aria-label="Close">${I.close}</button>
    </div>
    <div class="dialog-body"></div>
    <div class="dialog-foot">
      <button type="button" class="btn btn-ghost" data-close>Cancel</button>
      <button type="submit" class="btn btn-primary">${esc(submitLabel)}</button>
    </div>`;
  $(".dialog-body", form).appendChild(bodyNode);

  const close = () => { root.classList.remove("open"); root.setAttribute("aria-hidden", "true"); root.innerHTML = ""; document.removeEventListener("keydown", onKey); };
  const onKey = (e) => { if (e.key === "Escape") close(); };
  root.querySelectorAll; // noop
  form.addEventListener("click", (e) => { if (e.target.closest("[data-close]")) close(); });
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const submitBtn = $('button[type="submit"]', form);
    submitBtn.disabled = true;
    try {
      await onSubmit(form);
      close();
    } catch (err) {
      applyFieldErrors(form, err);
      toast(err.message || "Something went wrong", "error");
      submitBtn.disabled = false;
    }
  });
  root.appendChild(form);
  root.classList.add("open");
  root.setAttribute("aria-hidden", "false");
  document.addEventListener("keydown", onKey);
  root.addEventListener("mousedown", (e) => { if (e.target === root) close(); });
  const first = form.querySelector("input, select, textarea");
  if (first) first.focus();
}

function applyFieldErrors(form, err) {
  form.querySelectorAll(".field-error").forEach((n) => (n.textContent = ""));
  if (err && err.fieldErrors) {
    for (const [field, reason] of Object.entries(err.fieldErrors)) {
      const node = form.querySelector(`[data-error-for="${field}"]`);
      if (node) node.textContent = reason;
    }
  }
}

/* ---------------------------------------------------------------- render helpers */
const app = () => $("#app");

function pageHead(title, subtitle, actionsHtml = "") {
  return `<div class="page-head"><div><h1>${esc(title)}</h1>${subtitle ? `<p>${esc(subtitle)}</p>` : ""}</div><div class="flex gap-8 wrap">${actionsHtml}</div></div>`;
}

function skeletonGrid(n = 4, cls = "grid-stats") {
  return `<div class="grid ${cls}">${Array.from({ length: n }).map(() => '<div class="skeleton sk-line"></div>').join("")}</div>`;
}

function emptyState(title, msg, icon = I.inbox) {
  return `<div class="empty">${icon}<h3>${esc(title)}</h3><p>${esc(msg)}</p></div>`;
}

function errorState(msg, retryFn) {
  const node = el(`<div class="error-note"><span>${esc(msg)}</span><button class="btn btn-sm btn-ghost">Retry</button></div>`);
  $("button", node).addEventListener("click", retryFn);
  return node;
}

function confirmDelete(label, fn) {
  return async () => {
    if (!window.confirm(`Delete ${label}? This cannot be undone.`)) return;
    try { await fn(); toast("Deleted"); router(); }
    catch (e) { toast(e.message || "Delete failed", "error"); }
  };
}

/* ---------------------------------------------------------------- SVG chart */
function painChart(points) {
  // points: [{ x: Date, y: number(0-10) }]
  const W = 640, H = 200, pad = { l: 28, r: 12, t: 14, b: 24 };
  const iw = W - pad.l - pad.r, ih = H - pad.t - pad.b;
  if (!points.length) return `<svg class="chart" viewBox="0 0 ${W} ${H}"></svg>`;
  const xs = points.map((p) => +p.x);
  const minX = Math.min(...xs), maxX = Math.max(...xs);
  const spanX = maxX - minX || 1;
  const px = (x) => pad.l + ((+x - minX) / spanX) * iw;
  const py = (y) => pad.t + (1 - Math.max(0, Math.min(10, y)) / 10) * ih;

  let gridLines = "";
  for (let v = 0; v <= 10; v += 2) {
    const y = py(v);
    gridLines += `<line class="grid-line" x1="${pad.l}" y1="${y}" x2="${W - pad.r}" y2="${y}"/><text class="lbl" x="4" y="${y + 3}">${v}</text>`;
  }
  const linePts = points.map((p) => `${px(p.x)},${py(p.y)}`).join(" ");
  const areaPts = `${pad.l},${py(0)} ${linePts} ${px(points[points.length - 1].x)},${py(0)}`;
  const dots = points.map((p) => `<circle class="dot" cx="${px(p.x)}" cy="${py(p.y)}" r="3"/>`).join("");
  const first = new Date(minX), last = new Date(maxX);
  const xLbl = `<text class="lbl" x="${pad.l}" y="${H - 6}">${first.toLocaleDateString(undefined, { month: "short", day: "numeric" })}</text><text class="lbl" x="${W - pad.r}" y="${H - 6}" text-anchor="end">${last.toLocaleDateString(undefined, { month: "short", day: "numeric" })}</text>`;
  return `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="Pain trend over time">${gridLines}<polygon class="area" points="${areaPts}"/><polyline class="line" points="${linePts}"/>${dots}${xLbl}</svg>`;
}

/* ---------------------------------------------------------------- data fetch wrapper */
async function loadView(loader) {
  try {
    await loader();
  } catch (e) {
    const c = app();
    c.appendChild(errorState(e.message || "Failed to load", () => router()));
  }
}

/* ============================================================ VIEWS */

/* ---- Dashboard ---- */
async function viewDashboard() {
  const c = app();
  c.innerHTML = pageHead("Dashboard", "Your recovery at a glance") + skeletonGrid(4) + `<div class="mt-24">${skeletonGrid(2, "grid-2")}</div>`;
  await loadView(async () => {
    const [workouts, pain, plans, schedule] = await Promise.all([
      api("/api/workouts"), api("/api/pain-logs"), api("/api/plans"), api("/api/schedule"),
    ]);

    // stats
    const now = new Date();
    const weekAgo = new Date(now); weekAgo.setDate(now.getDate() - 7);
    const thisWeek = workouts.filter((w) => new Date(w.performedAt || w.createdAt) >= weekAgo).length;

    // streak: consecutive days (ending today or yesterday) with a workout
    const daySet = new Set(workouts.map((w) => +startOfDay(w.performedAt || w.createdAt)));
    let streak = 0;
    let cursor = startOfDay(now);
    if (!daySet.has(+cursor)) cursor.setDate(cursor.getDate() - 1);
    while (daySet.has(+cursor)) { streak++; cursor.setDate(cursor.getDate() - 1); }

    const recentPain = [...pain].sort((a, b) => new Date(b.loggedAt) - new Date(a.loggedAt));
    const latestPain = recentPain[0];
    const last7 = recentPain.filter((p) => new Date(p.loggedAt) >= weekAgo);
    const avgPain = last7.length ? (last7.reduce((s, p) => s + p.level, 0) / last7.length).toFixed(1) : "—";

    const todayDow = now.getDay();
    const todaySched = schedule.filter((s) => s.dayOfWeek === todayDow);
    const activePlan = plans[0];

    const stat = (label, value, hint, icon) =>
      `<div class="stat"><span class="stat-icon">${icon}</span><div class="stat-label">${label}</div><div class="stat-value">${value}</div><div class="stat-hint">${esc(hint)}</div></div>`;

    const chartPts = [...last7].reverse().map((p) => ({ x: new Date(p.loggedAt), y: p.level }));

    c.innerHTML =
      pageHead("Dashboard", "Your recovery at a glance",
        `<a class="btn btn-primary" href="#/workouts">${I.plus} Log workout</a>`) +
      `<div class="grid grid-stats">
        ${stat("Current streak", `${streak}d`, streak ? "Keep it going" : "Log today to start", I.flame)}
        ${stat("This week", thisWeek, "workouts logged", I.workouts)}
        ${stat("Avg pain (7d)", avgPain, `${last7.length} check-ins`, I.pain)}
        ${stat("Active plans", plans.length, plans.length ? "prescribed" : "none yet", I.plans)}
      </div>` +
      `<div class="banner mt-24">
        <div class="big">${streak}</div>
        <div class="banner-text"><strong>${streak ? `${streak}-day streak` : "Start your streak today"}</strong><p>${streak ? "Consistency is the foundation of recovery." : "Log a workout to begin building momentum."}</p></div>
      </div>` +
      `<div class="grid grid-2 mt-24">
        <div class="card">
          <div class="card-head"><div><h3>Recovery curve</h3><div class="sub">Pain level, last 7 days</div></div></div>
          <div class="card-pad">${last7.length ? painChart(chartPts) : emptyState("No pain data yet", "Log a pain check-in to see your trend.", I.activity)}</div>
        </div>
        <div class="card">
          <div class="card-head"><div><h3>Today's plan</h3><div class="sub">${DAYS_FULL[todayDow]}</div></div></div>
          <div>${todaySched.length
            ? todaySched.map((s) => `<div class="row"><div class="row-left"><span class="row-dot"></span><div><div class="row-title">${esc(s.title)}</div>${s.time ? `<div class="row-sub">${esc(s.time)}</div>` : ""}</div></div></div>`).join("")
            : `<div class="card-pad">${emptyState("Nothing scheduled", "Enjoy your rest day or add a session in Schedule.", I.schedule)}</div>`}</div>
        </div>
      </div>` +
      `<div class="card mt-24">
        <div class="card-head"><div><h3>Recent workouts</h3></div><a class="btn btn-sm btn-ghost" href="#/workouts">View all</a></div>
        <div>${workouts.slice(0, 5).map((w) => `<div class="row"><div class="row-left"><span class="row-dot"></span><div><div class="row-title">${esc(w.name)}</div><div class="row-sub">${fmtDay(w.performedAt || w.createdAt)} · ${w.sets ? w.sets.length : 0} sets</div></div></div></div>`).join("") || `<div class="card-pad">${emptyState("No workouts yet", "Log your first session to see it here.", I.workouts)}</div>`}</div>
      </div>` +
      (activePlan ? `<div class="card mt-24"><div class="card-head"><div><h3>${esc(activePlan.title)}</h3><div class="sub">${activePlan.professionalName ? "Prescribed by " + esc(activePlan.professionalName) : "Rehab plan"}</div></div><a class="btn btn-sm btn-ghost" href="#/plans">Open</a></div><div class="card-pad chips">${(activePlan.exercises || []).slice(0, 6).map((e) => `<span class="badge teal">${esc(e.name)}</span>`).join("") || '<span class="muted">No exercises</span>'}</div></div>` : "");
  });
}

/* ---- Workouts ---- */
async function viewWorkouts() {
  const c = app();
  c.innerHTML = pageHead("Workouts", "Log and review your training") + skeletonGrid(3, "grid-2");
  await loadView(async () => {
    const [workouts, exercises] = await Promise.all([api("/api/workouts"), api("/api/exercises")]);
    c.innerHTML = pageHead("Workouts", "Log and review your training",
      `<button class="btn btn-primary" id="log-workout">${I.plus} Log workout</button>`);

    if (!workouts.length) {
      c.appendChild(el(emptyState("No workouts yet", "Log your first workout to start tracking progress.", I.workouts)));
    } else {
      const list = el('<div class="stack"></div>');
      for (const w of workouts) {
        const card = el(`<div class="card">
          <div class="card-head"><div><h3>${esc(w.name)}</h3><div class="sub">${fmtDay(w.performedAt || w.createdAt)}${w.notes ? " · " + esc(w.notes) : ""}</div></div><button class="icon-btn" aria-label="Delete workout">${I.trash}</button></div>
          <div>${(w.sets || []).map((s) => {
            const detail = isCardioSet(s)
              ? [s.distance != null ? `${s.distance} ${esc(s.distanceUnit || "km")}` : null, s.durationSeconds != null ? fmtDuration(s.durationSeconds) : null].filter(Boolean).join(" · ")
              : [s.weight != null ? `${s.weight} kg` : null, s.reps != null ? `${s.reps} reps` : null].filter(Boolean).join(" × ");
            return `<div class="row"><div class="row-left"><span class="badge">#${s.setNumber ?? "-"}</span><div class="row-title">${esc(s.exerciseName)}</div></div><div class="muted">${detail || "—"}</div></div>`;
          }).join("") || `<div class="card-pad muted">No sets recorded</div>`}</div>
        </div>`);
        $(".icon-btn", card).addEventListener("click", confirmDelete("this workout", () => api(`/api/workouts/${w.id}`, { method: "DELETE" })));
        list.appendChild(card);
      }
      c.appendChild(list);
    }
    $("#log-workout").addEventListener("click", () => openWorkoutDialog(exercises));
  });
}

const isCardioSet = (s) => s.distance != null || s.durationSeconds != null;
function fmtDuration(sec) {
  sec = Number(sec);
  const m = Math.floor(sec / 60), s = sec % 60;
  return m ? `${m}m ${s}s` : `${s}s`;
}

function openWorkoutDialog(exercises) {
  const body = el('<div></div>');
  body.innerHTML = `
    <div class="field-row">
      <div class="field"><label>Workout name</label><input class="input" name="name" placeholder="Push day" /><span class="field-error" data-error-for="name"></span></div>
      <div class="field"><label>Date</label><input class="input" type="date" name="performedAt" value="${new Date().toISOString().slice(0, 10)}" /></div>
    </div>
    <div class="field"><label>Notes</label><input class="input" name="notes" placeholder="Optional" /></div>
    <div class="flex-between mt-8"><label class="muted" style="font-weight:600">Sets</label><button type="button" class="btn btn-sm btn-ghost" id="add-set">${I.plus} Add set</button></div>
    <div id="sets" class="stack mt-8"></div>`;
  const dl = el(`<datalist id="ex-list">${exercises.map((e) => `<option value="${esc(e.name)}"></option>`).join("")}</datalist>`);
  body.appendChild(dl);
  const setsWrap = $("#sets", body);
  const catByName = Object.fromEntries(exercises.map((e) => [e.name.toLowerCase(), e.category]));

  const addSet = () => {
    const rowIdx = setsWrap.children.length + 1;
    const row = el(`<div class="card card-pad" style="padding:12px">
      <div class="field-row"><div class="field" style="margin:0"><label>Exercise</label><input class="input ex-name" list="ex-list" placeholder="Search or type" /></div>
      <div class="field" style="margin:0"><label>Set #</label><input class="input" type="number" min="1" value="${rowIdx}" name="setNumber" /></div></div>
      <div class="field-row mt-8 strength-fields"><div class="field" style="margin:0"><label>Weight (kg)</label><input class="input" type="number" step="0.5" min="0" name="weight" /></div>
      <div class="field" style="margin:0"><label>Reps</label><input class="input" type="number" min="0" name="reps" /></div></div>
      <div class="field-row-3 mt-8 cardio-fields" style="display:none"><div class="field" style="margin:0"><label>Distance</label><input class="input" type="number" step="0.1" min="0" name="distance" /></div>
      <div class="field" style="margin:0"><label>Unit</label><select class="select" name="distanceUnit"><option value="km">km</option><option value="mi">mi</option></select></div>
      <div class="field" style="margin:0"><label>Duration (s)</label><input class="input" type="number" min="0" name="durationSeconds" /></div></div>
      <div class="mt-8" style="text-align:right"><button type="button" class="btn btn-sm btn-danger remove-set">Remove</button></div>
    </div>`);
    const nameInput = $(".ex-name", row);
    const strengthFields = $(".strength-fields", row);
    const cardioFields = $(".cardio-fields", row);
    nameInput.addEventListener("input", () => {
      const cat = catByName[nameInput.value.toLowerCase()];
      const cardio = isCardio(cat);
      cardioFields.style.display = cardio ? "" : "none";
      strengthFields.style.display = cardio ? "none" : "";
    });
    $(".remove-set", row).addEventListener("click", () => row.remove());
    setsWrap.appendChild(row);
  };
  addSet();
  $("#add-set", body).addEventListener("click", addSet);

  openDialog({
    title: "Log workout",
    subtitle: "Record strength or cardio sets",
    bodyNode: body,
    submitLabel: "Save workout",
    onSubmit: async (form) => {
      const sets = [];
      setsWrap.querySelectorAll(".card").forEach((row) => {
        const name = $(".ex-name", row).value.trim();
        if (!name) return;
        const num = (n) => { const v = $(`[name="${n}"]`, row).value; return v === "" ? null : Number(v); };
        const cardio = $(".cardio-fields", row).style.display !== "none";
        sets.push({
          exerciseName: name,
          setNumber: num("setNumber") || sets.length + 1,
          weight: cardio ? null : num("weight"),
          reps: cardio ? null : num("reps"),
          distance: cardio ? num("distance") : null,
          distanceUnit: cardio ? $('[name="distanceUnit"]', row).value : null,
          durationSeconds: cardio ? num("durationSeconds") : null,
        });
      });
      if (!sets.length) throw new Error("Add at least one exercise set");
      const dateVal = $('[name="performedAt"]', form).value;
      await api("/api/workouts", {
        method: "POST",
        body: {
          name: $('[name="name"]', form).value.trim() || "Workout",
          notes: $('[name="notes"]', form).value.trim() || null,
          performedAt: dateVal ? new Date(dateVal).toISOString() : null,
          sets,
        },
      });
      toast("Workout logged", "success");
      router();
    },
  });
}

/* ---- Routines ---- */
async function viewRoutines() {
  const c = app();
  c.innerHTML = pageHead("Routines", "Reusable exercise sequences") + skeletonGrid(3, "grid-3");
  await loadView(async () => {
    const [routines, exercises] = await Promise.all([api("/api/routines"), api("/api/exercises")]);
    c.innerHTML = pageHead("Routines", "Reusable exercise sequences",
      `<button class="btn btn-primary" id="new-routine">${I.plus} New routine</button>`);
    if (!routines.length) {
      c.appendChild(el(emptyState("No routines yet", "Build a routine from your exercise library.", I.routines)));
    } else {
      const grid = el('<div class="grid grid-2"></div>');
      for (const r of routines) {
        const card = el(`<div class="card">
          <div class="card-head"><div><h3>${esc(r.name)}</h3>${r.description ? `<div class="sub">${esc(r.description)}</div>` : ""}</div><button class="icon-btn" aria-label="Delete routine">${I.trash}</button></div>
          <div>${(r.items || []).sort((a, b) => (a.orderIndex ?? 0) - (b.orderIndex ?? 0)).map((it) => `<div class="row"><div class="row-title">${esc(it.exerciseName)}</div><div class="muted">${[it.targetSets ? it.targetSets + " sets" : null, it.targetReps ? it.targetReps + " reps" : null].filter(Boolean).join(" × ") || "—"}</div></div>`).join("") || `<div class="card-pad muted">No exercises</div>`}</div>
        </div>`);
        $(".icon-btn", card).addEventListener("click", confirmDelete(`routine "${r.name}"`, () => api(`/api/routines/${r.id}`, { method: "DELETE" })));
        grid.appendChild(card);
      }
      c.appendChild(grid);
    }
    $("#new-routine").addEventListener("click", () => openRoutineDialog(exercises));
  });
}

function openRoutineDialog(exercises) {
  const body = el("<div></div>");
  body.innerHTML = `
    <div class="field"><label>Routine name</label><input class="input" name="name" placeholder="Lower body rehab" /><span class="field-error" data-error-for="name"></span></div>
    <div class="field"><label>Description</label><input class="input" name="description" placeholder="Optional" /></div>
    <div class="flex-between mt-8"><label class="muted" style="font-weight:600">Exercises</label></div>
    <div class="field mt-8"><input class="input" list="rt-ex-list" id="rt-picker" placeholder="Type an exercise and press Enter to add" /></div>
    <datalist id="rt-ex-list">${exercises.map((e) => `<option value="${esc(e.name)}"></option>`).join("")}</datalist>
    <div id="rt-items" class="stack"></div>`;
  const itemsWrap = $("#rt-items", body);
  const picker = $("#rt-picker", body);

  const addItem = (name) => {
    if (!name.trim()) return;
    const row = el(`<div class="card card-pad" style="padding:12px">
      <div class="flex-between"><strong>${esc(name.trim())}</strong><button type="button" class="btn btn-sm btn-danger rm">Remove</button></div>
      <div class="field-row mt-8"><div class="field" style="margin:0"><label>Target sets</label><input class="input" type="number" min="1" name="targetSets" value="3" /></div>
      <div class="field" style="margin:0"><label>Target reps</label><input class="input" type="number" min="1" name="targetReps" value="10" /></div></div>
    </div>`);
    row.dataset.name = name.trim();
    $(".rm", row).addEventListener("click", () => row.remove());
    itemsWrap.appendChild(row);
  };
  picker.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.nativeEvent?.isComposing && e.keyCode !== 229) {
      e.preventDefault();
      addItem(picker.value);
      picker.value = "";
    }
  });

  openDialog({
    title: "New routine",
    subtitle: "Add exercises from your library or type custom ones",
    bodyNode: body,
    submitLabel: "Create routine",
    onSubmit: async (form) => {
      const items = [];
      itemsWrap.querySelectorAll(".card").forEach((row, i) => {
        items.push({
          exerciseName: row.dataset.name,
          targetSets: Number($('[name="targetSets"]', row).value) || null,
          targetReps: Number($('[name="targetReps"]', row).value) || null,
          position: i,
        });
      });
      await api("/api/routines", {
        method: "POST",
        body: {
          name: $('[name="name"]', form).value.trim(),
          description: $('[name="description"]', form).value.trim() || null,
          items,
        },
      });
      toast("Routine created", "success");
      router();
    },
  });
}

/* ---- Schedule ---- */
async function viewSchedule() {
  const c = app();
  c.innerHTML = pageHead("Schedule", "Your weekly training plan") + '<div class="week">' + Array.from({ length: 7 }).map(() => '<div class="skeleton sk-line"></div>').join("") + "</div>";
  await loadView(async () => {
    const [schedule, routines] = await Promise.all([api("/api/schedule"), api("/api/routines")]);
    c.innerHTML = pageHead("Schedule", "Your weekly training plan",
      `<button class="btn btn-primary" id="add-sched">${I.plus} Add session</button>`);
    const routineName = Object.fromEntries(routines.map((r) => [r.id, r.name]));
    const today = new Date().getDay();
    const week = el('<div class="week"></div>');
    for (let d = 0; d < 7; d++) {
      const items = schedule.filter((s) => s.dayOfWeek === d).sort((a, b) => (a.time || "").localeCompare(b.time || ""));
      const col = el(`<div class="day-col${d === today ? " today" : ""}"><h4>${DAYS[d]}</h4></div>`);
      if (!items.length) {
        col.appendChild(el('<p class="muted" style="font-size:.8rem;text-align:center">—</p>'));
      } else {
        for (const s of items) {
          const item = el(`<div class="sched-item">${s.time ? `<span class="t">${esc(s.time)}</span>` : ""}${esc(s.title)}${s.routineId && routineName[s.routineId] ? `<span class="t">${esc(routineName[s.routineId])}</span>` : ""} <button class="icon-btn" style="width:20px;height:20px;float:right" aria-label="Delete">${I.close}</button></div>`);
          $(".icon-btn", item).addEventListener("click", confirmDelete("this session", () => api(`/api/schedule/${s.id}`, { method: "DELETE" })));
          col.appendChild(item);
        }
      }
      week.appendChild(col);
    }
    c.appendChild(week);
    $("#add-sched").addEventListener("click", () => openScheduleDialog(routines));
  });
}

function openScheduleDialog(routines) {
  const body = el("<div></div>");
  body.innerHTML = `
    <div class="field"><label>Title</label><input class="input" name="title" placeholder="Morning mobility" /><span class="field-error" data-error-for="title"></span></div>
    <div class="field-row">
      <div class="field"><label>Day</label><select class="select" name="dayOfWeek">${DAYS_FULL.map((d, i) => `<option value="${i}">${d}</option>`).join("")}</select></div>
      <div class="field"><label>Time</label><input class="input" type="time" name="time" /></div>
    </div>
    <div class="field"><label>Routine (optional)</label><select class="select" name="routineId"><option value="">None</option>${routines.map((r) => `<option value="${r.id}">${esc(r.name)}</option>`).join("")}</select></div>
    <div class="field"><label>Notes</label><input class="input" name="notes" placeholder="Optional" /></div>`;
  openDialog({
    title: "Add session",
    subtitle: "Schedule a workout for the week",
    bodyNode: body,
    submitLabel: "Add to schedule",
    onSubmit: async (form) => {
      const rid = $('[name="routineId"]', form).value;
      await api("/api/schedule", {
        method: "POST",
        body: {
          title: $('[name="title"]', form).value.trim(),
          dayOfWeek: Number($('[name="dayOfWeek"]', form).value),
          time: $('[name="time"]', form).value || null,
          routineId: rid ? Number(rid) : null,
          notes: $('[name="notes"]', form).value.trim() || null,
        },
      });
      toast("Session scheduled", "success");
      router();
    },
  });
}

/* ---- PT Plans ---- */
async function viewPlans() {
  const c = app();
  c.innerHTML = pageHead("PT Plans", "Prescribed rehabilitation programs") + skeletonGrid(2, "grid-2");
  await loadView(async () => {
    const plans = await api("/api/plans");
    c.innerHTML = pageHead("PT Plans", "Prescribed rehabilitation programs",
      `<button class="btn btn-primary" id="new-plan">${I.plus} New plan</button>`);
    if (!plans.length) {
      c.appendChild(el(emptyState("No plans yet", "Add a plan from your physical therapist to track prescribed exercises.", I.plans)));
    } else {
      const stack = el('<div class="stack"></div>');
      for (const p of plans) {
        const card = el(`<div class="card">
          <div class="card-head"><div><h3>${esc(p.title)}</h3><div class="sub">${[p.professionalName ? "By " + esc(p.professionalName) : null, p.createdAt ? fmtDate(p.createdAt) : null].filter(Boolean).join(" · ")}</div></div><button class="icon-btn" aria-label="Delete plan">${I.trash}</button></div>
          <div class="card-pad">
            ${p.notes ? `<p class="muted mt-8">${esc(p.notes)}</p>` : ""}
            <div class="stack mt-8">${(p.exercises || []).map((e) => `<div class="card card-pad" style="padding:12px"><div class="flex-between"><strong>${esc(e.name)}</strong><span class="badge teal">${[e.sets ? e.sets + " sets" : null, e.reps ? e.reps + " reps" : null].filter(Boolean).join(" × ") || "as needed"}</span></div><div class="chips mt-8">${e.frequency ? `<span class="badge">${esc(e.frequency)}</span>` : ""}${e.reminderTime ? `<span class="badge amber">${esc(e.reminderTime)}</span>` : ""}${(e.daysOfWeekList || []).map((d) => `<span class="badge">${DAYS[d] || d}</span>`).join("")}</div>${e.instructions ? `<p class="row-sub mt-8">${esc(e.instructions)}</p>` : ""}</div>`).join("") || '<span class="muted">No exercises prescribed</span>'}</div>
          </div>
        </div>`);
        $(".icon-btn", card).addEventListener("click", confirmDelete(`plan "${p.title}"`, () => api(`/api/plans/${p.id}`, { method: "DELETE" })));
        stack.appendChild(card);
      }
      c.appendChild(stack);
    }
    $("#new-plan").addEventListener("click", openPlanDialog);
  });
}

function openPlanDialog() {
  const body = el("<div></div>");
  body.innerHTML = `
    <div class="field-row">
      <div class="field"><label>Plan title</label><input class="input" name="title" placeholder="Knee rehab — phase 1" /><span class="field-error" data-error-for="title"></span></div>
      <div class="field"><label>Professional</label><input class="input" name="professionalName" placeholder="Dr. Rivera, PT" /></div>
    </div>
    <div class="field"><label>Notes</label><textarea class="textarea" name="notes" placeholder="Overall guidance for this plan"></textarea></div>
    <div class="flex-between mt-8"><label class="muted" style="font-weight:600">Prescribed exercises</label><button type="button" class="btn btn-sm btn-ghost" id="add-pe">${I.plus} Add exercise</button></div>
    <div id="pe-list" class="stack mt-8"></div>`;
  const list = $("#pe-list", body);
  const addPe = () => {
    const row = el(`<div class="card card-pad" style="padding:12px">
      <div class="field" style="margin:0"><label>Exercise name</label><input class="input" name="name" placeholder="Straight leg raise" /></div>
      <div class="field-row-3 mt-8"><div class="field" style="margin:0"><label>Sets</label><input class="input" type="number" min="1" name="sets" /></div>
      <div class="field" style="margin:0"><label>Reps</label><input class="input" type="number" min="1" name="reps" /></div>
      <div class="field" style="margin:0"><label>Reminder</label><input class="input" type="time" name="reminderTime" /></div></div>
      <div class="field mt-8" style="margin:0"><label>Frequency</label><input class="input" name="frequency" placeholder="Daily / 3x per week" /></div>
      <div class="field mt-8" style="margin:0"><label>Days</label><div class="chips" data-days>${DAYS.map((d, i) => `<label class="badge" style="cursor:pointer"><input type="checkbox" value="${i}" style="margin-right:4px">${d}</label>`).join("")}</div></div>
      <div class="field mt-8" style="margin:0"><label>Instructions</label><input class="input" name="instructions" placeholder="Optional cue" /></div>
      <div class="mt-8" style="text-align:right"><button type="button" class="btn btn-sm btn-danger rm">Remove</button></div>
    </div>`);
    $(".rm", row).addEventListener("click", () => row.remove());
    list.appendChild(row);
  };
  addPe();
  $("#add-pe", body).addEventListener("click", addPe);

  openDialog({
    title: "New PT plan",
    subtitle: "Capture a prescribed rehabilitation program",
    bodyNode: body,
    submitLabel: "Create plan",
    onSubmit: async (form) => {
      const exercises = [];
      list.querySelectorAll(".card").forEach((row) => {
        const name = $('[name="name"]', row).value.trim();
        if (!name) return;
        const days = Array.from(row.querySelectorAll("[data-days] input:checked")).map((i) => Number(i.value));
        const num = (n) => { const v = $(`[name="${n}"]`, row).value; return v === "" ? null : Number(v); };
        exercises.push({
          name,
          sets: num("sets"),
          reps: num("reps"),
          frequency: $('[name="frequency"]', row).value.trim() || null,
          daysOfWeek: days,
          reminderTime: $('[name="reminderTime"]', row).value || null,
          instructions: $('[name="instructions"]', row).value.trim() || null,
        });
      });
      if (!exercises.length) throw new Error("Add at least one prescribed exercise");
      await api("/api/plans", {
        method: "POST",
        body: {
          title: $('[name="title"]', form).value.trim(),
          professionalName: $('[name="professionalName"]', form).value.trim() || null,
          notes: $('[name="notes"]', form).value.trim() || null,
          sourceText: null,
          exercises,
        },
      });
      toast("Plan created", "success");
      router();
    },
  });
}

/* ---- Pain ---- */
async function viewPain() {
  const c = app();
  c.innerHTML = pageHead("Pain Tracker", "Monitor your recovery over time") + skeletonGrid(2, "grid-2");
  await loadView(async () => {
    const pain = await api("/api/pain-logs");
    const sorted = [...pain].sort((a, b) => new Date(b.loggedAt) - new Date(a.loggedAt));
    const now = new Date();
    const weekAgo = new Date(now); weekAgo.setDate(now.getDate() - 7);
    const last7 = sorted.filter((p) => new Date(p.loggedAt) >= weekAgo);
    const avg7 = last7.length ? (last7.reduce((s, p) => s + p.level, 0) / last7.length).toFixed(1) : "—";
    const chartPts = [...sorted].reverse().map((p) => ({ x: new Date(p.loggedAt), y: p.level }));

    c.innerHTML = pageHead("Pain Tracker", "Monitor your recovery over time",
      `<button class="btn btn-primary" id="log-pain">${I.plus} Log pain</button>`);

    const top = el(`<div class="grid grid-2">
      <div class="stat"><div class="stat-label">Latest level</div><div class="stat-value">${sorted[0] ? sorted[0].level : "—"}</div><div class="stat-hint">${sorted[0] ? painDescriptor(sorted[0].level) + " · " + fmtDate(sorted[0].loggedAt) : "No check-ins yet"}</div></div>
      <div class="stat"><div class="stat-label">7-day average</div><div class="stat-value">${avg7}</div><div class="stat-hint">${last7.length} check-ins this week</div></div>
    </div>`);
    c.appendChild(top);

    const chartCard = el(`<div class="card mt-24"><div class="card-head"><div><h3>Recovery curve</h3><div class="sub">All pain check-ins</div></div></div><div class="card-pad">${sorted.length ? painChart(chartPts) : emptyState("No pain data yet", "Log a check-in to start your recovery curve.", I.activity)}</div></div>`);
    c.appendChild(chartCard);

    const histCard = el(`<div class="card mt-24"><div class="card-head"><div><h3>History</h3></div></div><div id="pain-hist"></div></div>`);
    const hist = $("#pain-hist", histCard);
    if (!sorted.length) {
      hist.appendChild(el(`<div class="card-pad">${emptyState("Nothing logged", "Your pain check-ins will appear here.", I.pain)}</div>`));
    } else {
      for (const p of sorted) {
        const badgeClass = p.level >= 7 ? "coral" : p.level >= 4 ? "amber" : "teal";
        const row = el(`<div class="row"><div class="row-left"><span class="badge ${badgeClass}">${p.level}</span><div><div class="row-title">${esc(painDescriptor(p.level))}${p.location ? " · " + esc(p.location) : ""}</div><div class="row-sub">${fmtDay(p.loggedAt)}${p.note ? " · " + esc(p.note) : ""}</div></div></div><button class="icon-btn" aria-label="Delete entry">${I.trash}</button></div>`);
        $(".icon-btn", row).addEventListener("click", confirmDelete("this pain entry", () => api(`/api/pain-logs/${p.id}`, { method: "DELETE" })));
        hist.appendChild(row);
      }
    }
    c.appendChild(histCard);
    $("#log-pain").addEventListener("click", openPainDialog);
  });
}

function openPainDialog() {
  const body = el("<div></div>");
  body.innerHTML = `
    <div class="field">
      <label>Pain level</label>
      <div class="pain-value"><span class="num" id="pain-num">3</span><span class="muted" id="pain-desc">${painDescriptor(3)}</span></div>
      <input type="range" min="0" max="10" step="1" value="3" name="level" id="pain-range" />
      <div class="pain-scale"><span>0 · none</span><span>5 · moderate</span><span>10 · worst</span></div>
    </div>
    <div class="field"><label>Location</label><input class="input" name="location" placeholder="Lower back, left knee…" /></div>
    <div class="field"><label>Note</label><textarea class="textarea" name="note" placeholder="What triggered it? How does it feel?"></textarea></div>`;
  const range = $("#pain-range", body);
  const num = $("#pain-num", body);
  const desc = $("#pain-desc", body);
  range.addEventListener("input", () => { num.textContent = range.value; desc.textContent = painDescriptor(range.value); });

  openDialog({
    title: "Log pain",
    subtitle: "How are you feeling right now?",
    bodyNode: body,
    submitLabel: "Save check-in",
    onSubmit: async (form) => {
      await api("/api/pain-logs", {
        method: "POST",
        body: {
          level: Number($('[name="level"]', form).value),
          location: $('[name="location"]', form).value.trim() || null,
          note: $('[name="note"]', form).value.trim() || null,
        },
      });
      toast("Pain logged", "success");
      router();
    },
  });
}

/* ---------------------------------------------------------------- router */
const ROUTES = {
  "#/": viewDashboard,
  "#/workouts": viewWorkouts,
  "#/routines": viewRoutines,
  "#/schedule": viewSchedule,
  "#/plans": viewPlans,
  "#/pain": viewPain,
};

function router() {
  let hash = window.location.hash || "#/";
  if (!ROUTES[hash]) hash = "#/";
  renderNav(hash);
  window.scrollTo(0, 0);
  ROUTES[hash]();
}

function renderNav(active) {
  const linkHtml = (n) => `<a class="nav-link${n.path === active ? " active" : ""}" href="${n.path}">${n.icon}<span>${n.label}</span></a>`;
  $("#side-nav").innerHTML = NAV.map(linkHtml).join("");
  $("#bottom-nav").innerHTML = NAV.map(linkHtml).join("");
}

/* ---------------------------------------------------------------- theme */
function initTheme() {
  const stored = localStorage.getItem("corrective-theme");
  const initial = stored || (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
  document.documentElement.setAttribute("data-theme", initial);
  const toggle = () => {
    const next = document.documentElement.getAttribute("data-theme") === "dark" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", next);
    localStorage.setItem("corrective-theme", next);
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute("content", next === "dark" ? "#16130f" : "#0f766e");
  };
  $("#theme-toggle").addEventListener("click", toggle);
  $("#theme-toggle-mobile").addEventListener("click", toggle);
}

/* ---------------------------------------------------------------- boot */
window.addEventListener("hashchange", router);
window.addEventListener("DOMContentLoaded", () => {
  initTheme();
  if (!window.location.hash) window.location.hash = "#/";
  router();
});
