# V1 Audit Reconciliation Report

**Date:** 2026-02-22  
**Scope:** Read-only codebase inspection — no files modified.  
**Method:** Searched `client/src/`, `server/`, and `drizzle/schema.ts` for each item. Evidence includes file paths, component/function names, and line numbers.

---

## Summary Table

| # | Item | Status | Evidence (file : line) | How to verify in UI | Risk if left pending |
|---|------|--------|------------------------|---------------------|----------------------|
| A | Evidence Map: bold JD line + collapsible categories (Skills open default) | **DONE** | `client/src/pages/JobCardDetail.tsx:935–937, 1220–1285` | Open any Job Card → Evidence Map tab → run a scan → categories render as collapsible rows; Skills opens by default; each item shows **JD:** in bold | Low |
| B | Application Kit: collapsible sections (Top Changes open; Bullet Rewrites/Partial/Cover Letter collapsed) | **DONE** | `client/src/pages/JobCardDetail.tsx:1323–1325, 1605–1850` | Open any Job Card → Application Kit tab → generate a kit → Top Changes section is expanded; Bullet Rewrites and Cover Letter Draft are collapsed | Low |
| C | Cover letter tone: switching tone + regenerating changes output; cached keys include tone | **PARTIAL** | Tone selector wired to `generateKit.mutate({ …, tone })` at lines 1570, 1572; tone stored in DB (`drizzle/schema.ts:301`); displayed as `existingKit.tone` at line 1597. **Gap:** `applicationKits.get` query input does NOT include `tone` — it always fetches the latest kit regardless of tone, so switching tone without regenerating shows the previously-generated tone's content. No per-tone cache key. | Open Application Kit tab → switch tone → do NOT regenerate → the displayed kit still shows the old tone's content until you regenerate | Med |
| D | How-it-works page: route exists and does not show placeholder | **DONE** | `client/src/App.tsx:84` registers `/how-it-works`; `client/src/pages/HowItWorks.tsx` is 244 lines of real content (5 sections: Job Card, Resume, Evidence Map, Application Kit, CTA) with no placeholder strings | Navigate to `/how-it-works` in browser | Low |
| E | Contacts: Add Contact form has LinkedIn URL field | **DONE** | `client/src/pages/JobCardDetail.tsx:2047, 2200–2215` — `newContactLinkedInUrl` state, `Input` with `placeholder="https://linkedin.com/in/…"`, validation for `https://` prefix, passed to `createContact.mutate({ …, linkedinUrl })` | Open any Job Card → Outreach tab → scroll to Contacts → Add Contact form shows LinkedIn URL input below Name/Role/Email row | Low |
| F | Contacts: Edit Contact form has LinkedIn URL field | **PENDING** | `contacts.update` tRPC procedure exists (`server/routers.ts:1287–1300`) and accepts `linkedinUrl`. However, **no client-side edit form exists** — `trpc.contacts.update` is never called from any client component. There is no inline edit, dialog, or pencil-icon edit flow for contacts. The only Pencil icon in `JobCardDetail.tsx` (line 2499) belongs to the JD Sources section, not contacts. | N/A — there is no edit contact UI to test | High |
| G | Contact role: saved and displayed in Outreach tab contacts list | **DONE** | Schema: `drizzle/schema.ts:224` — `role` field maps to `contactRole` column. Create mutation passes `role` at `client/src/pages/JobCardDetail.tsx:2229`. Contacts list renders `contact.contactRole` at line 2187 as subtitle text below the contact name. | Open Job Card → Outreach tab → add a contact with a role → role appears as subtitle in the contacts list | Low |
| H | URL fetch overlay suppression: expected fetch errors show inline only, no global console overlay | **DONE** | `client/src/main.tsx:35–55` — `EXPECTED_FETCH_SUBSTRINGS` array (14 strings) + `isExpectedFetchError()` function. `MutationCache` subscriber at lines 86–95 suppresses `console.error` for matching errors. `QueryCache` subscriber still logs query errors (intentional — JD fetch is a mutation). | Paste a blocked URL in JD Snapshot tab → error shows inline only, no red overlay in browser console | Low |
| I | Priority badges: High/Medium/Low badges show in list + kanban | **DONE** | List view: `client/src/pages/JobCards.tsx:342–350` — High (destructive), Medium (secondary), Low (outline). Kanban view: lines 514–522 — same three variants. Filter dropdown at line 282. | Open Job Cards → list view and kanban view → cards with priority show correct colored badges | Low |
| J | Admin sandbox no-charge: outreach regen free ONLY in admin sandbox, not production | **DONE** | Production: `server/routers.ts:1430` — `db.spendCredits(ctx.user.id, 1, …)` charges 1 credit. Sandbox: `server/routers/admin.ts:512–538` — `generateOutreachTestMode` uses `adminProcedure` (admin-only), calls `db.adminLogTestRun(…, delta=0)`, **no** `spendCredits` call. Test coverage: `server/admin-outreach-test-mode.test.ts` confirms delta=0 for sandbox and that non-admin cannot call sandbox procedures. | Admin only: use admin sandbox panel → generate outreach → credit balance unchanged. Regular user: generate outreach → balance decreases by 1 | Low |

---

## Key Findings

**Item F (Edit Contact form — PENDING, High Risk)** is the only unimplemented item. The server-side `contacts.update` procedure is fully wired and accepts all fields including `linkedinUrl`, `role`, `name`, `email`, and `notes`. The gap is entirely on the client side: there is no UI to invoke it. Users who add a contact with a typo in the role, email, or LinkedIn URL have no way to correct it without deleting and re-adding the contact.

**Item C (Cover letter tone — PARTIAL, Medium Risk)** works correctly for generation and regeneration — the selected tone is passed to the LLM and stored in the DB. The partial gap is that the `applicationKits.get` query does not include `tone` in its input, so the cached result is always the most recently generated kit regardless of which tone is currently selected in the UI. This means if a user generates with "Human", switches the selector to "Confident" without regenerating, the displayed kit still shows the "Human" output. The `existingKit.tone` label at the bottom of the card does correctly reflect the stored tone, which partially mitigates confusion.

---

## No-Change Confirmation

This report was produced by read-only inspection. **Zero files were modified.**
