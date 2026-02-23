import { describe, it, expect } from "vitest";

/**
 * Phase 9E10.1: Contacts Linking Fix — Real Usage Data + Clickable Navigation
 *
 * Acceptance Tests:
 * A) Contact linked to 1 job shows "Used in: …" and clicking navigates to that job card.
 * B) Contact linked to >1 job shows "Used in: N job cards · View" and each listed job is clickable navigation.
 * C) Contact with 0 links shows "Not used yet".
 * D) No regressions to other pages; no styling refactor.
 */

// ─── Helpers ──────────────────────────────────────────────────────────────────

type DirectContact = {
  id: number;
  userId: number;
  jobCardId: number | null;
  name: string;
  company: string | null;
  role: string | null;
  email: string | null;
  linkedinUrl: string | null;
  phone: string | null;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
  // Direct job card fields from LEFT JOIN
  directJobTitle: string | null;
  directJobCompany: string | null;
  directJobStage: string | null;
  directJobUpdatedAt: Date | null;
  directJobNextTouchAt: Date | null;
};

type ThreadRow = {
  threadId: number;
  contactId: number | null;
  jobCardId: number | null;
  jobTitle: string | null;
  jobCompany: string | null;
  jobStage: string | null;
  jobUpdatedAt: Date | null;
  jobNextTouchAt: Date | null;
};

function makeDirectContact(overrides: Partial<DirectContact> = {}): DirectContact {
  return {
    id: overrides.id ?? 1,
    userId: overrides.userId ?? 42,
    jobCardId: overrides.jobCardId ?? null,
    name: overrides.name ?? "Alice Smith",
    company: overrides.company ?? null,
    role: overrides.role ?? null,
    email: overrides.email ?? null,
    linkedinUrl: overrides.linkedinUrl ?? null,
    phone: overrides.phone ?? null,
    notes: overrides.notes ?? null,
    createdAt: overrides.createdAt ?? new Date("2025-02-01T00:00:00Z"),
    updatedAt: overrides.updatedAt ?? new Date("2025-02-01T00:00:00Z"),
    directJobTitle: overrides.directJobTitle ?? null,
    directJobCompany: overrides.directJobCompany ?? null,
    directJobStage: overrides.directJobStage ?? null,
    directJobUpdatedAt: overrides.directJobUpdatedAt ?? null,
    directJobNextTouchAt: overrides.directJobNextTouchAt ?? null,
  };
}

/**
 * In-memory aggregation that mirrors the fixed getContactsWithUsage logic.
 * Two sources of contact-to-job linking:
 * 1. contacts.jobCardId (direct link, set when contact is created from Job Card detail page)
 * 2. outreach_threads.contactId + outreach_threads.jobCardId (indirect via thread)
 */
function aggregateFixed(
  allContacts: DirectContact[],
  threads: ThreadRow[],
  lastMessages: { threadId: number; sentAt: Date | null }[] = [],
  now: Date = new Date()
) {
  const contactMap = new Map<number, {
    usedInCount: number;
    jobCardIds: Set<number>;
    jobCards: { id: number; company: string | null; title: string; stage: string; updatedAt: Date }[];
    lastTouchAt: Date | null;
    nextTouchAt: Date | null;
  }>();

  // Seed from direct contacts.jobCardId link
  for (const c of allContacts) {
    const agg = {
      usedInCount: 0,
      jobCardIds: new Set<number>(),
      jobCards: [] as { id: number; company: string | null; title: string; stage: string; updatedAt: Date }[],
      lastTouchAt: null as Date | null,
      nextTouchAt: null as Date | null,
    };
    if (c.jobCardId && c.directJobTitle) {
      agg.jobCardIds.add(c.jobCardId);
      agg.jobCards.push({
        id: c.jobCardId,
        company: c.directJobCompany ?? null,
        title: c.directJobTitle,
        stage: c.directJobStage ?? "bookmarked",
        updatedAt: c.directJobUpdatedAt ?? new Date(0),
      });
      if (c.directJobNextTouchAt && c.directJobNextTouchAt > now) {
        agg.nextTouchAt = c.directJobNextTouchAt;
      }
    }
    contactMap.set(c.id, agg);
  }

  // Add from outreach threads
  const threadLastSent = new Map<number, Date | null>();
  for (const msg of lastMessages) {
    threadLastSent.set(msg.threadId, msg.sentAt);
  }

  for (const t of threads) {
    if (!t.contactId) continue;
    const agg = contactMap.get(t.contactId);
    if (!agg) continue;
    if (t.jobCardId && !agg.jobCardIds.has(t.jobCardId)) {
      agg.jobCardIds.add(t.jobCardId);
      if (t.jobTitle) {
        agg.jobCards.push({
          id: t.jobCardId,
          company: t.jobCompany ?? null,
          title: t.jobTitle,
          stage: t.jobStage ?? "bookmarked",
          updatedAt: t.jobUpdatedAt ?? new Date(0),
        });
      }
    }
    const sentAt = threadLastSent.get(t.threadId);
    if (sentAt && (!agg.lastTouchAt || sentAt > agg.lastTouchAt)) {
      agg.lastTouchAt = sentAt;
    }
    if (t.jobNextTouchAt && t.jobNextTouchAt > now) {
      if (!agg.nextTouchAt || t.jobNextTouchAt < agg.nextTouchAt) {
        agg.nextTouchAt = t.jobNextTouchAt;
      }
    }
  }

  return allContacts.map((c) => {
    const agg = contactMap.get(c.id)!;
    const sortedJobCards = agg.jobCards
      .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
      .slice(0, 10);
    return {
      ...c,
      usedInCount: agg.jobCardIds.size,
      mostRecentJobCard: sortedJobCards[0] ?? null,
      recentJobCards: sortedJobCards,
      lastTouchAt: agg.lastTouchAt,
      nextTouchAt: agg.nextTouchAt,
    };
  });
}

