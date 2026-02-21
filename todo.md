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

## Patch 6E: Application Kit (Scan → Fix → Apply)
- [x] Add application_kits table to drizzle/schema.ts (id, jobCardId, resumeId, evidenceRunId, regionCode, trackCode, tone enum, topChangesJson, bulletRewritesJson, coverLetterText, createdAt)
- [x] Push schema migration (0007)
- [x] Add db helpers: getApplicationKit, upsertApplicationKit, getLatestApplicationKit
- [x] Add applicationKits tRPC router: get, generate, createTasks
- [x] generate: Option A credit policy (free if EvidenceRun exists for jobcard+resume)
- [x] generate: fetch EvidenceItems, prioritize missing/partial for top_changes
- [x] generate: single LLM call → top_changes_json, bullet_rewrites_json, cover_letter_text
- [x] generate: guardrail — no invented facts, needs_confirmation on items without proof
- [x] createTasks: add "Update resume bullets", "Generate/Review cover letter", "Submit application" tasks (no duplicates)
- [x] Add Application Kit tab to JobCardDetail.tsx (header with resume+run info, tone selector, Generate/Regenerate button)
- [x] Top changes section (3-5 items with status badge + fix text)
- [x] Bullet rewrites section grouped by type with Copy buttons + needs_confirmation badge
- [x] Cover letter section with Copy button
- [x] Backward-compat: show CTA if no requirements or no EvidenceRun
- [x] Tests: A-G (9 tests) — get null, no-requirements guard, no-run guard, full generation, needs_confirmation, createTasks dedup, follow-up only when applied, Option A credit policy, tone persistence

## Patch 6F: Score History Sparkline (Job Card Detail)
- [x] Add getScoreHistory db helper (jobCardId, optional resumeId, limit 20, order asc by createdAt)
- [x] Add evidence.scoreHistory tRPC query
- [x] Build ScoreTrendCard component (sparkline + current score + delta badge)
- [x] Handle 0/1/many run states gracefully
- [x] Add ScoreTrendCard to Overview tab in JobCardDetail.tsx
- [x] Hover tooltip showing date + score
- [x] Green/red delta indicator (latest vs previous)
- [x] Tests: A-F+F2 (7 tests) — empty state, single point, multi-run delta, chronological order, read-only, single query, resumeId filter

## Patch 6G: Cover Letter Export (.txt Download)
- [x] Add buildCoverLetterFilename(name, company, date?) utility in shared/filename.ts
- [x] Add downloadTextFile(filename, content) inline in ApplicationKitTab (Blob + anchor click)
- [x] Add "Download .txt" button to cover letter section in ApplicationKitTab
- [x] Button only visible when cover letter exists (conditional render guards against empty state)
- [x] Tests: 17 tests — sanitizeSegment (5), buildCoverLetterFilename (12) covering standard, single-word, missing company, forbidden chars, date formatting, empty/null name, three-part name

## Patch 8A: Score Trend — Resume Selector Dropdown
- [x] Derive resume list from evidenceRuns (unique resumeIds) + resumes prop
- [x] Add selectedResumeId state to ScoreTrendCard (default: first in selectable list)
- [x] Hide dropdown when only 1 selectable resume (selectableResumes.length <= 1)
- [x] Add resume selector dropdown in Score Trend card header (right side)
- [x] Filter scoreHistory query by selectedResumeId
- [x] Empty state when selected resume has 0 runs (different message when dropdown visible)
- [x] Tests: A-G+A2+B2+C2+D2 (11 tests) — one resume hidden, multiple shown, orphaned run IDs, dedup, empty state messages, default selection, title mapping

## Patch 8B: Work Authorization Eligibility (Citizen/PR vs Temp Resident)
- [x] Add work_status, work_status_detail, needs_sponsorship, country_of_residence, willing_to_relocate fields to userProfiles table
- [x] Push schema migration (0008)
- [x] Update Region Pack schema: add eligibility_checks array with rule objects (trigger_phrases, condition, penalty, message)
- [x] Add CA_COOP and CA_NEW_GRAD eligibility rules (4 rules: Citizen/PR, no sponsorship, unknown status, location)
- [x] Add eligibility detection logic to evidence.run mutation (scan job_card_requirements or JD text for triggers)
- [x] Apply role_fit penalties via pack rules and persist eligibility flags in scoreBreakdownJson
- [x] Build Eligibility banner/section in JobCardDetail Overview tab (show triggered rules + guidance)
- [x] Add work status profile fields to user profile UI (Profile page at /profile)
- [x] Tests: 10 tests passing (218 total)

