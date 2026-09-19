# Recovery & Workout Tracker

A physiotherapy-focused workout tracker. Log workouts, track injury pain over time, build custom routines from a preset exercise library, scan PT handouts into scheduled plans, and organize workouts into a weekly schedule.

The project contains **two independent implementations that share the same Neon Postgres database**:

| Folder | Stack | Runs in v0 preview? |
| --- | --- | --- |
| Root (`app/`, `components/`, `lib/`) | Next.js + Better Auth + Drizzle | Yes |
| `frontend/` + `backend/` | Static HTML/CSS/JS client + Java (Spring Boot) API | No — run locally |

Both talk to the same tables, so workout, pain, schedule, and plan data is shared. Only the auth layer differs (see notes below).

---

## Prerequisites

- **Node.js** 18+ and **npm** (for the Next.js app)
- **Java** 17+ and **Maven** (for the Java backend)
- A **Neon Postgres** database (already provisioned for this project)
- An **AI Gateway API key** (for PT handout scanning)

---

## Environment variables

These are secrets and are intentionally **not** committed to GitHub. Supply them yourself when running locally.

| Variable | Used by | Notes |
| --- | --- | --- |
| `DATABASE_URL` | Next.js + Java | Neon Postgres connection string |
| `BETTER_AUTH_SECRET` | Next.js | Random string, 32+ chars (`openssl rand -base64 32`) |
| `AI_GATEWAY_API_KEY` | Next.js + Java | For the PT handout scanner |

The Java backend also reads the standard `PGHOST`, `PGUSER`, `PGPASSWORD`, `PGDATABASE` variables if you prefer those over `DATABASE_URL`.

---

## Running the Next.js app (previews in v0)

```bash
npm install
npm run dev
```

Then open http://localhost:3000. Create a `.env.local` file with the variables above first.

---

## Running the Java backend + static frontend

```bash
# 1. Start the backend (set env vars in your shell first)
cd backend
mvn spring-boot:run       # serves the API on http://localhost:8080

# 2. Open the frontend
#    Serve the frontend/ folder with any static server, e.g.:
cd ../frontend
npx serve .               # or: python3 -m http.server
```

The frontend defaults to calling `http://localhost:8080`. To point it elsewhere, run this in the browser console once:

```js
localStorage.setItem('api_base', 'https://your-backend-url')
```

---

## Notes

- **Two auth systems, one database.** The Next.js app uses Better Auth; the Java backend uses BCrypt password hashing. Because the hashing schemes differ, create accounts in whichever app you're using. All workout/pain/schedule/plan data is fully shared regardless.
- **The Java backend does not build in v0.** v0's preview runs a Node sandbox, so Maven/Spring Boot only runs on your own machine after cloning.
- **Never commit secrets.** Keep database and API credentials in your shell environment or an untracked `.env.local` — the `.gitignore` already excludes those.

---

## Project structure

```
app/                     Next.js App Router pages
components/              React UI components
lib/                     Auth, database client, and schema
frontend/
  index.html             Static client shell
  app.js                 All client logic (auth, fetch, views)
  styles.css             Design system
backend/
  pom.xml                Maven / Spring Boot config
  index.html             API landing page + run instructions
  src/main/java/com/App.java          Spring Boot app + all REST controllers
  src/main/resources/application.properties
  src/test/java/com/AppTests.java
```