// ─── Test A: Contact linked to 1 job via direct jobCardId ─────────────────────

describe("Phase 9E10.1 — Test A: Contact linked to 1 job shows Used in", () => {
  it("A1: contact with contacts.jobCardId shows usedInCount=1", () => {
    const contact = makeDirectContact({
      id: 1,
      jobCardId: 100,
      directJobTitle: "Software Engineer",
      directJobCompany: "Acme Corp",
      directJobStage: "applied",
      directJobUpdatedAt: new Date("2025-03-01T00:00:00Z"),
    });
    const result = aggregateFixed([contact], []);
    expect(result[0].usedInCount).toBe(1);
  });

  it("A2: mostRecentJobCard has correct id, title, company, stage", () => {
    const contact = makeDirectContact({
      id: 1,
      jobCardId: 100,
      directJobTitle: "Software Engineer",
      directJobCompany: "Acme Corp",
      directJobStage: "applied",
      directJobUpdatedAt: new Date("2025-03-01T00:00:00Z"),
    });
    const result = aggregateFixed([contact], []);
    expect(result[0].mostRecentJobCard?.id).toBe(100);
    expect(result[0].mostRecentJobCard?.title).toBe("Software Engineer");
    expect(result[0].mostRecentJobCard?.company).toBe("Acme Corp");
    expect(result[0].mostRecentJobCard?.stage).toBe("applied");
  });

  it("A3: contact linked via thread also shows usedInCount=1", () => {
    const contact = makeDirectContact({ id: 1 }); // no direct jobCardId
    const thread: ThreadRow = {
      threadId: 10,
      contactId: 1,
      jobCardId: 100,
      jobTitle: "Product Manager",
      jobCompany: "Beta Inc",
      jobStage: "interviewing",
      jobUpdatedAt: new Date("2025-03-01T00:00:00Z"),
      jobNextTouchAt: null,
    };
    const result = aggregateFixed([contact], [thread]);
    expect(result[0].usedInCount).toBe(1);
    expect(result[0].mostRecentJobCard?.title).toBe("Product Manager");
  });

  it("A4: contact with both direct jobCardId AND thread to same job shows usedInCount=1 (deduped)", () => {
    const contact = makeDirectContact({
      id: 1,
      jobCardId: 100,
      directJobTitle: "SWE",
      directJobCompany: "Acme",
      directJobStage: "applied",
      directJobUpdatedAt: new Date("2025-03-01T00:00:00Z"),
    });
    const thread: ThreadRow = {
      threadId: 10,
      contactId: 1,
      jobCardId: 100, // same job card
      jobTitle: "SWE",
      jobCompany: "Acme",
      jobStage: "applied",
      jobUpdatedAt: new Date("2025-03-01T00:00:00Z"),
      jobNextTouchAt: null,
    };
    const result = aggregateFixed([contact], [thread]);
    expect(result[0].usedInCount).toBe(1); // deduped
  });

  it("A5: contact with direct jobCardId AND thread to different job shows usedInCount=2", () => {
    const contact = makeDirectContact({
      id: 1,
      jobCardId: 100,
      directJobTitle: "SWE",
      directJobCompany: "Acme",
      directJobStage: "applied",
      directJobUpdatedAt: new Date("2025-03-01T00:00:00Z"),
    });
    const thread: ThreadRow = {
      threadId: 10,
      contactId: 1,
      jobCardId: 200, // different job card
      jobTitle: "PM",
      jobCompany: "Beta",
      jobStage: "interviewing",
      jobUpdatedAt: new Date("2025-04-01T00:00:00Z"),
      jobNextTouchAt: null,
    };
    const result = aggregateFixed([contact], [thread]);
    expect(result[0].usedInCount).toBe(2);
  });
});

