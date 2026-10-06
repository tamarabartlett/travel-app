# Travel

Personal travel planner. The Angular app talks to serverless API routes that store data in **MongoDB Atlas**. Production runs on **Vercel** — same workflow as the workouts app.

Each **trip** has a name, start and end dates, notes, a **Sid** section, and a **Rover Yes/No** field (for future email integration).

---

## Prerequisites

- **Node.js** 20.19+ or 22.12+ (and npm)
- A **[MongoDB Atlas](https://www.mongodb.com/atlas)** cluster and connection string
- **[Vercel CLI](https://vercel.com/docs/cli)** for the local API (`npm i -g vercel`, or use `npx vercel`)

---

## One-time setup

### 1. Install dependencies

```bash
npm install
```

### 2. MongoDB Atlas

Use the same cluster as workouts or create a new database name in the connection string (e.g. `travel` instead of `workouts`).

### 3. Create `.env.local`

```bash
cp .env.example .env.local
```

Fill in `ALLOWED_USERNAME`, `ALLOWED_PASSWORD_HASH` (`npm run hash-password -- "your-password"`), `SESSION_SECRET` (`openssl rand -base64 32`), and `MONGODB_URI`.

### 4. Vercel login (local API)

```bash
npx vercel login
```

---

## Run locally

**Terminal 1 — API**

```bash
npm run dev:api
```

**Terminal 2 — Angular**

```bash
npm start
```

Open **http://localhost:4200** and sign in.

---

## Deploy to Vercel

Link a **new** Vercel project for this folder (separate from workouts), set the same env vars as `.env.local`, then:

```bash
npm run deploy
```

Build output: `dist/travel-app/browser`. API route: `/api/trips`.

---

## Import and export

**Export** downloads `tripHistory.json`. **Import** replaces all saved trips with the trips in the file. See `tripHistory.example.json` for the format.