## Patch 8B Part 2: Work Auth Eligibility Detection + UI + Role Fit Penalties
- [x] Add evaluateWorkAuthRules() helper: scan JD text for trigger phrases, evaluate conditions against profile, return triggered rules
- [x] Integrate evaluateWorkAuthRules into evidence.run mutation after role_fit score computed
- [x] Apply penalties to role_fit_score (clamp 0-100) and persist workAuthorizationFlags in scoreBreakdownJson
- [x] Show compact "Work authorization" flag list in Evidence tab score breakdown area (EligibilityBanner in Overview)
- [x] Add Eligibility section/card to JobCardDetail Overview tab (triggered rules + guidance + Update work status link)
- [x] Add work status fields to user settings/profile page (work_status, work_status_detail, needs_sponsorship, country_of_residence, willing_to_relocate)
- [x] Add profile.updateWorkStatus tRPC mutation
- [x] Tests: 1-8 (10 tests) — citizen/PR no penalty, temp resident penalty, sponsorship penalty, unknown soft penalty, no trigger no penalty, role_fit clamped to 0, scoreBreakdownJson structure, updateWorkStatus mutation

## Patch 8C1: Eligibility Pre-Check on Job Card Creation (Soft Badge)
- [x] Add eligibilityPrecheckStatus enum (none|recommended|conflict), eligibilityPrecheckRulesJson (text nullable), eligibilityPrecheckUpdatedAt to jobCards table
- [x] Push schema migration (0009)
- [x] Add runEligibilityPrecheck(jdText, profile, pack) pure helper: returns { status, triggeredRules }
- [x] Wire into jdSnapshots.save: after snapshot saved, run precheck and update job card
- [x] Wire into jobCards.create: if JD text provided, run precheck after card created
- [x] eligibilityPrecheckStatus returned via existing jobCards.list/get (Drizzle returns all columns)
- [x] Render "Eligibility" badge (amber) and "Eligibility risk" badge (red) on list view rows
- [x] Render same badges on Kanban card tiles
- [x] Badge tooltip: "Based on the job description. Complete your profile or run a scan for details."
- [x] Badge click: navigate to job card detail page
- [x] Tests: A-F+EC (18 tests) — conflict, recommended, none, case-insensitive, multiple rules, null profile, pure function, no credits, no block on failure

## Patch 8C2: Dashboard Profile Completeness Nudge
- [x] Add ProfileNudgeBanner component (dismissible, localStorage persistence 30 days)
- [x] Show banner on Dashboard only when work_status is unknown/null
- [x] Primary CTA: "Complete profile" → /profile
- [x] Secondary: "Dismiss" with X icon (keyboard accessible)
- [x] localStorage key: profileNudgeDismissed with timestamp, 30-day expiry
- [x] Tests: A-D+EC (14 tests) — unknown shows, set hides, dismiss persists, 30-day expiry, expired re-shows, invalid storage, empty string treated as unknown

## Patch 8C3: Eligibility Pre-Check on JD URL Import (Parity)
- [x] Confirmed: no separate URL import/scrape flow exists — url field is metadata only
- [x] Both JD entry paths (jobCards.create + jdSnapshots.create) already have precheck wired (8C1)
- [x] Tests: A-D (11 tests) — conflict detection, no-trigger none, null profile recommended, citizen_pr no conflict, pure function shape, empty rules

## Patch 8C4: Profile Completeness Nudge on Today Page
- [x] Extract ProfileNudgeBanner to shared component (client/src/components/ProfileNudgeBanner.tsx)
- [x] Update Dashboard to import from shared component (useProfileNudge hook)
- [x] Add ProfileNudgeBanner to Today page (same condition + localStorage key)
- [x] Tests: A-D+EC (15 tests) — unknown shows, dismiss shared key, known status hides, NUDGE_KEY constant, TTL expiry

## Patch 8D: Bullet Rewrites Export (.txt "Resume Patch")
- [x] Add buildResumePatchFilename(name, company, date?) to shared/filename.ts
- [x] buildResumePatchText logic inline in the onClick handler (no separate helper needed)
- [x] Add "Download .txt" button to ApplicationKitTab bullet rewrites section (card header right side)
- [x] Button renders only when bulletRewrites.length > 0 (conditional render guard)
- [x] Tests: A-E (19 tests) — conditional render, filename convention (7), content structure (4), needs_confirmation, cover letter regression (4)

## Patch 8E: Top Changes Export (.txt Action Checklist)
- [x] Add buildTopChangesFilename(name, company, date?) to shared/filename.ts
- [x] Add "Download .txt" button to ApplicationKitTab Top Changes card header (left of Create Tasks button)
- [x] Button renders only when topChanges.length > 0 (conditional render guard)
- [x] Tests: A-D (19 tests) — render guard, filename convention (8), content structure (4), no regressions to cover letter + resume patch (5)