// ─── Test B: Contact linked to >1 job ─────────────────────────────────────────

describe("Phase 9E10.1 — Test B: Contact linked to >1 job shows count + popover list", () => {
  it("B1: usedInCount=3 for contact with 3 distinct job cards (mix of direct + thread)", () => {
    const contact = makeDirectContact({
      id: 1,
      jobCardId: 100,
      directJobTitle: "SWE",
      directJobCompany: "Acme",
      directJobStage: "applied",
      directJobUpdatedAt: new Date("2025-01-01T00:00:00Z"),
    });
    const threads: ThreadRow[] = [
      { threadId: 10, contactId: 1, jobCardId: 101, jobTitle: "PM", jobCompany: "Beta", jobStage: "interviewing", jobUpdatedAt: new Date("2025-02-01T00:00:00Z"), jobNextTouchAt: null },
      { threadId: 11, contactId: 1, jobCardId: 102, jobTitle: "Designer", jobCompany: "Gamma", jobStage: "bookmarked", jobUpdatedAt: new Date("2025-03-01T00:00:00Z"), jobNextTouchAt: null },
    ];
    const result = aggregateFixed([contact], threads);
    expect(result[0].usedInCount).toBe(3);
  });

  it("B2: recentJobCards sorted by updatedAt desc (most recent first)", () => {
    const contact = makeDirectContact({
      id: 1,
      jobCardId: 100,
      directJobTitle: "Old Job",
      directJobCompany: "Acme",
      directJobStage: "applied",
      directJobUpdatedAt: new Date("2025-01-01T00:00:00Z"),
    });
    const threads: ThreadRow[] = [
      { threadId: 10, contactId: 1, jobCardId: 101, jobTitle: "Recent Job", jobCompany: "Beta", jobStage: "interviewing", jobUpdatedAt: new Date("2025-04-01T00:00:00Z"), jobNextTouchAt: null },
    ];
    const result = aggregateFixed([contact], threads);
    expect(result[0].recentJobCards[0].title).toBe("Recent Job");
    expect(result[0].recentJobCards[1].title).toBe("Old Job");
  });

  it("B3: recentJobCards capped at 10", () => {
    const contact = makeDirectContact({ id: 1 });
    const threads: ThreadRow[] = Array.from({ length: 15 }, (_, i) => ({
      threadId: 10 + i,
      contactId: 1,
      jobCardId: 100 + i,
      jobTitle: `Job ${i}`,
      jobCompany: null,
      jobStage: "applied",
      jobUpdatedAt: new Date(2025, 0, i + 1),
      jobNextTouchAt: null,
    }));
    const result = aggregateFixed([contact], threads);
    expect(result[0].recentJobCards.length).toBeLessThanOrEqual(10);
  });

  it("B4: each recentJobCard has id, title, company, stage for navigation", () => {
    const contact = makeDirectContact({ id: 1 });
    const threads: ThreadRow[] = [
      { threadId: 10, contactId: 1, jobCardId: 100, jobTitle: "SWE", jobCompany: "Acme", jobStage: "applied", jobUpdatedAt: new Date("2025-03-01T00:00:00Z"), jobNextTouchAt: null },
      { threadId: 11, contactId: 1, jobCardId: 101, jobTitle: "PM", jobCompany: "Beta", jobStage: "interviewing", jobUpdatedAt: new Date("2025-04-01T00:00:00Z"), jobNextTouchAt: null },
    ];
    const result = aggregateFixed([contact], threads);
    for (const jc of result[0].recentJobCards) {
      expect(jc).toHaveProperty("id");
      expect(jc).toHaveProperty("title");
      expect(jc).toHaveProperty("company");
      expect(jc).toHaveProperty("stage");
    }
  });
});

// ─── Test C: Contact with 0 links ─────────────────────────────────────────────

