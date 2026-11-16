# QueueFlow — Full-stack Queue Management

A starter full-stack application using React + Vite, Express, Prisma and PostgreSQL.

## Requirements
- Node.js 20+ (Node 22 recommended)
- PostgreSQL 14+
- npm

## 1. Database
Create a PostgreSQL database, for example `queueflow`.

## 2. Backend setup
```bash
cd backend
cp .env.example .env
```
Edit `backend/.env` and set `DATABASE_URL` and a long random `JWT_SECRET`.

```bash
npm install
npx prisma generate
npx prisma migrate dev --name init
npm run dev
```
Backend runs at http://localhost:5000.

Register the first manager from the frontend. Registration is open in this starter app; for a real deployment, add an invite/admin-only registration policy.

## 3. Frontend setup
Open a second terminal:
```bash
cd frontend
npm install
cp .env.example .env
npm run dev
```
Open the URL printed by Vite (normally http://localhost:5173).

## Main features
- Manager registration and login (bcrypt password hashing + JWT)
- Create and select queues
- Add people and generate queue-scoped tokens
- Move waiting tokens up/down
- Call next token, complete service, cancel waiting token
- Dashboard cards and queue analytics

## Important implementation notes
- All queue/token routes require a valid JWT and verify queue ownership.
- Queue operations use Prisma transactions for related updates.
- This is a solid evaluation/demo starter, not a high-availability queueing system. For production, add rate limiting, email verification/password reset, audit logs, stronger concurrency controls (e.g. PostgreSQL advisory/row locks), tests, and deployment secrets.
- Wait time is measured from `createdAt` to `calledAt`; service time from `calledAt` to `completedAt`.
- Analytics are derived from token timestamps. Queue length trend is a daily count of tokens created, not historical instantaneous queue length.
