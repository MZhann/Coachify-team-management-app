# Coachify

A web-based information system for **team creation**, **player management**, **tournament organization**, and **performance analysis** in team sports.

## Tech stack

- **Frontend:** Next.js 14 (App Router), TypeScript, Tailwind CSS, ShadCN-style UI
- **Backend:** Next.js API Routes, Node.js
- **Database:** MongoDB with Mongoose

## Features (Week 4 – Authentication & Team Creation)

- **User authentication:** Register and log in securely (JWT in httpOnly cookie)
- **Team creation:** Create a team for a selected sport (football, basketball, volleyball, American football)
- **Dashboard:** Team Management view with cards for Player Roster, Schedule Events, Discipline Log, Team Stats & Reports
- **Layout:** Sidebar navigation and header matching the conceptual design

## Getting started

1. **Install dependencies**

   ```bash
   npm install
   ```

2. **Environment**

   Copy `.env.example` to `.env.local` and set:

   - `MONGODB_URI` – MongoDB connection string (default: `mongodb://localhost:27017/coachify`)
   - `JWT_SECRET` – Secret for JWT signing (use a long random string in production)

3. **Run MongoDB**

   Ensure MongoDB is running locally, or use a cloud instance (e.g. MongoDB Atlas) and set `MONGODB_URI` in `.env.local`.

4. **Run the app**

   ```bash
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000). Sign up, then create a team from the dashboard.

## Project structure

- `src/app` – Next.js App Router (pages, layouts, API routes)
- `src/components` – UI and layout components (ShadCN-style, sidebar, header)
- `src/lib` – DB connection, auth helpers, utils
- `src/models` – Mongoose models (User, Team)
- `src/middleware.ts` – Auth redirects (protect `/dashboard`, redirect logged-in users from `/login`)

## API

- `POST /api/auth/register` – Register (body: `name`, `email`, `password`, optional `role`)
- `POST /api/auth/login` – Login (body: `email`, `password`)
- `POST /api/auth/logout` – Logout (clears cookie)
- `GET /api/teams` – List teams for the current user
- `POST /api/teams` – Create team (body: `name`, `sport`)

## License

Private / educational use.
