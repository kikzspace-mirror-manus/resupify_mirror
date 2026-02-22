# Resupify — Internal Migration Plan

**Document type:** Internal planning reference  
**Status:** Draft — for review before any migration work begins  
**Last updated:** 2026-02-22  
**Scope:** Optional future migration of the Resupify production database and/or hosting infrastructure. This document describes what to do, what to protect, and how to verify success. It does not authorise any migration; that decision requires explicit sign-off.

---

## 1. Current Stack Summary

Resupify is a full-stack TypeScript application hosted on the Manus platform. The following table summarises the key runtime components as of the date above.

| Layer | Technology | Version | Notes |
|---|---|---|---|
| **Frontend** | React + Vite | React 19.2, Vite 7.1 | SPA served via Vite dev server in development; bundled static assets in production |
| **API layer** | tRPC over Express | tRPC 11.6, Express 4.21 | All client–server calls go through `/api/trpc`; no REST routes except `/api/stripe/webhook` |
| **Database** | MySQL / TiDB (Manus-managed) | mysql2 3.15, drizzle-orm 0.44 | 21 tables, 16 Drizzle migrations applied (0000–0015) |
| **Auth** | Manus OAuth 2.0 | — | Session cookie signed with `JWT_SECRET`; callback at `/api/oauth/callback` |
| **Payments** | Stripe Checkout | stripe 20.3 | Webhook at `/api/stripe/webhook`; idempotency via `stripe_events` table |
| **LLM — primary** | Manus built-in (`invokeLLM`) | — | Routed via `server/llmProvider.ts`; active when `LLM_PROVIDER=manus` |
| **LLM — alternate** | OpenAI GPT-4.1 | openai 6.22 | Active when `LLM_PROVIDER=openai` + `OPENAI_API_KEY` set |
| **File storage** | Manus S3 (built-in) | — | Resumes and assets stored via `storagePut`/`storageGet` helpers |
| **Scheduled jobs** | In-process `setInterval` | — | Daily cleanup job in `server/cleanup.ts` (10 s delay, 24 h interval) |

The application has no external message queue, no Redis cache, and no separate worker process. All background work runs in the same Node.js process as the API server.

---

## 2. Tables Inventory

The database contains 21 tables across three categories: **core business data**, **operational/audit data**, and **protected data** that must never be altered during a migration without explicit sign-off.

### 2.1 Core Business Tables

These tables hold user-generated content and application state. They are safe to migrate with standard dump-and-restore procedures, subject to the constraints in Section 3.

| Table | Description | Row estimate |
|---|---|---|
| `users` | Registered accounts; includes `role`, `disabled`, `earlyAccessEnabled`, `isAdmin` | Low (beta) |
| `user_profiles` | Extended profile: work status, eligibility fields, region/track preferences | 1:1 with users |
| `resumes` | Resume versions per user; S3 URL references only (no file bytes) | Low–medium |
| `job_cards` | Central CRM entity; includes stage, eligibility pre-check, follow-up scheduling | Medium |
| `job_card_requirements` | LLM-extracted requirements per job card | Medium |
| `job_card_personalization_sources` | Personalization context per job card | Low |
| `tasks` | Follow-up and checklist tasks; includes `sentAt` | Medium |
| `contacts` | Outreach contacts per user | Low |
| `outreach_threads` | Outreach threads per job card | Low |
| `outreach_messages` | Individual messages in an outreach thread | Low |
| `outreach_packs` | Generated outreach pack (email, LinkedIn DM, follow-ups) | Low |
| `application_kits` | Generated application kit (bullet rewrites, cover letter) | Low |

### 2.2 Operational and Audit Tables

These tables are append-only logs. They can be migrated, truncated, or left behind without affecting business logic, provided the application is restarted after migration so the daily cleanup job re-initialises.

