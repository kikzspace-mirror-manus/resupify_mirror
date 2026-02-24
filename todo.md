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

## Patch: Early Access Credit Grant
- [x] Add earlyAccessGrantUsed boolean (default false) to users table
- [x] Run db:push migration (0016_freezing_grim_reaper.sql)
- [x] Wire one-time +10 credit grant into admin.earlyAccess.setAccess (false→true, earlyAccessGrantUsed=false only)
- [x] Mark earlyAccessGrantUsed=true after grant
- [x] Update AdminEarlyAccess.tsx: show "Access granted — 10 starter credits added." or "Access granted (credits already awarded previously)."
- [x] Write acceptance tests (first grant, idempotent, revoke+re-grant, non-admin blocked)
- [x] Tests: A-J (10 tests) — 909 tests pass total, 0 TypeScript errors

## Patch: Waitlist Notify-Owner via Ops Event
- [x] Add "waitlist" to endpointGroup enum in drizzle/schema.ts
- [x] Add "waitlist_joined" to eventType enum in drizzle/schema.ts
- [x] Run db:push migration (0017_wooden_landau.sql)
- [x] Add 24h dedupe helper (waitlistEventRecentlyLogged) in server/db.ts
- [x] Add waitlist.joined protectedProcedure in server/routers.ts
- [x] Wire Waitlist.tsx: call mutation on logged-in gated branch (once, useEffect)
- [x] Update admin ops events filter: added waitlist/waitlist_joined to AdminOperationalEvents.tsx and admin.ts router
- [x] Write acceptance tests (A-J, 10 tests) — 919 tests pass total, 0 TypeScript errors

## V2 Phase 1A: DB Fields + Feature Flags (Additive Only, No UI)
- [x] Add countryPackId (enum VN/PH/US, nullable) to users table
- [x] Add languageMode (enum en/vi/bilingual, default "en") to users table
- [x] Add countryPackId (enum VN/PH/US, nullable) to job_cards table
- [x] Add canonicalLanguage, canonicalText, localizedLanguage, localizedText, translationMeta to application_kits table
- [x] Run db:push migration (0018_silky_zombie.sql)
- [x] Add feature flag module (shared/featureFlags.ts): v2CountryPacksEnabled, v2VnTranslationEnabled, v2BilingualViewEnabled — all OFF by default
- [x] Write acceptance tests (A-L, 12 tests) — 931 tests pass total, 0 TypeScript errors

## V2 Phase 1B: Country Pack Resolution Helper + Pack Registry + Translation Utilities
- [x] Create shared/countryPacks.ts: CountryPackId type, countryPackRegistry (VN/PH/US with language/style metadata)
- [x] Add resolveCountryPack(userId, jobCardId?) helper to server/db.ts
- [x] Create server/v2Translation.ts: shouldTranslateToVietnamese, translateEnToVi, prepareLocalizedFieldsForApplicationKit
- [x] Write server/v2-phase1b.test.ts: 25 tests (A-U) — 956 tests pass total, 0 TypeScript errors

## V2 Phase 1B.1: Add GLOBAL Country Pack + Set Default to GLOBAL
- [x] Add "GLOBAL" to CountryPackId type, COUNTRY_PACK_IDS, and countryPackRegistry in shared/countryPacks.ts
- [x] Set DEFAULT_COUNTRY_PACK_ID = "GLOBAL" in shared/countryPacks.ts
- [x] Update v2-phase1b.test.ts: assert default resolves to GLOBAL, inheritance unchanged (H2, H4, H5 + updated C, E) — 958 tests pass, 0 TypeScript errors

## V2 Phase 1A.1: Add GLOBAL to countryPackId DB Enums
- [x] Update countryPackId enum in drizzle/schema.ts to include "GLOBAL" for users and job_cards
- [x] Run db:push migration (0019_aberrant_longshot.sql)
- [x] Add test: v2-phase1a1.test.ts (A-G, 8 tests); updated v2-phase1a.test.ts D and F — 966 tests pass, 0 TypeScript errors

## V2 Phase 1B.2: Analytics Foundations + Growth KPI Dashboard
- [x] Add analytics_events table to drizzle/schema.ts with indexes
- [x] Add v2AnalyticsEnabled and v2GrowthDashboardEnabled flags to shared/featureFlags.ts
- [x] Run db:push migration (0020_analytics_events.sql)
- [x] Create shared/analyticsEvents.ts: canonical event name constants + FUNNEL_STEPS
- [x] Create server/analytics.ts: logAnalyticsEvent (fire-and-forget, never blocks)
- [x] Add KPI query helpers to server/db.ts (getWAU, getMAU, getNewUsers, getActivatedUsers7d, getFunnelCompletion7d, getP95AiLatency7d, getOutcomeCounts, getErrorCount7d)
- [x] Instrument server-side flows: signup (oauth.ts), job_card_created, quick_match_run, cover_letter_generated, outreach_generated, paywall_viewed (stripe.createCheckoutSession), purchase_completed (stripeWebhook)
- [x] Add admin.growth.kpis tRPC procedure to admin.ts router
- [x] Create client/src/pages/admin/AdminGrowthDashboard.tsx (admin-only, flag-gated, N/A for missing metrics)
- [x] Wire /admin/growth route in App.tsx and Growth nav item in AdminLayout.tsx
- [x] Write server/v2-phase1b2.test.ts (A-P, 33 tests) — 991 tests pass total, 0 TypeScript errors

## Patch: Growth Dashboard Flag Gating Fix + Flag Status Panel
- [x] Audit shared/featureFlags.ts: env var names V2_GROWTH_DASHBOARD_ENABLED and V2_ANALYTICS_ENABLED confirmed correct, no typos
- [x] Update admin.growth.kpis to return analyticsEnabled in both enabled and disabled states
- [x] AdminGrowthDashboard.tsx: add FlagStatusBox component (shows ON/OFF for both flags)
- [x] AdminGrowthDashboard.tsx: show analytics-off warning banner when growth=true but analytics=false
- [x] AdminGrowthDashboard.tsx: 3 states (both-off, growth-on+analytics-off, both-on)
- [x] Updated v2-phase1b2.test.ts test I: 4 sub-tests (both-false, growth-true+analytics-false, both-true, basic shape) — 993 tests pass, 0 TypeScript errors