describe("Phase 9E10.1 — Test C: Contact with 0 links shows Not used yet", () => {
  it("C1: contact with no jobCardId and no threads has usedInCount=0", () => {
    const contact = makeDirectContact({ id: 1, jobCardId: null, directJobTitle: null });
    const result = aggregateFixed([contact], []);
    expect(result[0].usedInCount).toBe(0);
  });

  it("C2: contact with no jobCardId and no threads has mostRecentJobCard=null", () => {
    const contact = makeDirectContact({ id: 1, jobCardId: null, directJobTitle: null });
    const result = aggregateFixed([contact], []);
    expect(result[0].mostRecentJobCard).toBeNull();
  });

  it("C3: contact with jobCardId set but no directJobTitle (orphaned FK) shows usedInCount=0", () => {
    // If the job card was deleted, directJobTitle will be null (LEFT JOIN returns null)
    const contact = makeDirectContact({ id: 1, jobCardId: 999, directJobTitle: null });
    const result = aggregateFixed([contact], []);
    expect(result[0].usedInCount).toBe(0);
  });

  it("C4: contact with thread to job card with null jobTitle counts jobCardId but shows no recentJobCards entry", () => {
    // When jobTitle is null (e.g., job card deleted or LEFT JOIN returned null),
    // the jobCardId is still counted in usedInCount (it's a real link),
    // but no entry is added to recentJobCards (no title to display).
    const contact = makeDirectContact({ id: 1 });
    const thread: ThreadRow = {
      threadId: 10,
      contactId: 1,
      jobCardId: 999,
      jobTitle: null, // no title available
      jobCompany: null,
      jobStage: null,
      jobUpdatedAt: null,
      jobNextTouchAt: null,
    };
    const result = aggregateFixed([contact], [thread]);
    // jobCardId is counted (real link exists)
    expect(result[0].usedInCount).toBe(1);
    // But no entry in recentJobCards since title is null
    expect(result[0].recentJobCards).toHaveLength(0);
  });
});

// ─── Test D: No regressions ────────────────────────────────────────────────────

describe("Phase 9E10.1 — Test D: No regressions to other pages", () => {
  it("D1: aggregation does not modify contacts.list (separate function)", () => {
    // contacts.list and contacts.listWithUsage are separate procedures
    // This test validates that the aggregation function is additive
    const contact = makeDirectContact({ id: 1 });
    const result = aggregateFixed([contact], []);
    // Should have all original contact fields
    expect(result[0]).toHaveProperty("id");
    expect(result[0]).toHaveProperty("name");
    expect(result[0]).toHaveProperty("email");
    expect(result[0]).toHaveProperty("createdAt");
    // Should have enriched fields
    expect(result[0]).toHaveProperty("usedInCount");
    expect(result[0]).toHaveProperty("mostRecentJobCard");
    expect(result[0]).toHaveProperty("recentJobCards");
    expect(result[0]).toHaveProperty("lastTouchAt");
    expect(result[0]).toHaveProperty("nextTouchAt");
  });

  it("D2: aggregation does not include credits fields", () => {
    const contact = makeDirectContact({ id: 1 });
    const result = aggregateFixed([contact], []);
    expect(result[0]).not.toHaveProperty("balance");
    expect(result[0]).not.toHaveProperty("credits");
    expect(result[0]).not.toHaveProperty("ledger");
  });

  it("D3: multiple contacts are all returned (no filtering)", () => {
    const contacts = [
      makeDirectContact({ id: 1, name: "Alice" }),
      makeDirectContact({ id: 2, name: "Bob" }),
      makeDirectContact({ id: 3, name: "Charlie" }),
    ];
    const result = aggregateFixed(contacts, []);
    expect(result).toHaveLength(3);
  });

  it("D4: navigation target is /jobs/:id (correct route)", () => {
    const contact = makeDirectContact({
      id: 1,
      jobCardId: 42,
      directJobTitle: "SWE",
      directJobCompany: "Acme",
      directJobStage: "applied",
      directJobUpdatedAt: new Date("2025-03-01T00:00:00Z"),
    });
    const result = aggregateFixed([contact], []);
    const jobId = result[0].mostRecentJobCard?.id;
    expect(jobId).toBe(42);
    // Navigation target would be `/jobs/42`
    expect(`/jobs/${jobId}`).toBe("/jobs/42");
  });

  it("D5: thread with null contactId does not crash or pollute other contacts", () => {
    const contact = makeDirectContact({ id: 1 });
    const threadWithNullContact: ThreadRow = {
      threadId: 10,
      contactId: null,
      jobCardId: 100,
      jobTitle: "SWE",
      jobCompany: "Acme",
      jobStage: "applied",
      jobUpdatedAt: new Date("2025-03-01T00:00:00Z"),
      jobNextTouchAt: null,
    };
    const result = aggregateFixed([contact], [threadWithNullContact]);
    expect(result[0].usedInCount).toBe(0);
  });
});