## Patch 8F: Download Kit (.zip) — Bundle All Three Exports
- [x] Install JSZip (pnpm add jszip + @types/jszip)
- [x] Add buildApplicationKitZipFilename(name, company, date?) to shared/filename.ts
- [x] Add "Download Kit (.zip)" button to ApplicationKitTab header (left of Generate/Regenerate)
- [x] Button renders when existingKit AND any of: coverLetterText, bulletRewrites, topChanges exist
- [x] Zip contains only files with content; filenames use existing builders
- [x] Tests: A-D (16 tests) — filename convention (8), zip label+separators (2), regression (4), fallbacks (2)

## Patch 8G: Dashboard Score Trends (Multi-Card Mini Sparklines)
- [x] Add getActiveScoredJobCards db helper: fetch active job cards + last 10 evidence run scores in one query (no N+1)
- [x] Add evidence.activeTrends tRPC protectedProcedure
- [x] Build ScoreTrendsWidget component (mini sparklines per card, latest score, delta badge)
- [x] Add ScoreTrendsWidget to Dashboard below stats cards, above Today's Tasks grid
- [x] Empty state: "Run your first scan to see trends" when no cards have runs
- [x] "No runs yet" row state for cards without runs
- [x] Tests: A-H (8 tests) — activeTrends returns cards, series ordering, latest score+delta, no N+1, empty state, zero-run cards, grouping logic, trim logic

## Patch 8H: Application Kit Regeneration Guard
- [x] Read ApplicationKitTab to understand generate/regenerate button state
- [x] Add AlertDialog (shadcn) with "Replace existing kit?" title, body text, Replace kit/Cancel buttons
- [x] Wire guard: no kit → generate immediately; kit exists → open dialog first (showConfirmDialog state)
- [x] Cancel closes dialog, no generation call
- [x] Confirm proceeds with existing generate mutation, disables button during loading
- [x] Keyboard accessible: ESC closes, focus trap (Radix AlertDialog built-in)
- [x] Tests: A-G (7 tests) — no kit immediate, kit exists dialog, cancel no-op, confirm generate, state transitions, composite key, dialog content spec

## Patch 8I: JD URL Fetch (Auto-Populate JD Snapshot from a Link)
- [x] Read JD Snapshot tab UI and existing jdSnapshots router
- [x] Install @mozilla/readability + jsdom for server-side HTML extraction
- [x] Add jdSnapshots.fetchFromUrl tRPC protectedProcedure with guardrails (https-only, 2MB size limit, 15s timeout, content-type block, 403/404/429 handling)
- [x] Extract readable text from HTML (Readability first, fallback to script/style strip + whitespace collapse)
- [x] Add URL input + "Fetch from URL" button to JD Snapshot tab UI (Enter key also triggers)
- [x] On success: populate JD paste textarea with fetched text, show "Fetched at {time}" note, clear URL input
- [x] Error states: timeout, blocked/403, too short (<200 chars), non-https, 404, binary content-type
- [x] Tests: A-J (15 tests) — valid fetch, axios call args, eligibility precheck, all error cases, no-credits, truncation, guardrail unit tests

## Patch 8J: Evidence Run History Panel (Past Runs in Evidence Tab)
- [x] Read Evidence Map tab and existing evidence router
- [x] Add collapsible "Past Runs" section to Evidence Map tab (default collapsed, chevron rotates on open)
- [x] List items: run date/time, overall score, color-coded (green/amber/red), delta vs previous (TrendingUp/Down/Minus icon), resume name
- [x] Clicking a run sets it as the active run (Option A: read-only view of that run's EvidenceItems + score breakdown)
- [x] Active run highlighted with left border + "Viewing" badge
- [x] Limit to last 20 runs (slice logic)
- [x] Empty state: "No past runs yet."
- [x] Tests: A-G (11 tests) — descending order, run fields, items per run, empty state, no credits, delta logic, 20-run limit, non-completed status

## Patch 8K: JD Snapshot Diff View (Side-by-Side Changes Between Versions)
- [x] Read JdSnapshotTab structure and snapshot data shape
- [x] Implement line-based LCS diff helper (pure function: computeLineDiff) in SnapshotDiffView.tsx
- [x] Build SnapshotDiffView component: two-column layout, green additions (right), red removals (left), summary badge bar
- [x] Add Snapshot History section to JdSnapshotTab (last 10 versions, date/time, version badge, sourceUrl link)
- [x] From/To version selectors + "View diff" lazy render trigger + "Hide diff" toggle
- [x] Auto-select oldest→newest if user clicks View diff without selecting versions
- [x] Single snapshot: show "No prior version to compare." (diff controls hidden)
- [x] Cap diff at 20k chars with "Diff truncated for performance" amber note
- [x] Tests: A-G (11 tests) — single snap guard, two-snap diff, added right-only, removed left-only, no credits, truncation, summary counts, identical, completely different, column length parity