| Table | Description | Retention policy |
|---|---|---|
| `admin_action_logs` | Admin actions (grant credits, disable user, etc.) | Indefinite (audit) |
| `operational_events` | Rate-limit and provider error events (no PII, no payloads) | 30-day auto-purge |
| `stripe_events` | Stripe webhook event log (idempotency + purchase audit) | 90-day auto-purge |

### 2.3 Protected Tables — Do Not Alter Without Sign-Off

The following tables contain data with strict immutability or integrity constraints. Any migration touching these tables requires a separate review.

| Table | Protection reason |
|---|---|
| `credits_balances` | Live credit balance; any row loss or duplication causes incorrect billing |
| `credits_ledger` | Append-only financial audit trail; no row may be deleted or modified |
| `jd_snapshots` | Immutable JD text; once written, the `snapshotText` column must never change |
| `evidence_runs` | Stores `scoreBreakdownJson` and `regionCode`/`trackCode` used for historical score trends; row deletion breaks sparkline continuity |
| `evidence_items` | Linked to `evidence_runs`; deletion orphans the run's output |

---

## 3. Risks and "Do-Not-Migrate-Until" Conditions

Migration should not begin until all of the following conditions are satisfied.

**Financial integrity.** The `credits_balances` and `credits_ledger` tables must be migrated atomically. Any gap between the source and destination states could result in users gaining or losing credits. A migration is safe only when the application can be taken fully offline during the transfer window, or when a proven logical replication stream is in place.

**Stripe webhook idempotency.** The `stripe_events` table provides the only defence against double-crediting on webhook retries. If this table is lost or reset, any Stripe event replayed during the migration window will re-credit users. Stripe events must be migrated before the webhook endpoint is re-pointed to the new database.

**JD snapshot immutability.** The `jd_snapshots` table must be migrated with a byte-for-byte checksum comparison. Any row where `snapshotText` differs between source and destination must halt the migration.

**Evidence run continuity.** Score history sparklines depend on the chronological ordering of `evidence_runs` rows. Auto-increment IDs must be preserved; do not allow the destination database to re-sequence primary keys.

**LLM provider state.** The `LLM_PROVIDER` environment variable must be set to `manus` during the migration window. If `LLM_PROVIDER=openai` is active, in-flight requests may succeed on the old database and fail to write to the new one, creating partial state.

**Early access gating.** The `earlyAccessEnabled` field on `users` defaults to `false`. After a migration, all users will be locked out unless this field is correctly migrated. Verify at least one admin account has `earlyAccessEnabled=true` (or `role=admin`) before re-opening traffic.

**Test suite green.** The full Vitest suite (currently 893 tests) must pass against the new database before any traffic is cut over. The suite must be run with `LLM_PROVIDER=manus` to avoid rate-limit flakiness.

---

## 4. Step-by-Step Migration Outline

The following outline assumes a migration to a new MySQL-compatible database (e.g., a different TiDB cluster, PlanetScale, or self-hosted MySQL 8). Adapt steps as needed for the target platform.

### Step 1 — Preparation (days before cutover)

Confirm the target database is reachable from the application server and that the `DATABASE_URL` secret can be swapped without a code deploy. Run `pnpm db:push` against the target database using a temporary `DATABASE_URL` override to apply all 16 migrations and verify the schema is identical to production. Document the target database version and character set (must be `utf8mb4`).

### Step 2 — Dry Run (48 hours before cutover)

Take a logical dump of the production database using `mysqldump --single-transaction --routines --triggers`. Restore the dump to the target database. Run the full Vitest suite pointed at the target database (set `DATABASE_URL` in the test environment only). Verify row counts match for all 21 tables. Spot-check `credits_ledger` (sum of `delta` per user must equal `credits_balances.balance`), `jd_snapshots` (SHA-256 of `snapshotText` per row), and `stripe_events` (all `stripeEventId` values present).

### Step 3 — Pre-Cutover Freeze

