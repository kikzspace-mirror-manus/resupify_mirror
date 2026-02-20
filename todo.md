# Resupify TODO

## Core Infrastructure
- [x] Database schema (all tables)
- [x] Region Pack system (CA_COOP, CA_NEW_GRAD)
- [x] Credits system with ledger
- [x] LLM integration for Evidence Scan

## Authentication & Onboarding
- [x] Auth flow (Manus OAuth)
- [x] Onboarding page (Region, Track, school/program/grad date, base resume upload)
- [x] User profile management

## Dashboard & Today Page
- [x] Dashboard with pipeline summary
- [x] Today page (tasks due + follow-ups due)
- [x] Quick add Job Card

## Job Cards CRM
- [x] Kanban pipeline (Bookmarked, Applying, Applied, Interviewing, Offered, Rejected, Archived)
- [x] Job Card list view with filters (stage, season, priority, due date)
- [x] Job Card detail page with tabs (Overview, JD Snapshot, Evidence Map, Application Kit, Outreach, Tasks)
- [x] Follow-up automation (next_touch_at creates follow-up task)
- [x] Stage change auto-creates tasks (Applied → follow-up in 5 business days)

## JD Snapshot & Import
- [x] Create Job Card by pasting JD text
- [x] Create Job Card by pasting URL (fetch/extract text)
- [x] JD Snapshot immutability and versioning
- [x] Display "JD Snapshot saved on [date/time]"

## Evidence Scan & ATS Scoring
- [x] Evidence+ATS run (credit-gated)
- [x] EvidenceRun stores region_code + track_code
- [x] Generate 10-20 EvidenceItems grouped by type
- [x] Strict rendering template for each EvidenceItem
- [x] Batch Sprint (5 credits, up to 10 jobs)

## Canada Tracks
- [x] COOP track (education-first, currently enrolled checks, co-op seasons)
- [x] NEW_GRAD track (graduation date tips, overqualified risk warning)
- [x] "No experience" helper (convert projects/clubs/volunteering)
- [x] "Needs confirmation" label for unsupported claims

## Resume Library
- [x] Upload/edit resumes
- [x] Resume versioning
- [x] Template selection

## Application Kit
- [x] Resume bullet suggestions per job
- [x] Cover letter generation
- [x] Outreach pack generation
- [x] Checklist tasks auto-creation after Evidence+ATS run

## Outreach CRM
- [x] Contacts management
- [x] Outreach threads and message log
- [x] Generate Outreach Pack (credit-gated): recruiter email, LinkedIn DM, 2 follow-ups

## Analytics
- [x] Applications/week chart
- [x] Reply/interview/offer rates
- [x] Stage conversion funnel
- [x] Follow-up completion rate

## Billing
- [x] Buy credits
- [x] View credits ledger
- [x] Credit gating for Evidence+ATS, Outreach Pack, Batch Sprint

## Required Pages
- [x] Auth page
- [x] Onboarding page
- [x] Dashboard page
- [x] Job Cards page (list + kanban)
- [x] Job Card Detail page (tabs)
- [x] Resume Library page
- [x] Analytics page
- [x] Billing page

## Testing
- [x] Vitest tests (47 tests passing)

## Public Marketing Pages (V1 Copy)
- [x] Public nav bar (How it works, Pricing, Trust, FAQ, Contact, Try free CTA)
- [x] Home landing page (hero, outcome bullets, 3 feature cards, how-it-works steps, evidence example, trust section, final CTA)
- [x] How It Works page (5 sections: Job Card, JD Snapshot, Evidence Map, Explainable Score, Follow-through)
- [x] Pricing page (Free tier, Credits breakdown, CTAs)
- [x] Trust page (4 principles)
- [x] FAQ page (6 Q&A items with accordion)
- [x] Contact page (email support CTA)
- [x] Wire all CTAs to existing signup/onboarding and in-app billing
- [x] No backend refactors or credit logic changes

## Admin Access & Panels
- [x] Add is_admin boolean + admin_notes to users table
- [x] Admin assignment rule: francisnoces@gmail.com gets is_admin=true
- [x] Server-side admin enforcement (adminProcedure middleware)
- [x] Admin action audit logging (admin_action_logs table)
- [x] Admin credit bypass (admin_test_mode toggle, delta=0 ledger entries)
- [x] Admin Dashboard (KPIs: total users, active 7d, job cards, evidence runs, credits spent, error rate)
- [x] User Management Panel (search, view profile, grant credits, set admin, activity summary)
- [x] Runs & Output QA Panel (browse runs, filter, view details, re-run in test mode)
- [x] Credit & Ledger Panel (view ledger, filter by reason type)
- [x] Content/Pack Management Panel (read-only view of Region Pack JSON)
- [x] System Health Panel (recent errors, failed extractions, AI failures)
- [x] Test Sandbox Panel (sample resume/JD, one-click create/run/generate)
- [x] /admin route hard-blocks non-admins server-side
- [x] Acceptance tests (admin access, credit bypass, grant credits, normal billing)

## Patch: Follow-up Auto-Scheduling on Applied Stage
- [x] Add followupsScheduledAt (timestamp, nullable) to jobCards table
- [x] Push schema migration
- [x] addBusinessDays(date, n) helper in server/routers.ts (already existed, corrected)
- [x] Update jobCards.update router: when stage changes to Applied and followupsScheduledAt is null, create 3 follow-up tasks and set followupsScheduledAt
- [x] Frontend: invalidate tasks query after stage change so Tasks tab auto-refreshes
- [x] Vitest: stage change to Applied creates exactly 3 tasks once; re-save does not duplicate; moving away does not delete

