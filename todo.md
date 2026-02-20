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