Schedule a maintenance window. Set the application to return HTTP 503 for all `/api/trpc` requests (a single environment variable flag is sufficient). Confirm no in-flight Stripe webhooks are pending (check Stripe Dashboard → Developers → Webhooks → recent deliveries). Confirm the daily cleanup job has not run within the last hour (check server logs for the `[Cleanup]` line).

### Step 4 — Final Dump and Restore

Take a second logical dump with the application frozen. Restore to the target database. Re-run the row count and checksum verification from Step 2. If any discrepancy is found, abort and investigate before proceeding.

### Step 5 — Cutover

Update the `DATABASE_URL` secret to point to the new database. Restart the application server. Lift the 503 flag. Monitor the server log for the first successful tRPC request and the first `[Cleanup]` job line (confirming the scheduled job re-initialised against the new database).

### Step 6 — Stripe Webhook Re-pointing

Update the Stripe webhook endpoint URL if the application domain has changed. Verify the `STRIPE_WEBHOOK_SECRET` matches the new endpoint's signing secret. Send a test event from the Stripe Dashboard and confirm it is processed without error.

### Step 7 — Post-Cutover Monitoring (first 24 hours)

Monitor the `operational_events` table for a spike in `provider_error` or `unknown` events. Monitor the `credits_ledger` for any unexpected entries. Confirm the `stripe_events` table is receiving new rows on purchases. Keep the old database in read-only mode for 72 hours as a rollback target.

---

## 5. Post-Migration Verification Checklist

The following checks must all pass before the old database is decommissioned.

| # | Check | Method | Pass condition |
|---|---|---|---|
| 1 | Schema parity | `SHOW TABLES` on both databases | 21 tables present on target |
| 2 | Row count parity | `SELECT COUNT(*) FROM <table>` for all 21 tables | Counts match source |
| 3 | Credits integrity | `SELECT SUM(delta) FROM credits_ledger GROUP BY user_id` vs `credits_balances.balance` | No discrepancy for any user |
| 4 | JD snapshot integrity | SHA-256 of `snapshotText` per row | All hashes match source |
| 5 | Stripe idempotency | Query `stripe_events` for all `stripeEventId` values | All present on target |
| 6 | Evidence run continuity | `SELECT MIN(id), MAX(id) FROM evidence_runs` | ID range matches source |
| 7 | Admin access | Log in as admin account | Dashboard loads, `admin.llmStatus.get` returns `{ provider, openaiModel }` |
| 8 | Early access | Log in as a non-admin, non-allowlisted user | Redirected to `/waitlist` |
| 9 | Stripe webhook | Send test event from Stripe Dashboard | `stripe_events` row inserted with `status=skipped` (test event bypass) |
| 10 | LLM call | Run Evidence+ATS scan on a test job card | Scan completes, `evidence_runs` row written to new database |
| 11 | Cleanup job | Wait for next cleanup cycle (up to 24 h) or restart server and wait 10 s | `[Cleanup]` log line appears with new database connection |
| 12 | Full test suite | `pnpm test` with `LLM_PROVIDER=manus` | 893 tests pass, 0 failures |

Once all 12 checks pass, the old database may be placed in archive storage and decommissioned after a 30-day retention period.

---

## Appendix: Protected Files and Directories (Code)

In addition to the database tables above, the following source files must not be modified during or after a migration without a separate review cycle.

| Path | Protection reason |
|---|---|
| `drizzle/schema.ts` — `creditsBalances`, `creditsLedger` | Financial schema; changes require ledger audit |
| `drizzle/schema.ts` — `jdSnapshots` | Immutability contract |
| `server/routers.ts` — evidence, outreach, kit sections | LLM prompt strings and output parsing logic |
| `server/stripeWebhook.ts` | Idempotency and signature verification logic |
| `server/rateLimiter.ts` | Rate-limit thresholds and middleware chain |
| `shared/regionPacks/` | Region pack JSON templates; strict key contract |

---

*This document is for internal planning purposes only. It does not constitute a deployment runbook. All migration work must be scheduled, communicated to affected users, and signed off by the project owner before execution.*
