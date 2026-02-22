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

## Phase 9A Fix: Fetch from URL in Create Job Card Modal
- [x] Read Create Job Card modal structure
- [x] Add fetchJdError/fetchedAt state to modal
- [x] Add fetchFromUrl mutation (reuse existing jdSnapshots.fetchFromUrl — no backend changes)
- [x] Add "Fetch JD" button next to Job URL field (enabled only for valid https URLs, Enter key also triggers)
- [x] On success: fill Job Description textarea, show "Fetched at {time}" note in green, clear error
- [x] On error: show inline error below URL field (same error messages as JD Snapshot tab)
- [x] URL change clears previous fetch state (error + fetchedAt)
- [x] Tests: A-H (8 tests) — valid https, http disabled, non-url, procedure returns text+fetchedAt, short text error, no credits, non-https rejected, binary content-type rejected

## Phase 9A: URL Fetch Robustness (Board-Agnostic + Graceful Failures)
- [x] Read current fetchFromUrl procedure
- [x] Add Chrome-like browser headers (User-Agent, Accept, Accept-Encoding gzip/br, Cache-Control, Sec-Fetch-*) + maxRedirects: 5
- [x] Upgrade fallback extractor: remove noise tags (script/style/noscript/svg/iframe/nav/footer/header), prefer content containers (main/article/[role=main]/.job-description/.jobDescription/.description/.content/.posting/#job-description etc.)
- [x] Add gated/blocked detection: 401/403/429 HTTP + keyword check (captcha/access denied/enable javascript/sign in to view/login required) on thin pages
- [x] Return friendly GATED_MESSAGE for gated pages
- [x] All existing guardrails preserved (https-only, 2 MB, 15s timeout, binary block, MIN_CHARS)
- [x] Tests: A-J (13 tests) — Greenhouse HTML, container fallback, 403 gated, captcha keyword, https-only, binary, too-short, 404, no credits, browser headers, maxRedirects, 429, script-heavy fallback

## Phase 9B: Auto-Fill Job Title + Company After URL Fetch
- [x] Add jdSnapshots.extractFields tRPC protectedProcedure (LLM, strict JSON schema: job_title, company_name, location, job_type)
- [x] Non-destructive: only fill empty fields (title, company, location) via functional setState closures
- [x] Wire into Create Job Card modal fetchFromUrl onSuccess: call extractFields, show "Auto-filling…" spinner
- [x] On success: fill empty fields, show "Auto-filled from JD (edit anytime)." note in green
- [x] On extraction failure: silently ignore (no toast, no blocking)
- [x] Tests: A-J (10 tests) — structured fields, non-destructive contract, empty fields, no credits, LLM failure, strict schema, whitespace trim, urlHostname hint, malformed JSON

## Prompt A: Evidence Map + Application Kit Collapse + Run Label (UI Only)
- [x] Evidence Map: bold "JD:" label and JD requirement text in each EvidenceItem card (font-semibold + text-foreground)
- [x] Evidence Map: group items into collapsible sections (Skills open, Responsibilities/Soft Skills/Eligibility collapsed)
- [x] Evidence Map: show item counts in section headers (e.g. "Skills (8)")
- [x] Application Kit: make Top Changes section collapsible (open by default)
- [x] Application Kit: make Bullet Rewrites section collapsible (collapsed by default)
- [x] Application Kit: make Cover Letter Draft section collapsible (collapsed by default)
- [x] Evidence Run dropdown: replace "Run #..." with "{Company} — {Job Title} ({score}%) · {MMM D}" label
- [x] Evidence Run dropdown: keep run id as tooltip (title attribute on span)
- [x] Tests: 13 tests — openCategories, toggleCategory, sort order, kitSections, toggleKitSection, run label format, fallback, em dash, company-only, no run id in label

## Micro Fix: Evidence Run Label Consistency
- [x] Found the under-tone "Run #..." summary line in ApplicationKitTab header (line 1380)
- [x] Replaced with inline IIFE using same formatter as dropdown: "{Company} — {Job Title} ({score}%) · {MMM D}"
- [x] Run id preserved as tooltip (title attribute on span)
- [x] 431 tests pass (no regressions)

## Prompt B1: Outreach Signature — No Placeholders
- [x] Read outreach.generatePack procedure and LLM prompt template
- [x] Add phone + linkedinUrl columns to userProfiles schema (migration 0010)
- [x] Expose phone/linkedinUrl in profile.upsert mutation
- [x] Add Contact Info card to Profile page (phone + linkedin URL inputs)
- [x] Inject real phone/linkedin into generatePack LLM prompt signatureBlock (omit lines if missing)
- [x] Post-process: stripBrackets removes all bracket placeholder variants
- [x] Tests: A-K (11 tests) — all bracket variants stripped, real content preserved, signatureBlock with/without phone/linkedin, triple newline collapse

## Admin Test Mode Expansion: Outreach Pack Sandbox
- [x] Read Admin Sandbox panel and outreach.generatePack procedure
- [x] Confirmed existing generateOutreachTestMode is adminProcedure-gated (is_admin check)
- [x] Upgraded sandbox procedure: inject phone/linkedin (Prompt B1 parity) + stripBrackets
- [x] Procedure uses ctx.user.id only (no user_id override)
- [x] Added Regenerate (Test Mode) button (RefreshCw icon) to AdminSandbox UI after result is shown
- [x] Production outreach.generatePack unchanged (still credit-gated for all users including admin)
- [x] Tests: A-F (10 tests) — production charges credits, admin not exempt in production, delta=0 in sandbox, FORBIDDEN for non-admin, audit log, credits-cannot-go-negative, no user_id override

## Outreach Fix 1/4: Salutation Fallback (No "Dear ,")
- [x] Read generatePack and generateOutreachTestMode prompt builders
- [x] Add computeSalutation/fixSalutation/extractFirstName helpers in shared/outreachHelpers.ts
- [x] Inject salutation into both production and sandbox LLM prompts (Option A)
- [x] Add post-process guard: replace any remaining "Dear ," / "Dear," with "Dear Hiring Manager,"
- [x] Tests: A-J (476 tests pass)

## Phase 9C1: Personalization Sources + Tone Guardrails
- [x] Add job_card_personalization_sources table to drizzle/schema.ts
- [x] Push schema migration (pnpm db:push — migration 0011)
- [x] Add db helpers: getPersonalizationSources, upsertPersonalizationSource, deletePersonalizationSource
- [x] Add personalization tRPC router: list, upsert, delete
- [x] Build Personalization tab in JobCardDetail.tsx (add source form, list with badges, edit/delete)
- [x] Validation: min 50 chars pasted_text unless URL provided; max 5000 chars; max 5 sources
- [x] Add disclaimer note on Personalization tab
- [x] Add OUTREACH_TONE_GUARDRAILS config in shared/toneGuardrails.ts
- [x] Tests: A-L (492 tests pass)

## Phase 9C3: Enforce Outreach Tone Guardrails
- [x] Add sanitizeTone(text, isFollowUp) helper in shared/toneGuardrails.ts
- [x] Add buildToneSystemPrompt() helper that builds the guardrail injection string
- [x] Inject tone guardrails into production generatePack LLM system prompt
- [x] Inject tone guardrails into admin sandbox generateOutreachTestMode LLM system prompt
- [x] Run sanitizeTone post-process on all 4 output fields (both prod + sandbox)
- [x] Tests: A-D (510 tests pass)

## Phase 9C4: Use Personalization Sources in Outreach
- [x] Add buildPersonalizationBlock(sources) helper in shared/outreachHelpers.ts
- [x] Fetch up to 3 personalization sources in generatePack (before LLM call)
- [x] Inject personalization context block into generatePack user message
- [x] Fetch up to 3 personalization sources in generateOutreachTestMode (before LLM call)
- [x] Inject personalization context block into generateOutreachTestMode user message
- [x] Add post-process guard: personalization appears at most once in email/DM; follow-ups contain none
- [x] Update Admin Sandbox UI: show "Using personalization: Yes/No (N sources)" note
- [x] Tests: A-E (530 tests pass)

## Outreach Fix 2/4: Use Selected Contact Email (Remove [Recruiter Email] Placeholders)
- [x] Add fixContactEmail(text, email?) + buildContactEmailBlock() helpers in shared/outreachHelpers.ts
- [x] Add contactEmail to generatePack LLM prompt (Option A: To: line instruction)
- [x] Add contactEmail to generateOutreachTestMode LLM prompt
- [x] Post-process: strip [Recruiter Email] brackets; prepend To: line if missing and email provided
- [x] Update Admin Sandbox UI: add optional contact email input field
- [x] Tests: A-L acceptance criteria — 542 tests pass

## Outreach Fix 3/4: LinkedIn URL Injection (Remove [LinkedIn Profile URL] Placeholders)
- [x] Add fixLinkedInUrl(text, linkedinUrl?) + buildLinkedInBlock() helpers in shared/outreachHelpers.ts
- [x] Add linkedinUrl to generatePack LLM prompt (Option A: LinkedIn: line instruction)
- [x] Add linkedinUrl to generateOutreachTestMode LLM prompt
- [x] Post-process: strip [LinkedIn Profile URL] brackets; prepend LinkedIn: line if missing and URL provided
- [x] Update Admin Sandbox UI: add optional LinkedIn URL input field
- [x] Tests: A-O (15 tests) — 557 tests pass total

## Outreach Fix 4/4: "Copy All" Button
- [x] Create buildOutreachCopyAllText(pack) helper in client/src/lib/outreachCopyAll.ts
- [x] Add "Copy All" button to OutreachTab outreach pack card header
- [x] Show success/failure toast after clipboard write
- [x] Tests: A-I (9 tests) — 568 tests pass total

## Outreach Tab UX: Selected Contact Summary Chip
- [x] Build SelectedContactChip component (name, email, LinkedIn URL, empty state)
- [x] Insert chip above Generate/Regenerate controls in OutreachTab
- [x] Tests: A-G (8 tests) — 576 tests pass total

## Phase 9C5: Outreach Tab Personalization Context Card
- [x] Build PersonalizationContextCard component (count, list up to 3, empty state, CTA)
- [x] Insert card above generate controls in OutreachTab (below SelectedContactChip)
- [x] Wire "Edit sources" / "Add sources" CTA to switch to Personalization tab (controlled Tabs state)
- [x] Tests: A-H (14 tests) — 590 tests pass total

## Phase 9C6: Add Contact Form — LinkedIn URL Field
- [x] Add newContactLinkedInUrl state + input + https:// validation to OutreachTab Add Contact form
- [x] Pass linkedinUrl to createContact mutation
- [x] Tests: A-J (10 tests) — 601 tests pass total

## Prompt B2: Suppress JD Fetch "Console Error" Popup for Expected Failures
- [x] Create isExpectedFetchError helper (too short, blocked, invalid URL)
- [x] Update Create Job Card modal fetchFromUrl call to catch expected errors inline (already had onError → setFetchJdError)
- [x] Update JD Snapshot tab fetchFromUrl call to catch expected errors inline (already had onError → setFetchError)
- [x] Tests: 16 tests (A-G) — 617 tests pass total

## Phase 9D1: JD URL Fetch Reliability (JSON Fallback)
- [x] Add extractLdJson(html) helper: parse ld+json JobPosting blocks
- [x] Add extractNextData(html) helper: parse __NEXT_DATA__ JSON
- [x] Add extractWindowState(html) helper: parse window.__INITIAL_STATE__ / __APOLLO_STATE__ / dataLayer
- [x] Add stripHtmlToText(html) normalizer: strip tags, preserve line breaks, deduplicate paragraphs
- [x] Insert Layer C (JSON fallback) between Layer B and the "too short" guard in fetchFromUrl
- [x] Tests: A-E per acceptance criteria

## Phase 9D2: Onboarding 2.0 (Skippable + Nudges)
- [x] Remove trap redirect in Dashboard.tsx (useEffect that sends to /onboarding if !onboardingComplete)
- [x] Add onboarding_skipped_at field to userProfiles schema (minimal, nullable timestamp)
- [x] Push schema migration (pnpm db:push)
- [x] Add profile.skip tRPC mutation (sets onboardingSkippedAt = now, onboardingComplete = false)
- [x] Update Onboarding.tsx Step 1: rename "Co-op" → "Student / Co-op", "New Grad" → "Early-career / General"
- [x] Add "Skip for now" button to all 3 onboarding steps
- [x] Step 2 (Education): make optional for Early-career / General track (show "optional" label)
- [x] Step 3: replace resume upload with Work Authorization step (work_status, needs_sponsorship)
- [x] Add first-login redirect: if brand new user (no profile row) route to /onboarding once; otherwise never force
- [x] Add ProfileNudgeBanner to JobCards page (same shared component + localStorage key)
- [x] Add inline eligibility nudge to Job Card Overview tab (JD eligibility triggers + unknown profile)
- [x] Add inline contact tip nudges to Outreach tab (no contact selected, missing email/LinkedIn)
- [x] Tests: A-F (23 tests) — 666 tests pass total

## V1 Audit Polish: Priority Badge Consistency
- [x] Audit current priority badge rendering in list rows and kanban tiles
- [x] Add Medium badge (neutral style) to list rows
- [x] Add Low badge (subtle style) to list rows
- [x] Add Medium badge to kanban card tiles
- [x] Add Low badge to kanban card tiles
- [x] Ensure null/undefined priority shows no badge
- [x] Tests: A-E (17 tests) — 683 tests pass total

## Phase 10A-1: Rate Limiting (Abuse Protection)
- [x] Audit route structure — identify exact procedure names for each endpoint group
- [x] Implement in-memory rate limiter utility (server/rateLimiter.ts) — per-user + per-IP, TTL Map
- [x] Add 429 JSON helper (error/message/retryAfterSeconds + Retry-After header)
- [x] Wire limiter to Evidence/ATS run endpoint (6/user per 10 min)
- [x] Wire limiter to Outreach generate endpoint (10/user per 10 min)
- [x] Wire limiter to Application Kit generate endpoint (8/user per 10 min)
- [x] Wire limiter to JD URL fetch endpoint (30/IP per 10 min)
- [x] Wire limiter to Auth endpoints (20/IP per 10 min)
- [x] Tests: acceptance criteria A-H (25 tests) — 708 tests pass total

## Phase 10A-2: Client-side 429 Handling + No-Debit Tests
- [x] Audit spend mutation call sites (Evidence, Outreach, Kit) and confirm limiter ordering
- [x] Add 429 toast to Evidence/ATS run mutation onError
- [x] Add 429 toast to Outreach generatePack mutation onError
- [x] Add 429 toast to Application Kit generate mutation onError
- [x] Tests: 429 triggers for each spend endpoint (error=RATE_LIMITED, retryAfterSeconds, Retry-After header)
- [x] Tests: no credit debit on 429 (balance unchanged, ledger unchanged)
- [x] Tests: URL fetch per-IP 429
- [x] Tests: Auth per-IP 429 — 20 new tests (A-H), 728 total passing

## Phase 10B-1: Input Length Caps
- [x] Audit all free-text inputs in routers.ts and client forms
- [x] Create shared/maxLengths.ts with MAX_LENGTHS constants and TOO_LONG_MSG
- [x] Apply server-side Zod .max() caps: jobCards (create/update), jdSnapshots, evidence.run, outreach, applicationKits, contacts, resumes, tasks, profile, notes
- [x] Apply client-side maxLength HTML attributes to all forms (JobCards, JobCardDetail, Resumes, Profile, Outreach, Today)
- [x] Tests: A-H (19 tests) — over-limit payloads fail as BAD_REQUEST (not 500), no credits spent on validation failure
- [x] All existing tests remain green — 747 tests pass total

## Patch: ATS Score Trends UI Polish
- [x] Filter ATS Score Trends list to only jobs with ≥1 run
- [x] Show empty state "No scans yet. Run your first scan to see trends." when 0 qualifying items
- [x] Clamp displayed title to 80 chars with "…" suffix
- [x] Add overflow-wrap:anywhere + word-break:break-word to title element
- [x] Tests: A-D (13 tests) — 760 tests pass total

## Patch: ATS Score Trends — Sort + Cap + View All
- [x] Sort rows by most-recent scan date descending (latest scan timestamp)
- [x] Cap list at N=8 rows (local constant TREND_CAP)
- [x] Show "View all →" link to /analytics when total qualifying rows > N
- [x] Tests: A-D (13 tests) — 773 tests pass total

## Patch: ATS Score Trends — Run scan shortcut
- [x] Add "Run scan →" button per TrendRow navigating to /jobs/:id?tab=evidence (hover-visible, opacity transition)
- [x] Add lazy URL param initializer to JobCardDetail activeTab useState (also fixes jd-snapshot shortcut)
- [x] Tests: A-F (6 tests) — 779 tests pass total

## Patch: Analytics ATS Score History Section
- [x] Audit evidence.activeTrends query and Analytics page structure
- [x] Add getAllScannedJobCards db helper (all stages, no card limit, sorted by latest run desc)
- [x] Add evidence.allScannedJobs tRPC query (additive, read-only)
- [x] Add ATS Score History table to /analytics (Job, Last scan, Latest score, Run count, Open job link)
- [x] Default sort: last scan date desc
- [x] Expandable row: show all runs (date + score) per job (latest first)
- [x] Wire real avgScore from scanned jobs into the Avg ATS Score metric card
- [x] Tests: A-H (8 tests) — 787 tests pass total

## Patch: ATS Score Delta Highlight
- [x] Add computeDelta helper (latest score - previous score, null if <2 runs) — exported from ScoreTrendsWidget
- [x] Apply green left border + up-arrow badge when delta >= +10 in ScoreTrendsWidget TrendRow
- [x] Apply red left border + down-arrow badge when delta <= -10 in ScoreTrendsWidget TrendRow
- [x] Apply same delta indicator to Analytics ATS table rows (border-l-4 + badge)
- [x] Tests: A-B (15 tests) — 802 tests pass total

## Phase 10B-2A: HTTP Body Size Cap
- [x] Audit Express body parser setup in server/_core/index.ts (was 50mb, reduced to 512kb)
- [x] Apply express.json({ limit: "512kb" }) + urlencoded({ limit: "512kb" }) before tRPC handler
- [x] Tests: A-B (8 tests) — oversized body returns 413, normal 25kb payloads pass, 810 tests pass total

## Phase 10B-2B: Admin Operational Events
- [x] Add operational_events table to drizzle/schema.ts (9 columns, no PII, no payload)
- [x] Run db:push migration (0013_wealthy_hobgoblin.sql)
- [x] Add logOperationalEvent + adminListOperationalEvents helpers to server/db.ts
- [x] Add shortHash (16-char SHA-256 truncation) to server/rateLimiter.ts
- [x] Wire rate_limited event logging into makeRateLimitMiddleware (tRPC) and authRateLimitMiddleware (Express)
- [x] Add admin.operationalEvents.list tRPC procedure (adminProcedure, filters: endpointGroup + eventType, limit/offset)
- [x] Build AdminOperationalEvents.tsx page with endpoint/type filters, refresh button, table view
- [x] Add "Ops Events" nav item to AdminLayout.tsx
- [x] Register /admin/operational-events route in App.tsx
- [x] Tests: A-H (8 tests) — 818 tests pass total, 0 TypeScript errors

## Patch: Friendly 413 Toast
- [x] Intercept HTTP 413 in tRPC client fetch wrapper in main.tsx
- [x] Show toast.error("Your request was too large. Please shorten the text and try again.")
- [x] Tests: A-E (8 tests) — 826 tests pass total, 0 TypeScript errors

## Phase 10C-1: Stripe Checkout + Idempotent Webhook Crediting
- [x] Install stripe npm package
- [x] Add STRIPE_SECRET_KEY and STRIPE_WEBHOOK_SECRET secrets
- [x] Add stripe_events table to drizzle/schema.ts (stripeEventId unique, eventType, userId, processed)
- [x] Run db:push migration
- [x] Add stripeEventExists + recordStripeEvent db helpers to server/db.ts
- [x] Create server/stripe.ts helper (Stripe client + pack definitions)
- [x] Add stripe.createCheckoutSession tRPC procedure (protectedProcedure)
- [x] Add /api/stripe/webhook Express route with signature verification
- [x] Handle checkout.session.completed: addCredits idempotently
- [x] Handle charge.refunded: record as manual review operational event
- [x] Wire Billing.tsx Buy buttons to real Stripe Checkout redirect
- [x] Tests: A-I (9 tests) — 835 tests pass total, 0 TypeScript errors

## Patch: Stripe Copy Guard
- [x] Add isStripeTestMode to stripe tRPC router (publicProcedure, derived from STRIPE_SECRET_KEY prefix)
- [x] Guard test-card helper text in Billing.tsx with isStripeTestMode
- [x] Tests: A-E (5 tests) — 840 tests pass total, 0 TypeScript errors

## Phase 10C-2: Admin Stripe Events + Billing TX History Containment
- [x] Add adminListStripeEvents db helper to server/db.ts
- [x] Add admin.stripeEvents.list adminProcedure to server/routers/admin.ts
- [x] Cap credits.ledger query to latest 25 rows (constant LEDGER_DISPLAY_CAP)
- [x] Build /admin/stripe-events page (AdminLayout, filters, table)
- [x] Add Stripe Events nav item to AdminLayout
- [x] Register /admin/stripe-events route in App.tsx
- [x] Wrap Billing TX History list in fixed-height (380px) scroll container
- [x] Add "Showing latest N transactions" note
- [x] Tests: A-J (10 tests) — 850 tests pass total, 0 TypeScript errors

## Phase 10D-1: Auto-purge Operational Tables
- [x] Add purgeOldOperationalEvents db helper (delete where createdAt < now - 30d)
- [x] Add purgeOldStripeEvents db helper (delete where createdAt < now - 90d)
- [x] Add runDailyCleanup function that calls both helpers and logs result
- [x] Register daily cleanup job on server start (setTimeout 10s + setInterval 24h)
- [x] Tests: A-K (11 tests) — 861 tests pass total, 0 TypeScript errors

## Phase 10E-1: OpenAI Provider Behind Flag
- [x] Add LLM_PROVIDER, OPENAI_API_KEY, LLM_MODEL_OPENAI to ENV
- [x] Create server/llmProvider.ts (callLLM wrapper, provider routing, non-PII logging)
- [x] Swap invokeLLM in evidence router to callLLM
- [x] Swap invokeLLM in outreach router to callLLM
- [x] Swap invokeLLM in application kit router to callLLM
- [x] Tests: A-I (9 tests) — 870 tests pass total, 0 TypeScript errors

## Patch: Admin LLM Status
- [x] Add admin.llmStatus.get adminProcedure (returns provider + openaiModel, no secrets)
- [x] Display LLM status badge in admin dashboard header
- [x] Tests: A-H (8 tests) — 878 tests pass total (LLM_PROVIDER=manus), 0 TypeScript errors

## Patch: Test Stability (Force LLM_PROVIDER=manus)
- [x] Override LLM_PROVIDER=manus and clear OPENAI_API_KEY in vitest setup
- [x] Tests: A-C (3 tests) — 881 tests pass total, 0 TypeScript errors

## Phase 10F-1: Early Access Allowlist + Waitlist Screen
- [ ] Add earlyAccessEnabled boolean column to users table (default false)
- [ ] Run db:push migration
- [ ] Expose earlyAccessEnabled in auth.me response
- [ ] Add route guard in App.tsx (non-allowlisted → /waitlist, admin bypasses)
- [ ] Create /waitlist page (minimal, no redesign)
- [ ] Add admin.earlyAccess.setAccess adminProcedure (by userId or email)
- [ ] Add admin.earlyAccess.listUsers adminProcedure (search by email)
- [ ] Add minimal admin UI control in AdminLayout (search + toggle)
- [ ] Write acceptance tests (default false, gating, bypass, admin toggle, non-admin blocked)

## Phase 10F-1: Early Access Gating
- [x] Add earlyAccessEnabled boolean column to users table (default false)
- [x] Run db:push migration
- [x] Create /waitlist page (Waitlist.tsx)
- [x] Add EarlyAccessGuard to App.tsx (redirects non-allowlisted users to /waitlist)
- [x] Admin bypass: role=admin always passes the guard
- [x] Add admin.earlyAccess.lookupByEmail adminProcedure
- [x] Add admin.earlyAccess.setAccess adminProcedure (grant/revoke)
- [x] Add adminSetEarlyAccess + adminGetUserByEmail db helpers to server/db.ts
- [x] Build /admin/early-access page (AdminEarlyAccess.tsx)
- [x] Add Early Access nav item to AdminLayout
- [x] Register /admin/early-access route in App.tsx
- [x] Tests: A-K+J2 (12 tests) — 893 tests pass total, 0 TypeScript errors

## Patch: Waitlist Auth States
- [x] Update Waitlist.tsx: logged-out state (Sign in / Sign up, no account implication)
- [x] Update Waitlist.tsx: logged-in gated state (keep current waitlist message + Sign out)
- [x] Tests: A-F (6 tests) — 899 tests pass total, 0 TypeScript errors
