# Copilot instructions for this repo

## Architecture

- This repo is a two-part app: `backend/` is an Express + Drizzle + PostgreSQL API, and `frontend/` is a Vite React app.
- Keep backend responsibilities split as: `routes/*.route.js` -> controller -> DB query -> `ApiResponse`/`AppError` response. Example: `backend/routes/class.route.js` applies `verifyJWT` and `checkClassRole()` before `class.controller.js` handlers.
- Database modeling is centralized in `backend/models/Db.schema.js`; prefer using the existing Drizzle schema and table names instead of introducing ad hoc SQL or new storage patterns.
- Class membership is authorization state, not an afterthought: `user_classes` is the source of truth for membership/roles, and `checkClassRole` in `backend/middlewares/classRole.middleware.js` enforces access rules before handlers run.
- Auth is cookie-based JWT auth. The backend sets `accessToken` and `refreshToken` as HttpOnly cookies in `backend/controllers/user.controller.js`; the frontend sends them with `withCredentials: true` and reads the logged-in user from `/api/v1/user/me` in `frontend/src/contexts/AuthContext.jsx`.
- Route protection is implemented in the React layer via `ProtectedRoute` and `PublicRoute`, with `AuthContext` as the shared auth state.

## Project conventions

- Use Zod validation at the API boundary; controllers parse request bodies/params with schema objects from `backend/validations/validations.js` before database access.
- Error handling is centralized through `backend/utils/asyncHandler.js`, `backend/utils/appError.js`, and `backend/middlewares/error.middleware.js`. Avoid throwing plain errors or returning inconsistent JSON payloads.
- API responses use the shared wrapper `backend/utils/apiResponse.js`; success payloads should follow `{ success, message, data }` and keep keys like `data.user` / `data.classes` consistent.
- Frontend form validation follows `react-hook-form` + `zodResolver`; see `frontend/src/pages/LoginPage.jsx` and `frontend/src/pages/RegisterPage.jsx` for the pattern.
- Keep styling and UI in the existing Vite/Tailwind setup; do not swap the app to a different routing or state-management pattern unless explicitly requested.

## Data flow and integration points

- Backend DB connection is created once in `backend/db/connectDb.js` via `postgres` + `drizzle`, and all DB work should go through that shared `db` instance.
- The main API surface is under `/api/v1/user` and `/api/v1/class`; keep new endpoints in the same versioned namespace.
- Frontend calls are direct `axios` requests to `${import.meta.env.VITE_BACKEND_URL}`; the app expects CORS enabled for the frontend origin in `backend/index.js`.
- The class data model is relational: `classes` -> `user_classes` -> `subjects` -> `documents`, with `documents.classId` denormalized for frequent class-scoped queries.

## Commands and working style

- Backend dev/setup: `cd backend && npm install && npm run dev`
- Frontend dev/setup: `cd frontend && npm install && npm run dev`
- Frontend build check: `cd frontend && npm run build`
- Drizzle migrations: `cd backend && npm run db:generate`, `npm run db:migrate`, `npm run db:push`, `npm run db:studio`
- No dedicated test suite is present in this repo; validate changes with local runs/builds and manual API checks.

## Local environment

- Backend env vars expected by code: `DATABASE_URL`, `FRONTEND_URL`, `PORT`, `NODE_ENV`, `ACCESS_TOKEN_SECRET`, `REFRESH_TOKEN_SECRET`, `ACCESS_TOKEN_EXPIRY`, `REFRESH_TOKEN_EXPIRY`.
- Frontend env var expected by code: `VITE_BACKEND_URL`.
- Example runtime pattern: backend runs on `http://localhost:3000`, frontend on Vite default `http://localhost:5173`.

## When making changes

- Follow the repo’s existing structure instead of inventing a new framework layer.
- If you add backend APIs, also update the matching route and validation schema, and keep auth/role guards consistent.
- If you change auth behavior, preserve the HttpOnly cookie flow and avoid returning tokens in the body unless the existing API contract already does so.
- If you change schema behavior or DB tables, update the Drizzle schema and migration flow in `backend/drizzle/` rather than creating a parallel database layer.

## Document handling (important for current work)

- Schema notes: `backend/models/Db.schema.js` declares `documents`, `document_chunks`, `searchVector` (tsvector), and `embedding` (custom `vector(768)`). The repo expects:
  - `documents.classId` is denormalized (keep it correct via app logic or a DB trigger `sync_document_class_id`).
  - `documents.deletedAt` is used for soft-delete; queries should exclude soft-deleted rows (see examples in `subject.controller.js` and `class.controller.js`).
  - `document_chunks` stores per-chunk `embedding` and `content` for fine-grained search/RAG.

- Embeddings & search:
  - The `vector` custom type is defined for 768-dim embeddings (Gemini / text-embedding-004). If you change model/provider, update the dimension and migrations accordingly.
  - Create a Drizzle migration that enables the `vector` extension: `CREATE EXTENSION IF NOT EXISTS vector;` before using vector columns.
  - Use the `searchVector` tsvector + GIN index for fast textual search, and vector indexes for similarity search if/when available in your Postgres build.

- Upload & enrichment flow (recommended pattern):
  1.  Accept file upload (use existing `multer` dependency) in a `document.controller.js` route under `/api/v1/class/:classId/...`.
  2.  Persist the file to storage (local, Cloudinary is already a dependency) and insert `documents` row inside a `db.transaction`.
  3.  Send the file (or extracted text) to your LLM/embedding pipeline — generate `aiTitle`, `aiSummary`, `topics`, `embedding`, and chunk-level `document_chunks` with embeddings.
  4.  Update `documents` with `aiTitle`, `aiSummary`, `topics`, `status: ready`, `embedding`, and `searchVector` in the same transaction (or an async job that updates the row and sets `status` when done).
  5.  If enrichment is long-running, insert the document with `status: processing` and have a background worker/process update it when finished (persist a `processingError` on failure).

- DB safety and patterns:
  - Use `db.transaction` for multi-step operations that must be atomic (examples: creating class + userClasses, inserting document + chunks).
  - Respect unique indexes and use `.onConflictDoNothing` for idempotent inserts (see `createSubject` and `registerUser`).
  - Scope updates/deletes by both id and `classId` where appropriate to avoid cross-tenant edits (see `updateSubject`).

- Admin workflows:
  - The `requests` table provides a generic approval flow for admin-gated actions (add/remove members, delete_document). Reuse it rather than inventing ad-hoc approval rows.

- Migrations & Drizzle:
  - Add any schema changes via `drizzle-kit` commands in `backend/` and check `backend/drizzle/` output. Remember to set `DATABASE_URL` before running migrations.

If you'd like, I can scaffold `backend/controllers/document.controller.js`, `backend/routes/document.route.js`, and matching Zod validators in `backend/validations/validations.js` to implement the upload + LLM-enrichment flow. Tell me whether you want synchronous enrichment (blocking) or async worker-based enrichment.