## Patch: Growth Dashboard — DB-Based New Users + Instrumentation Health Widget
- [x] Replace getNewUsers(days) in server/db.ts: use users.createdAt (DB ground truth) instead of analytics_events
- [x] Add getInstrumentationHealth24h() helper: events24h count, lastEventAt, topEvents24h (top 5 by name)
- [x] Update admin.growth.kpis: use DB-based newUsers7d/30d; add instrumentationHealth to response
- [x] Add Instrumentation Health card to AdminGrowthDashboard.tsx (3-column: events24h, last event, top events)
- [x] Write tests Q (DB-based new users, 2 tests), R (activation rate 0-100 or null), S (instrumentation health, 4 tests)
- [x] Fix v2-phase1a.test.ts test K: assert boolean type only (env-driven flags) — 1000 tests pass, 0 TypeScript errors

## Patch: Growth Dashboard Layout Cleanup + Timeline View
- [x] Add getDailyMetrics(rangeDays: 7|14|30) helper to server/db.ts (raw SQL to avoid MySQL ONLY_FULL_GROUP_BY)
- [x] Add admin.timeline.daily tRPC procedure to admin.ts router
- [x] Rewrite AdminGrowthDashboard.tsx: Row 1 (Audience+Activation), Row 2 (Quality+Monetization), Row 3 (Timeline chart with recharts), Row 4 (Funnel+Outcomes), collapsible Instrumentation Health
- [x] recharts already available via pnpm workspace
- [x] Write acceptance tests T (getDailyMetrics, 4 tests) and U (admin.timeline.daily, 4 tests) — 1008 tests pass, 0 TypeScript errors
## Phase 9E0: Contact Edit UI (Inline/Dialog)
- [x] Add Dialog import to JobCardDetail.tsx
- [x] Add editingContact state + editForm state to OutreachTab
- [x] Add updateContact trpc.contacts.update mutation with invalidate + toast
- [x] Add Edit (Pencil) button to each contact row in contacts list
- [x] Render EditContactDialog modal with pre-filled fields (name, role, email, linkedinUrl, notes)
- [x] LinkedIn URL validation in edit form (blank ok; if present must start with https://)
- [x] Email basic format validation in edit form (blank ok)
- [x] Write acceptance tests A-D in server/contact-edit.test.ts
- [x] Verify 1020 tests pass (12 new), 0 TypeScript errors
## Phase 9E0.1: Application Kit Tone Clarity
- [x] Show inline note after tone buttons when existingKit exists and tone !== existingKit.tone
- [x] Note text: "Tone applies when you regenerate. Current kit tone: {existingKit.tone}."
- [x] No note shown when no kit exists
- [x] Write acceptance tests A-C in server/kit-tone-clarity.test.ts
- [x] Verify all tests pass, 0 TypeScript errors
## Phase 9E1: Create Job Card Modal — URL Fetch Above Company/Location
- [x] Reorder fields: Title → URL+Fetch → Company+Location → Priority+Season → JD textarea
- [x] Preserve Enter-on-URL-field triggers fetch
- [x] Preserve auto-fill non-destructive behavior
- [x] Write acceptance tests A-C in server/create-job-card-field-order.test.ts
- [x] Verify all tests pass, 0 TypeScript errors
## Phase 9E2: Outreach Pack — Move Regenerate + Copy All to Header
- [x] Move "Copy all" button to Outreach Pack card header (top-right), keep visibility rule (only when pack exists)
- [x] Move "Regenerate Pack (1 credit)" button to header next to Copy all
- [x] Remove bottom Regenerate button from inside the pack content area
- [x] Keep packError display near the header buttons
- [x] Preserve loading/disabled states and all mutation logic
- [x] Write acceptance tests A-D in server/outreach-pack-header-buttons.test.ts
- [x] Verify all tests pass, 0 TypeScript errors
## Phase 9E2.1: Outreach Pack Header — Regenerate Button Green
- [x] Change Regenerate Pack header button from variant="outline" to variant="default" (primary green)
- [x] Keep Copy all as variant="ghost" (secondary/neutral)
- [x] Write structural test confirming variant in source
- [x] Verify all tests pass, 0 TypeScript errors
## Phase 9E3: Application Kit Header Polish (2-row layout)
- [x] Row 1: Resume selector + Evidence Run selector (left), Download Kit + Regenerate Kit (right)
- [x] Row 2: Tone pills on one line below Row 1
- [x] Tone mismatch note: render as small helper text under tone pills (not a banner)
- [x] Metadata line: "Generated ... · Tone: X · Included free" as muted small text below Row 2
- [x] Increase whitespace between header card and first accordion section
- [x] Write acceptance tests A-D (Phase 9E3)
- [x] Verify all tests pass, 0 TypeScript errors (Phase 9E3)## Phase 9E4: Quick Archive Action (List + Board)
- [ ] Add DropdownMenu import to JobCards.tsx (MoreHorizontal icon + DropdownMenu components)
- [ ] Add archiveJobId state + archiveConfirmOpen state to JobCards component
- [ ] Add archiveCard mutation (uses existing updateStage / jobCards.update) with optimistic update
- [ ] Add "..." menu button to list view rows (Archive / Unarchive)
- [ ] Add "..." menu button to KanbanCard tiles (Archive / Unarchive) - pass onArchive/onUnarchive props
- [ ] Add lightweight Archive confirm AlertDialog (no confirm for Unarchive)
- [ ] Pass stage field in KanbanCard job prop to determine Archive vs Unarchive
- [x] Write acceptance tests A-F (27 tests: A1-A6, B1-B5, C1-C6, D1-D3, E1-E4, F1-F3)
- [x] Verify all 1187 tests pass, 0 TypeScript errors

## Phase 9E4.1: Job Cards Stage Filter — Add "Archived" Option
- [x] Confirm STAGES already includes "archived" (it does — line 302 of regionPacks.ts)
- [ ] Remove "archived" from STAGES.map loop in filter dropdown (to avoid duplicate with explicit item)
- [ ] Add explicit "Archived" SelectItem with visual separator after the main stages
- [ ] Verify filtering behavior: selecting Archived shows only archived cards in list + board
- [x] Write acceptance tests A-D (22 tests)
- [x] Verify all 1187 tests pass, 0 TypeScript errors

## Phase 9E6: AdminOperationalEvents TS Fix (Admin-only Enum Mismatch)
- [x] Create shared/operational-events.ts with endpointGroupSchema and eventTypeSchema Zod enums
- [x] Update admin.ts to import and use Zod enum schemas
- [x] Update AdminOperationalEvents.tsx to import types from shared constants
- [x] Verify tsc --noEmit returns 0 errors
- [x] Verify all 1117 tests pass, no regressions
- [x] Note: LSP warning persists due to Zod type inference cache issue (known TypeScript LSP limitation), but code is correct and compiles cleanly

## Phase 9E8: Job Cards — Sort by Created Date (Newest/Oldest)
- [ ] Add sortBy state (default: "newest") to JobCards component
- [ ] Add Sort dropdown in filter bar (Newest first / Oldest first)
- [ ] Implement client-side sorting by createdAt (ascending/descending)
- [ ] Apply sorting to list view rows
- [ ] Apply sorting to Kanban columns (optional, or list view only)
- [x] Write acceptance tests A-D (22 tests)
- [x] Verify all 1187 tests pass, 0 TypeScript errors

## Phase 9E8: Job Cards — Sort by Created Date (Newest/Oldest)
- [x] Add sortBy state (default: "newest") to JobCards component
- [x] Add Sort dropdown in filter bar (Newest first / Oldest first)
- [x] Implement client-side sorting by createdAt (ascending/descending)
- [x] Apply sorting to list view rows
- [x] Write acceptance tests A-D (13 tests, all passing)
- [x] Verify all 1130 tests pass, 0 TypeScript errors

## Phase 9E9: Job Cards List — Show "Created" Date on Each Row
- [x] Add created date display to each list row (format: "Created: Feb 23")
- [x] Placement: subtle/muted, aligned with metadata (company/location/dueDate)
- [x] Fallback: hide label if createdAt is null
- [x] Write acceptance tests A-C (15 tests: A1-A3, B1-B4, C1-C5, D1-D3)
- [x] Verify all 1145 tests pass, 0 TypeScript errors

## Phase 9E7 (RE-DO): Job Cards List — Bulk Archive Selected
- [ ] Add checkbox column to list view (left-most, before title)
- [ ] Add header checkbox that selects/deselects all visible rows
- [ ] Add selectedIds state to JobCards component
- [ ] Implement bulk action bar (sticky, under filters) with "{N} selected", "Archive selected", "Clear"
- [ ] Add confirm dialog for bulk archive with progress tracking
- [ ] Implement archive logic: call jobCards.update sequentially (max 3 concurrent)
- [ ] Show progress text: "Archiving X/Y…" during operation
- [ ] Handle already-archived cards (skip silently)
- [ ] Show toast on completion: "Archived {success}/{attempted}"
- [ ] Keep failed items selected for retry
- [ ] Write acceptance tests A-F (checkbox, header checkbox, archive, skip archived, failures, Kanban unaffected)
- [x] Verify all 1187 tests pass, 0 TypeScript errors

## Phase 9E7 (RE-DO): Job Cards List — Bulk Archive Selected (COMPLETED)
- [x] Add checkbox column to list view (left-most, before title)
- [x] Add selectedIds state to JobCards component
- [x] Implement bulk action bar (sticky, under filters) with "{N} selected", "Archive selected", "Clear"
- [x] Add confirm dialog for bulk archive with progress tracking
- [x] Implement archive logic: call jobCards.update sequentially (max 3 concurrent)
- [x] Show progress text: "Archiving X/Y…" during operation
- [x] Handle already-archived cards (skip silently)
- [x] Show toast on completion: "Archived {success}/{attempted}"
- [x] Keep failed items selected for retry
- [x] Write acceptance tests A-F (16 tests: A1-A3, B1-B3, C1-C3, D1-D2, E1-E2, F1-F3)
- [x] Verify all 1161 tests pass, 0 TypeScript errors

## Phase 9E7.1: Bulk Archive Fix (Header Select-All + Filter-Scoped Selection + Layout)
- [x] Add header select-all checkbox with indeterminate state
- [x] Implement filter-scoped selection (respects visible rows only)
- [x] Fix archived row handling (skip silently, disable button when all selected are archived)
- [x] Verify row layout (priority badge stays in title line, no regression)
- [x] Update acceptance tests A-G (added 4 new tests: B3 indeterminate, D2-1/D2-2 layout, F1/F2 archived button)
- [x] Verify all 1165 tests pass, 0 TypeScript errors

## Phase 9E7.2: Bulk Archive Fix — Checkbox Click + Hide Archived By Default
- [x] Fix checkbox click handling with data-bulk-select attribute
- [x] Add stopPropagation on checkbox wrapper and checkbox element
- [x] Add stopPropagation on mouseDown to prevent navigation capture
- [x] Guard row onClick to check if click is within [data-bulk-select]
- [x] Hide archived items by default in "All Stages" filter
- [x] Show archived items only when Stage filter = "Archived"
- [x] Update filtering logic to exclude archived when filterStage === "all"
- [x] Verify bulk selection respects visible filtered rows
- [x] Write acceptance tests A-D (11 tests: A1-A3, B1-B3, C1-C3, D1-D2)
- [x] Verify all 1176 tests pass, 0 TypeScript errors

## Phase 9E7.4: Fix Forever Archiving State + Restore Deselect All (COMPLETED)
- [x] Fix forever archiving state with try/catch/finally
- [x] Ensure setBulkArchiveProgress(null) in finally block
- [x] Fix header checkbox to toggle select all / deselect all
- [x] Implement allVisibleSelected logic for header checkbox
- [x] Prune selectedIds after list changes to avoid phantom selections
- [x] Write acceptance tests (11 tests: 1A-1B, 2A-2B, 3A-3D, 4A-4C)
- [x] Verify all 1187 tests pass, 0 TypeScript errors

## Phase 9E7.4 (v2): Fix 3-item cap + Forever Archiving + Deselect All
- [x] Remove 3-item cap in bulk archive (archive ALL selected)
- [x] Implement chunking (15 per chunk) with Promise.allSettled
- [x] Add 200ms delay between chunks
- [x] Verify try/catch/finally resets progress state
- [x] Add 15s request timeout per item with clearTimeout on success/error
- [x] Write acceptance tests (16 tests: 1A-1D, 2A-2B, 3A-3C, 4A-4D, 5A-5C)
- [x] Verify all 1203 tests pass, 0 TypeScript errors

## Phase 9E10: Contacts Page — Used in Job Cards + Created + Last/Next Touch
- [x] Read existing schema (contacts, outreach_threads, job_cards tables)
- [x] Create contacts.listWithUsage tRPC procedure (aggregated, no N+1)
- [x] Return: contact fields, usedInCount, mostRecentJobCard, lastTouchAt, nextTouchAt, recentJobCards[]
- [x] Default sort: most recent activity desc, fallback createdAt desc
- [x] Update Contacts page UI: show Created date
- [x] Show "Not used yet" for contacts with no threads
- [x] Show "Used in: Company — Title (Stage)" for single usage
- [x] Show "Used in: N job cards" + View popover for multiple usages
- [x] Show Last touch / Next touch where available
- [x] Write acceptance tests A-F (27 tests: A1-A6, B1-B5, C1-C6, D1-D3, E1-E4, F1-F3)
- [x] Verify all 1230 tests pass, 0 TypeScript errors

## Phase 9E10.1: Contacts Linking Fix — Real Usage Data + Clickable Navigation
- [ ] Diagnose linking source of truth (contacts.jobCardId vs outreach_threads.contactId)
- [ ] Fix getContactsWithUsage to query correct relationship
- [ ] Fix frontend: single-job contact row navigates to /jobs/:id
- [ ] Fix frontend: multi-job popover items navigate to /jobs/:id
- [ ] Correct empty state: only show "Not used yet" when linkedJobCount === 0
- [x] Write acceptance tests A-D (22 tests)
- [ ] Verify all tests pass, 0 TypeScript errors

## Phase 9E10.1: Contacts Linking Fix (COMPLETED)
- [x] Diagnose why contacts show "Not used yet" (missing direct contacts.jobCardId link)
- [x] Fix getContactsWithUsage to LEFT JOIN job_cards via contacts.jobCardId (direct link)
- [x] Seed contactMap with direct link before processing threads
- [x] Fix UsedInBadge navigation: use useLocation navigate() instead of Link
- [x] Fix popover navigation: close popover then navigate on click
- [x] Fix routers.ts UTF-8 box-drawing comment causing esbuild error
- [x] Write acceptance tests A-D (18 tests) covering direct link, thread link, dedup, navigation
- [x] All 1248 tests pass, 0 TypeScript errors

## Phase 9E10.2: Outreach CRM Compact Table View (COMPLETED)
- [x] Replace large cards with compact table on desktop (column headers + rows)
- [x] Compact card layout for mobile (less padding)
- [x] Column headers: Name, Role, Email, Links, Used in, Last touch, Next touch
- [x] Row height ~44-52px, truncate long fields with ellipsis (Tooltip on hover)
- [x] Keep existing search/sort behavior
- [x] Write acceptance tests A-D (22 tests)
- [x] All 1270 tests pass, 0 TypeScript errors

## Phase 9E10.3: Outreach CRM Table Formatting + Status Column + Edit Action (COMPLETED)
- [x] Fix table column widths (table-fixed + colgroup, minWidth 900px)
- [x] Add Status column header and status pills under it
- [x] Add Edit action per row (Pencil icon, stopPropagation)
- [x] Edit Contact modal pre-fills all fields and saves via contacts.update
- [x] Write acceptance tests A-E (23 tests)
- [x] All 1293 tests pass, 0 TypeScript errors

## Phase 9E10.4: Outreach CRM — Stage Column + Status as Flags (COMPLETED)
- [x] Add Stage column header with job card stage pill
- [x] Update Status column to show derived flags (Active/Archived/Rejected/Offered)
- [x] Schema has no separate flags field; Status derived from stage
- [x] Write acceptance tests A-E (27 tests)
- [x] All 1320 tests pass, 0 TypeScript errors

## Phase 9E10.5: Outreach CRM — Replace Status with Priority + Truncate Used in (IN PROGRESS)
- [ ] Remove Status column (no "Active" pills)
- [ ] Add Priority column (High/Medium/Low from linked job card)
- [ ] Truncate "Used in" with ellipsis + tooltip
- [ ] Add resizable "Used in" column with localStorage persistence
- [ ] Write acceptance tests A-G
- [x] All 1378 tests pass, 0 TypeScript errors

## Phase 9E10.5: Outreach CRM — Priority Column + Truncate Used in + Resizable Column
- [x] Remove Status column (derived "Active" pill)
- [x] Add Priority column showing job priority (high/medium/low) from mostRecentJobCard
- [x] Add priority to getContactsWithUsage backend query (directJobPriority + thread jobPriority)
- [x] Truncate "Used in" cell with overflow-hidden + max-w-0 for proper table truncation
- [x] Add resizable "Used in" column with drag handle (min 180px, max 520px)
- [x] Persist column width to localStorage (key: outreach-used-in-width)
- [x] Write acceptance tests A-G (29 tests)
- [x] All 1349 tests pass, 0 TypeScript errors

## Phase 9E11: Nav Label Cleanup — Rename "Outreach CRM" to "Contacts"
- [x] Rename sidebar nav label from "Outreach" to "Contacts" (DashboardLayout.tsx)
- [x] Rename page header h1 from "Outreach CRM" to "Contacts" (Outreach.tsx)
- [x] Route /outreach unchanged
- [x] Write acceptance tests A-D (12 tests)
- [x] All 1361 tests pass, 0 TypeScript errors

## Phase 9E12: Contact Delete Button
- [x] Add Trash icon next to Pencil on each contact row (desktop table + mobile card)
- [x] Confirm dialog: "Delete contact?" with warning
- [x] Call contacts.delete(contactId) on confirm
- [x] Invalidate listWithUsage after delete
- [x] Write acceptance tests A-D (17 tests)
- [x] All 1378 tests pass, 0 TypeScript errors

## Phase 10A: Rate Limits + Abuse Protection
- [ ] Create rate_limits table in schema (userId, endpoint, windowStart, callCount, activeCount)
- [ ] Push DB migration (pnpm db:push)
- [ ] Implement rateLimiter helper (sliding window, concurrency guard, admin bypass)
- [ ] Apply to evidence.scan (AI, 10/10min, concurrency 1)
- [ ] Apply to applicationKits.generate (AI, 10/10min, concurrency 1)
- [ ] Apply to outreach.generatePack (AI, 10/10min, concurrency 1)
- [ ] Apply to jdSnapshots.extract (AI, 10/10min, concurrency 1)
- [ ] Apply to jdSnapshots.fetchFromUrl (network, 10/hour)
- [ ] Return 429 with RATE_LIMITED code and retry-after seconds
- [ ] Frontend: show friendly toast for 429, no scary overlay
- [ ] Write acceptance tests A-E
- [x] All 1815 tests pass (109 test files), 0 TypeScript errors

## Phase 10A: Rate Limits + Abuse Protection
- [x] Audit existing endpoints and rate limiter implementation
- [x] Update rateLimiter.ts with admin bypass, concurrency guard, corrected limits (10/10min for all AI)
- [x] Add jdExtractRateLimit middleware for jdSnapshots.extract
- [x] Add jd_extract to EndpointGroup enum in schema and shared types
- [x] Apply jdExtractRateLimit to jdSnapshots.extract procedure
- [x] Suppress TOO_MANY_REQUESTS errors from frontend console.error overlay
- [x] Write Phase 10A acceptance tests (rate-limits.test.ts)
- [x] Update old rate-limiter-10a1.test.ts to match new spec-compliant limits
- [x] All 1401 tests pass, 0 TypeScript errors

## Phase 10B: Concurrency Queue UI (Waiting Spinner + Cancel + No Double-Charge)
- [x] Create AIConcurrencyContext with busy flag, queue slot, and run helper
- [x] Integrate context into Evidence+ATS panel scan button
- [x] Add "Waiting for previous scan..." spinner with Cancel button
- [x] Auto-run queued action after current completes
- [x] Prevent double-charge: queue holds at most 1 pending request
- [x] Friendly inline error when server returns concurrency/rate-limit error
- [x] Write acceptance tests A-F
- [x] All tests pass, 0 TypeScript errors

## Phase 10C: Idempotency + No Double-Charge + Clean Errors (Server-Side)
- [x] Create server/idempotency.ts with in-memory store (userId+endpoint+actionId → status/result/creditsCharged)
- [x] Integrate idempotency guard into evidence.run (action_id input, check before run, store result)
- [x] Integrate idempotency guard into applicationKits.generate
- [x] Integrate idempotency guard into outreach.generatePack
- [x] Integrate idempotency guard into jdSnapshots.extract
- [x] Add action_id (optional UUID) to all 4 frontend mutation call sites
- [x] Write acceptance tests A-E (idempotency-10c.test.ts)
- [x] All tests pass, 0 TypeScript errors

## Phase 10D: Batch Sprint Concurrency — Shared AI Busy Lock + Queue (Frontend Only)
- [x] Add Batch Sprint button + resume selector to bulk action bar in JobCards.tsx
- [x] Integrate batchSprint.mutate with runAI() from AIConcurrencyContext
- [x] Show queue/waiting banner in bulk action bar when Batch Sprint is queued
- [x] Show "Already queued" toast when user clicks again while queued
- [x] Handle markDone in batchSprint onSuccess/onError
- [x] Write acceptance tests A-F (batch-sprint-concurrency-10d.test.ts)
- [x] All tests pass, 0 TypeScript errors

## Phase 10E: Batch Sprint Results Drawer
- [x] Enrich batchSprint return with score, topSuggestion per result (additive)
- [x] Build BatchSprintResultsDrawer component (Sheet, right-side)
- [x] Auto-open drawer on sprint completion
- [x] Per-job rows: company+title, score, top suggestion, status, Open link
- [x] Default sort: lowest score first
- [x] Filter toggle: All / Failed only
- [x] Retry failed button with credit cost label
- [x] Retry failed uses runAI() + fresh actionIds
- [x] Write acceptance tests A-F
- [x] All tests pass, 0 TypeScript errors

## Phase 10F: Export Batch Sprint Results to CSV
- [x] Add csvEscape utility function with proper comma/quote/newline handling
- [x] Add buildSprintCsv function (8 columns: company, title, score, top_suggestion, status, stage, priority, job_card_url)
- [x] Add Download CSV button to drawer header (always visible, disabled when 0 rows)
- [x] Export respects current filter (All vs Failed-only)
- [x] Filename: batch-sprint-results-YYYY-MM-DD-HHMM.csv
- [x] Toast "CSV downloaded" after trigger
- [x] Write acceptance tests A-E
- [x] All tests pass, 0 TypeScript errors

## Phase 10G.1: Fix Copy to Clipboard (Robust Fallbacks + Toast)
- [x] Async handleCopyCsv with try/catch
- [x] Path 1: navigator.clipboard.writeText + toast "Copied to clipboard"
- [x] Path 2: textarea + execCommand('copy') fallback + toast
- [x] Path 3: manual-copy modal with prefilled textarea + Select All helper
- [x] Copy button disabled when displayResults.length === 0
- [x] Single source of truth: buildSprintCsv used for both Copy and Download
- [x] Write acceptance tests (clipboard API, fallback modal, non-empty csvText)
- [x] All tests pass, 0 TypeScript errors

## Phase 11A: Stripe Credits Purchase (Checkout + Webhook, No Credit Logic Changes)
- [x] Verify credit pack constants (server-owned, never trust client)
- [x] Verify create-checkout-session endpoint (tRPC stripe.createCheckoutSession)
- [x] Verify webhook handler at /api/stripe/webhook with signature verification
- [x] Update ledger description to "Purchase: {pack_id}" per spec
- [x] Verify idempotency: same checkout.session.id never credits twice
- [x] Write Phase 11A acceptance tests
- [x] All tests pass, 0 TypeScript errors

## Phase 11B: Low-Credit Warning Banner
- [x] Add LowCreditBanner component to DashboardLayout (credits < 2 threshold)
- [x] Amber banner with "Low credits. Top up to continue scanning." text
- [x] "Top up" CTA navigates to /billing
- [x] 24-hour localStorage dismiss
- [x] Admin users (role === "admin") do not see banner
- [x] Write Phase 11B acceptance tests
- [x] All tests pass, 0 TypeScript errors

## Phase 11C.1: Billing Receipts + Invoices
- [x] Add purchaseReceipts table to drizzle/schema.ts
- [x] Run pnpm db:push to migrate
- [x] Add createPurchaseReceipt and listPurchaseReceipts helpers to server/db.ts
- [x] Update stripeWebhook.ts to write receipt after credits granted
- [x] Add billing.listReceipts tRPC procedure to routers.ts
- [x] Add Receipts section to /billing page
- [x] Add Invoices section to /billing page (reuses receipt data)
- [x] Write Phase 11C.1 acceptance tests (37 tests)
- [x] All tests pass (1694), 0 TypeScript errors

## Phase 11D: Refund Handling (Admin-only Credit Reversal + Audit Log)
- [ ] Add refundQueue table to drizzle/schema.ts
- [ ] Run pnpm db:push to migrate
- [ ] Add refundQueue DB helpers (createRefundQueueItem, listRefundQueueItems, processRefundQueueItem, ignoreRefundQueueItem)
- [ ] Update stripeWebhook.ts to record charge.refunded into refundQueue
- [ ] Add admin tRPC endpoints: refunds.list, refunds.process, refunds.ignore
- [ ] Add /admin/refunds page with table and Review modal
- [ ] Review modal: Debit Credits action (with confirmation) and Ignore action (with reason)
- [ ] Idempotency: same stripe_refund_id cannot create multiple debits
- [ ] Write Phase 11D acceptance tests
- [x] All 1815 tests pass (109 test files), 0 TypeScript errors

## Phase 11D: Refund Handling (Admin-only Credit Reversal + Audit Log)

- [x] refund_queue table in drizzle/schema.ts with userId, stripeChargeId, stripeRefundId (unique), stripeCheckoutSessionId, amountRefunded, currency, packId, creditsToReverse, status (pending/processed/ignored), adminUserId, ignoreReason, ledgerEntryId, processedAt, createdAt
- [x] Migration 0023 applied (refund_queue table)
- [x] DB helpers: createRefundQueueItem, listRefundQueueItems, processRefundQueueItem, ignoreRefundQueueItem, refundQueueItemExists
- [x] createRefundQueueItem silently ignores ER_DUP_ENTRY (idempotency on stripeRefundId)
- [x] processRefundQueueItem creates negative ledger entry (balance may go negative), sets ledgerEntryId on queue item
- [x] ignoreRefundQueueItem requires non-empty reason, sets status to ignored
- [x] Webhook: charge.refunded case creates pending refund queue item + records manual_review in stripe_events
- [x] Admin tRPC: admin.refunds.list (with optional status filter)
- [x] Admin tRPC: admin.refunds.process (debit credits + logAdminAction)
- [x] Admin tRPC: admin.refunds.ignore (ignore with reason + logAdminAction)
- [x] AdminRefunds.tsx page: table with status filter, Review modal with debit/ignore flows, confirmation step, empty state
- [x] AdminLayout: Refunds nav item with RotateCcw icon
- [x] App.tsx: /admin/refunds route
- [x] 61 acceptance tests in server/refund-queue-11d.test.ts
- [x] All 1755 tests pass (107 test files)

## Phase 11E: Refund Policy Link + Policy Page

- [x] Billing page: "Refund policy" link added under credit packs section (Link to /refund-policy)
- [x] Billing page: imports Link from wouter
- [x] RefundPolicy.tsx page created at /refund-policy
- [x] Policy content: 7-day window for unused credits, used credits not refundable, billing error courtesy adjustment, chargeback reversal + negative balance warning, how to request (support email)
- [x] Policy includes "Last updated" date and support@resupify.com mailto link
- [x] App.tsx: /refund-policy route added (public, outside EarlyAccessGuard gated prefixes)
- [x] 27 acceptance tests in server/refund-policy-11e.test.ts
- [x] Fixed stripe-10c1.test.ts: added mockCreateRefundQueueItem to hoisted mocks
- [x] All 1782 tests pass (108 test files), 0 TypeScript errors

## Phase 11F: Purchase Confirmation Email (Resend)

- [x] Install resend npm package
- [x] Schema: add emailSentAt and emailError columns to purchase_receipts table
- [x] Run pnpm db:push to apply migration
- [x] Add DB helpers: markReceiptEmailSent, markReceiptEmailError
- [x] Create server/email.ts with sendPurchaseConfirmationEmail helper (Resend)
- [x] Update stripeWebhook.ts: call email helper after createPurchaseReceipt with idempotency guard
- [x] 33 acceptance tests in server/purchase-email-11f.test.ts
- [x] All 1815 tests pass (109 test files), 0 TypeScript errors

## PATCH: Stripe Webhook Raw Body Fix
- [ ] Audit Express middleware order in server/index.ts
- [ ] Register /api/stripe/webhook with express.raw() BEFORE global express.json()
- [ ] Verify stripe.webhooks.constructEvent receives raw Buffer
- [ ] Write acceptance test with signed payload fixture (returns 200)
- [ ] All tests pass, 0 TypeScript errors

## PATCH: Stripe Webhook Raw Body Fix
- [x] Audit Express middleware order in server/_core/index.ts
- [x] Change express.raw({ type: "application/json" }) to express.raw({ type: () => true }) to accept all Content-Type variants (including charset=utf-8)
- [x] Update webhook to read STRIPE_WEBHOOK_SECRET lazily from process.env (not cached ENV object)
- [x] Write 10 acceptance tests with real Stripe-signed payload fixtures (all return 200)
- [x] All 1825 tests pass, 0 TypeScript errors

## PATCH: Receipt Detail Page + Clickable Rows (Phase 11G)
- [x] getPurchaseReceiptById DB helper added to server/db.ts
- [x] credits.getReceipt tRPC procedure with access control (user owns receipt or admin)
- [x] Billing page: "No receipt" replaced with "View" link to /billing/receipts/:id
- [x] Billing page: Stripe receipt external link preserved when stripeReceiptUrl present
- [x] ReceiptDetail page created at client/src/pages/ReceiptDetail.tsx
- [x] Receipt detail shows: pack name, credits added, amount/currency, purchase date, receipt ID, session reference
- [x] Receipt detail shows current credit balance
- [x] Receipt detail shows Stripe receipt link only when stripeReceiptUrl present
- [x] Receipt detail has Back to Billing and Refund policy links
- [x] /billing/receipts/:id route registered in App.tsx with DashboardRoute wrapper
- [x] 34 acceptance tests in server/receipt-detail-11g.test.ts — all pass
- [x] 1859 total tests passing, 0 TypeScript errors

## PATCH: Admin Retry Purchase Email (Phase 11H)
- [ ] admin.billing.retryReceiptEmail mutation added to admin router
- [ ] Mutation loads receipt + user, guards emailSentAt idempotency
- [ ] Mutation returns status: sent | already_sent | failed
- [ ] Admin Billing Receipts UI: Retry email button when emailSentAt is null
- [ ] Toast feedback for all three status outcomes
- [ ] Acceptance tests in server/admin-retry-email-11h.test.ts
- [ ] 0 TypeScript errors

## Phase 11H: Admin Retry Purchase Confirmation Email
- [x] Add adminListPurchaseReceipts DB helper with userId/emailSentAt filters
- [x] Add getPurchaseReceiptById DB helper
- [x] Add admin.billing.listReceipts tRPC procedure (admin-only)
- [x] Add admin.billing.retryReceiptEmail tRPC mutation (admin-only, idempotent)
- [x] Create AdminBillingReceipts page at /admin/billing-receipts
- [x] Add Billing Receipts nav item to AdminLayout
- [x] Register route in App.tsx
- [x] Write 24 acceptance tests (H1-H20 + I1-I4)
- [x] Full test suite: 1883 tests passing, 0 TypeScript errors

## Phase 11I: Admin Billing Receipts Search
- [x] Update adminListPurchaseReceipts DB helper to accept query + emailStatus params with server-side filtering
- [x] Update admin.billing.listReceipts tRPC procedure to pass query + emailStatus to DB helper
- [x] Update AdminBillingReceipts UI: add search input (debounced), wire to tRPC query
- [x] Write 12 acceptance tests (I1-I12)
- [x] Full test suite: 1895 tests passing, 0 TypeScript errors

## Phase 11I (spec-alignment): Admin Billing Receipts Search Refinement
- [x] DB helper: digit-only query → WHERE userId = q OR id = q (OR, not AND)
- [x] DB helper: "#NNN" query → WHERE id = NNN (strip # prefix)
- [x] DB helper: "@"-containing query → JOIN users WHERE email LIKE %q%
- [x] DB helper: other input → no filter (return empty or all, per spec "do nothing / show No matches")
- [x] tRPC procedure: pass refined query to DB helper unchanged
- [x] UI: update placeholder to "Search by email, user ID, or receipt ID…"
- [x] UI: "No receipts match your search." empty state when search active
- [x] Tests: digit query matches userId OR receiptId
- [x] Tests: "#NNN" matches receipt by ID
- [x] Tests: "@" query matches email LIKE
- [x] Tests: combined query + emailSentAt filter
- [x] Tests: non-admin cannot access listReceipts
- [x] Full test suite: 1901 tests passing, 0 TypeScript errors

## Phase 12E.1: Admin Ops Status Visibility
- [x] Add getOpsStatus DB helper (reads ops_status table, returns null if no row)
- [x] Add admin.ops.getStatus tRPC procedure (admin-only, returns ops status)
- [x] Add /admin/ops page with Stripe Webhooks card (last success, last failure, last event)
- [x] Wire /admin/ops to admin sidebar navigation
- [x] Write Phase 12E.1 acceptance tests (admin access, non-admin guard, null state)
- [x] Full test suite passing, 0 TypeScript errors

## Phase 12E.2: Wire ops_status on Webhook Success
- [x] Add upsertOpsStatus call after successful checkout.session.completed processing in stripeWebhook.ts
- [x] Write Phase 12E.2 acceptance tests confirming ops_status is updated on success
- [x] Full test suite passing, 0 TypeScript errors

## Phase 12E.3: Webhook Failure Tracking (ops_status on error)
- [x] Add upsertOpsStatus({ lastStripeWebhookFailureAt }) in the webhook catch block
- [x] Wrap the ops write in try/catch so it never crashes the process
- [x] Write Phase 12E.3 acceptance tests (E3_1-E3_8)
- [x] Full test suite passing, 0 TypeScript errors

## Phase 12F: Public Health Check Endpoint
- [x] Add GET /api/health route to Express server entry point (no auth, no DB)
- [x] Write Phase 12F acceptance tests (HTTP 200, status=ok, ts is number)
- [x] Full test suite passing, 0 TypeScript errors

## Phase 12G: Ops Page Freshness + Manual Refresh
- [x] Add lastRefreshedAt state to AdminOps.tsx, updated on each successful fetch
- [x] Add freshness label: "Last refreshed: just now / Xs ago / Xm ago"
- [x] Add Refresh button in card header with loading state
- [x] Keep existing 30s auto-refresh behavior unchanged
- [x] Write Phase 12G acceptance tests (no-data, label appears, refresh triggers refetch)
- [x] Full test suite passing, 0 TypeScript errors

## Phase 12H: Admin Ops Stripe Event Audit Table
- [x] Add getStripeEventsPage DB helper (limit, cursor, newest-first)
- [x] Add admin.ops.listStripeEvents tRPC procedure (admin-only, limit/cursor input, items+nextCursor output)
- [x] Update AdminOps.tsx: add Recent Stripe Events table (Event ID, Type, Status, User, Timestamp)
- [x] Add pagination controls (Previous/Next, disable when unavailable)
- [x] Add empty state: "No events yet"
- [x] Write Phase 12H acceptance tests (admin-only, newest-first, cursor pagination, UI states)
- [x] Full test suite passing, 0 TypeScript errors
## Phase 12L: Refund Queue userId mapping + manual override
- [x] Add resolveUserIdForCharge DB helper (lookup by paymentIntentId → checkoutSessionId)
- [x] Add setRefundQueueItemUserId DB helper (admin manual override)
- [x] Update charge.refunded webhook handler to auto-map userId via resolveUserIdForCharge
- [x] Add optional overrideUserId param to admin.refunds.process mutation
- [x] Update AdminRefunds.tsx: show UserSearchSelect when userId is null, require selection before debit
- [x] Write Phase 12L acceptance tests (L1–L20)
- [x] Fix existing C3/C4/E9 tests: increase slice windows to accommodate new code
- [x] Full test suite passing (2012 tests), 0 TypeScript errors
## Phase 12L-MIN: Refund Queue unblock debit when userId null
- [x] Fix processRefundQueueItem to accept optional resolvedUserId param (bypass DB re-fetch)
- [x] Update admin.refunds.process to pass resolvedUserId directly (no separate setRefundQueueItemUserId call)
- [x] Add backend validation: if item.userId null and no overrideUserId, throw clear error
- [x] Verify AdminRefunds.tsx UserSearchSelect wired correctly end-to-end
- [x] Write 12L-MIN acceptance tests (4 cases from spec + 11 structural)
- [x] Full test suite passing (2027 tests), 0 TypeScript errors
## Phase 12M: Backfill userId on existing pending refund queue items
- [x] Add backfillPendingRefundUserIds DB helper (query pending+null userId, call resolveUserIdForCharge, call setRefundQueueItemUserId)
- [x] Add admin.refunds.backfillUserIds tRPC mutation (admin-only, optional limit, returns scanned/eligible/resolved/unresolved)
- [x] Add "Backfill user IDs" button to AdminRefunds.tsx header with loading state and result summary
- [x] Write 12M acceptance tests (20 tests: 4 spec cases + 16 structural)
- [x] Full test suite passing (2047 tests), 0 TypeScript errors
## Phase 12P: Credit Ledger show user email instead of "User #id"
- [x] Audit admin ledger list query (db helper + tRPC procedure)
- [x] Add userDisplay JOIN (users.email, users.name) to admin ledger list query (no N+1)
- [x] Update AdminLedger.tsx: show email > name > "User #id" fallback
- [x] Write 12P acceptance tests (15 tests: 3 spec cases + 12 structural)
- [x] Full test suite passing (2062 tests), 0 TypeScript errors
## Phase 12Q: Admin Credit Ledger convert cards to compact table
- [x] Audit AdminLedger.tsx card layout and check for existing Table component
- [x] Replace card layout with compact table grid (Type, User, Delta, Balance, Timestamp columns)
- [x] Add visual polish: row dividers, hover highlight, zebra rows
- [x] Verify filters, sort, and data display work unchanged
- [x] Full test suite passing (2062 tests), 0 TypeScript errors, no backend changes
## Phase 12R: Admin Audit Log convert cards to compact table
- [x] Audit AdminAuditLog.tsx card layout and data shape
- [x] Replace card layout with compact table (Action, Actor, Target, Time, Details columns)
- [x] Add expand/collapse control for details (JSON payload, initially hidden)
- [x] Verify page loads, entries display correctly, no TS errors, tests pass
- [x] Full test suite passing (2062 tests), 0 TypeScript errors, no backend changes
## Phase 12S: Admin Stripe Events table alignment + column layout polish
- [x] Audit AdminStripeEvents.tsx table layout and current column structure
- [x] Apply fixed table layout and explicit column widths (Event ID 40%, Type 25%, Status 15%, Credits 8%, Time 12%)
- [x] Fix vertical/horizontal alignment: center badges, right-align credits/time, left-align ID/Type
- [x] Verify filters, refresh work, no TS errors, no backend changes
- [x] Full test suite passing (2062 tests), 0 TypeScript errors