## Patch: Complete Follow-up Scheduling (ensure 3 tasks, handle legacy)
- [x] Add ensureFollowUps(jobCardId, userId, appliedAt) server helper: checks existing tasks per slot, creates missing ones, renames legacy title
- [x] Wire ensureFollowUps into jobCards.update (stage → applied)
- [x] Add tasks.ensureFollowUps tRPC procedure for frontend to call on Tasks tab load
- [x] Frontend: call ensureFollowUps when Tasks tab opens for an Applied card
- [x] Update vitest: A) new card → 3 tasks, B) refresh no duplicate, C) toggle no duplicate, D) legacy 1-task card → 3 tasks

## Patch: Enforce Disabled User Blocking (Server-Side)
- [x] Add ACCOUNT_DISABLED check to protectedProcedure middleware (Option A: blocks all, including admin)
- [x] Add ACCOUNT_DISABLED to shared error codes
- [x] Frontend: intercept ACCOUNT_DISABLED in tRPC client and show blocking screen
- [x] Build AccountDisabled full-page component (message + Contact link)
- [x] Tests: disabled user blocked on all 6 endpoints; non-disabled unaffected; re-enable restores access

## Patch: Disabled Badge in Admin Users List
- [x] Confirm disabled field returned by adminListUsers query
- [x] Add red "Disabled" badge to each user row in AdminUsers.tsx (was already present)
- [x] Add "Show disabled only" frontend filter toggle
- [x] Add 2 unit tests: disabled user shows badge; enabled user does not

## Patch: Next Follow-up Due Date Badge (Job Cards)
- [x] Extend jobCards.list query to include nextFollowupDueAt (MIN due_at from followup tasks, status=todo)
- [x] Render color-coded badge in list view rows (green/amber/red)
- [x] Render color-coded badge in kanban card tiles
- [x] Tests: 3 tasks shows earliest; completed ignored; no tasks = no badge; overdue = red

## Patch: Mark as Sent (Follow-up Tasks)
- [x] Add sentAt (timestamp, nullable) to tasks schema
- [x] Push schema migration
- [x] Add tasks.markSent tRPC mutation (sets completed=true, sentAt=now)
- [x] Show "Mark as sent" button on follow_up tasks with status=todo in Tasks tab
- [x] Show "Mark as sent" button on follow_up tasks in Today page
- [x] Show "Sent {date}" label on completed follow_up tasks with sentAt
- [x] Tests: A) button shown for todo followup, B) click completes with sentAt, C) non-followup no button, D) already done no button

## Patch 6A: Outreach Generate Pack Button
- [x] Read existing outreach.generatePack router to confirm input/output shape
- [x] Add Generate Pack button per thread in Job Card Outreach tab (was already wired; improved with helper text + regenerate)
- [x] Show loading state per thread row while generating
- [x] Render 4 generated messages (email, LinkedIn DM, follow-up #1, #2) with copy buttons and labels
- [x] Handle insufficient credits error with inline message
- [x] Handle general generation failure with inline error
- [x] Acceptance tests: button visible, 4 messages render, credits charged, insufficient credits gating

## Patch 6B: Kanban Drag-and-Drop
- [x] Install @dnd-kit/core and @dnd-kit/utilities
- [x] Wrap Kanban board in DndContext
- [x] Make each card a Draggable item
- [x] Make each column a Droppable zone with hover highlight
- [x] Add DragOverlay ghost card
- [x] On drop: call existing stage update mutation with optimistic update
- [x] Revert on failure + show toast
- [x] Vitest tests: drag logic, revert on failure, no regression to list view

## Patch 6C: JD Snapshot — Real LLM Extraction
- [x] Add JobCardRequirements table (id, jobCardId, requirementText, requirementType, createdAt)
- [x] Push schema migration
- [x] Add db helpers: upsertRequirements, getRequirements
- [x] Replace stub extraction with real LLM call (structured JSON schema response)
- [x] LLM extracts: company_name, job_title, location, job_type + 10-25 requirement statements
- [x] Guard: JD text < 200 chars → throws "JD too short" without calling LLM
- [x] Guard: JD text > 12000 chars → truncate to 12000 for extraction, store full snapshot
- [x] Update JD Snapshot tab: Extract/Re-extract button, requirements list grouped by type with color-coded badges, inline error
- [x] Snapshot text remains immutable (extraction only writes to requirements table)
- [x] Tests: A-J) 10 tests covering extraction, persistence, field update, invalid type filtering, LLM null, disabled blocked, requirements query

## Patch 6D: Evidence Scan Full Rubric (Region Pack Weighted + Requirements-Driven)
- [x] Add scoreBreakdownJson column to evidence_runs table (text, nullable)
- [x] Push schema migration (0006)
- [x] Update evidence.run mutation: fetch job_card_requirements; if none, throw "Extract requirements first"
- [x] Single LLM call: pass requirements list + resume text, get per-item evidence + proof/status/fix/rewrites
- [x] Compute 4 component scores server-side (no LLM for scoring math): evidence_strength, keyword_coverage, formatting_ats, role_fit
- [x] Apply pack.scoringWeights to compute overall_score
- [x] COOP eligibility risk: if any eligibility requirement in requirements AND profile missing field → role_fit penalty + flag
- [x] NEW_GRAD mismatch: if resume text signals high seniority → role_fit penalty + flag
- [x] Persist scoreBreakdownJson to evidence_runs row
- [x] Update EvidenceTab UI: show 4-component breakdown with counts (matched/partial/missing)
- [x] Backward compat: if no requirements, show "Extract requirements first" with link to JD Snapshot tab
- [x] Tests: A-F (16 tests) — requirements-driven scan, strict template, pack-weighted scoring, COOP eligibility risk, NEW_GRAD mismatch, credits unchanged
