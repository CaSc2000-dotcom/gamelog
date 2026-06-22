# GameLog Deployment Decision Sketch

## Purpose

> This note captures where GameLog will live for a real graded demo -- a URL the instructor can open -- not just localhost. It matches the MVP in `GameLog_requirements_draft.md`: web app, OAuth, screenshots, IGDB (or similar) from the server when secrets matter. Details can shift once the stack is picked (React, Vue, etc.).

## What Must Be Hosted

Web client: backlog, sessions, insights UI -- runs in the browser.

API / backend: enforce auth, CRUD for games and sessions, signed URLs or a thin proxy for media, IGDB calls kept server-side if they use a secret.

Relational database: users, games, sessions, metadata pointing at screenshot objects.

Object storage: user screenshots -- big blobs belong in a bucket, not only in Postgres.

OAuth (e.g. Google) needs HTTPS on the production callback URL; localhost is fine while developing.

## Recommended MVP Shape

The pattern I am aiming for: managed Postgres + S3-compatible object storage + one deployable API service + static or SSR front-end.

1. Database: PostgreSQL on the same provider as the API when I can (Render, Railway, Fly, Neon, etc.) so networking stays simple.
2. File uploads: an S3-compatible bucket (AWS S3, Cloudflare R2, Backblaze B2, or whatever the host bundles). The app stores keys and metadata in Postgres; the bytes live in the bucket.
3. Backend: one service (Docker or native Node/Python/etc.) speaking HTTPS to the client.
4. Front-end: static build on something like Vercel or Netlify, or static files from the same host as the API if I want fewer accounts to juggle for the capstone.

Why this fits: it is the usual full-stack capstone split -- DB vs blobs vs API vs UI -- and it can stay on free or cheap tiers for a semester demo.

## Provider Options (Examples)

These are examples, not locked choices -- I pick one path that matches comfort and cost.

Render -- web service + Postgres + optional disk or use R2/S3 for screenshots: simple one-dashboard setup; free tier can cold-start; I need to respect upload size limits.

Fly.io + Fly Postgres + Tigris or S3: good if I want containers and edge; a bit more setup.

Railway + Postgres + volume or external storage: fast to spin up; watch usage if testing generates traffic spikes.

Vercel (front) + serverless API if I use Next.js + Neon + R2/S3: smooth front deploy; large uploads need a deliberate pattern (direct-to-bucket), not a giant body through a tiny function.

Screenshot uploads: requirements cap total screenshots per session at 50 MB -- I should use direct-to-bucket or signed URL flows so the API is not streaming huge files forever. That pattern belongs in the final design write-up.

## Environment And Secrets

Database URL: server environment only -- never baked into the front-end bundle.

OAuth client id/secret: server env; public client id for a SPA might be separate depending on flow.

IGDB / Twitch API: server-only when there is a secret; nothing sensitive in the browser.

S3/R2 keys: server env; tight permissions on the bucket.

Local dev: `.env` not committed, local Postgres, MinIO or a dev bucket for experiments.

## CI And CD (Light)

GitHub (or similar) as source of truth

Either auto-deploy from main or manual deploy from the dashboard for the first few weeks.

Migrations: run on deploy or as a release step -- exact command depends on the ORM I choose.

## Open Decisions

Front-end framework (instructor mentioned React or Vue): TBD.

Back-end language/runtime: TBD.

Exact hosts -- API / DB / objects / front: TBD.

Domain: default subdomain from the provider vs custom domain: TBD.

## Deployment Risks

Large uploads timing out on small instances -- mitigate with direct-to-storage uploads and client-side checks against the 50 MB/session cap.

OAuth redirect mismatch -- fix production callback URL early; keep the same path in dev with localhost.

Free tier sleep / cold start -- wake the app once before a live demo; maybe a small paid tier for demo week if needed.

CORS or cookie issues -- set allowed origins and cookie rules explicitly when the API and front live on different URLs.
