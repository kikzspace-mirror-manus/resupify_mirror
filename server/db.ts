import { eq, and, desc, asc, lt, lte, gte, sql, isNull, isNotNull, or, inArray, ilike } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  InsertUser, users,
  userProfiles, InsertUserProfile,
  creditsBalances, creditsLedger,
  resumes, InsertResume,
  jobCards, InsertJobCard,
  jdSnapshots, InsertJdSnapshot,
  evidenceRuns, InsertEvidenceRun,
  evidenceItems, InsertEvidenceItem,
  tasks, InsertTask,
  contacts, InsertContact,
  outreachThreads, outreachMessages, outreachPacks,
  adminActionLogs, InsertAdminActionLog,
  jobCardRequirements, InsertJobCardRequirement,
  applicationKits, InsertApplicationKit,
  jobCardPersonalizationSources, InsertJobCardPersonalizationSource,
  operationalEvents, InsertOperationalEvent, OperationalEvent,
  stripeEvents, InsertStripeEvent, StripeEvent,
  purchaseReceipts, InsertPurchaseReceipt, PurchaseReceipt,
} from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

// ─── Users ───────────────────────────────────────────────────────────
export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) return;
  const values: InsertUser = { openId: user.openId };
  const updateSet: Record<string, unknown> = {};
  const textFields = ["name", "email", "loginMethod"] as const;
  textFields.forEach((field) => {
    const value = user[field];
    if (value === undefined) return;
    const normalized = value ?? null;
    (values as any)[field] = normalized;
    updateSet[field] = normalized;
  });
  if (user.lastSignedIn !== undefined) { values.lastSignedIn = user.lastSignedIn; updateSet.lastSignedIn = user.lastSignedIn; }
  if (user.role !== undefined) { values.role = user.role; updateSet.role = user.role; }
  else if (user.openId === ENV.ownerOpenId) { values.role = 'admin'; updateSet.role = 'admin'; }
  // Auto-assign admin for francisnoces@gmail.com
  const emailVal = user.email ?? values.email;
  if (emailVal === 'francisnoces@gmail.com' || user.openId === ENV.ownerOpenId) {
    (values as any).isAdmin = true;
    updateSet.isAdmin = true;
    values.role = 'admin';
    updateSet.role = 'admin';
  }
  if (!values.lastSignedIn) values.lastSignedIn = new Date();
  if (Object.keys(updateSet).length === 0) updateSet.lastSignedIn = new Date();
  await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}
export async function getUserById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

// ─── User Profiles ───────────────────────────────────────────────────
export async function getProfile(userId: number) {
  const db = await getDb();
  if (!db) return null;
  const rows = await db.select().from(userProfiles).where(eq(userProfiles.userId, userId)).limit(1);
  return rows[0] ?? null;
}

export async function upsertProfile(userId: number, data: Partial<InsertUserProfile>) {
  const db = await getDb();
  if (!db) return;
  const existing = await getProfile(userId);
  if (existing) {
    await db.update(userProfiles).set(data).where(eq(userProfiles.userId, userId));
  } else {
    await db.insert(userProfiles).values({ userId, ...data } as InsertUserProfile);
  }
}

// ─── Credits ─────────────────────────────────────────────────────────
export async function getCreditsBalance(userId: number): Promise<number> {
  const db = await getDb();
  if (!db) return 0;
  const rows = await db.select().from(creditsBalances).where(eq(creditsBalances.userId, userId)).limit(1);
  if (rows.length === 0) {
    await db.insert(creditsBalances).values({ userId, balance: 3 });
    return 3;
  }
  return rows[0].balance;
}

export async function spendCredits(userId: number, amount: number, reason: string, referenceType?: string, referenceId?: number): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;
  const current = await getCreditsBalance(userId);
  if (current < amount) return false;
  const newBalance = current - amount;
  await db.update(creditsBalances).set({ balance: newBalance }).where(eq(creditsBalances.userId, userId));
  await db.insert(creditsLedger).values({
    userId, amount: -amount, reason, referenceType: referenceType ?? null, referenceId: referenceId ?? null, balanceAfter: newBalance,
  });
  return true;
}

export async function addCredits(userId: number, amount: number, reason: string, referenceType?: string) {
  const db = await getDb();
  if (!db) return;
  const current = await getCreditsBalance(userId);
  const newBalance = current + amount;
  await db.update(creditsBalances).set({ balance: newBalance }).where(eq(creditsBalances.userId, userId));
  await db.insert(creditsLedger).values({
    userId, amount, reason, referenceType: referenceType ?? "purchase", referenceId: null, balanceAfter: newBalance,
  });
}

/** Maximum number of ledger rows returned to the Billing page. */
export const LEDGER_DISPLAY_CAP = 25;

export async function getCreditLedger(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(creditsLedger)
    .where(eq(creditsLedger.userId, userId))
    .orderBy(desc(creditsLedger.createdAt))
    .limit(LEDGER_DISPLAY_CAP);
}

// ─── Resumes ─────────────────────────────────────────────────────────
export async function getResumes(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(resumes).where(and(eq(resumes.userId, userId), eq(resumes.isActive, true))).orderBy(desc(resumes.updatedAt));
}

export async function getResumeById(id: number, userId: number) {
  const db = await getDb();
  if (!db) return null;
  const rows = await db.select().from(resumes).where(and(eq(resumes.id, id), eq(resumes.userId, userId))).limit(1);
  return rows[0] ?? null;
}

export async function createResume(data: InsertResume) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.insert(resumes).values(data);
  return result[0].insertId;
}

export async function updateResume(id: number, userId: number, data: Partial<InsertResume>) {
  const db = await getDb();
  if (!db) return;
  await db.update(resumes).set(data).where(and(eq(resumes.id, id), eq(resumes.userId, userId)));
}

export async function deleteResume(id: number, userId: number) {
  const db = await getDb();
  if (!db) return;
  await db.update(resumes).set({ isActive: false }).where(and(eq(resumes.id, id), eq(resumes.userId, userId)));
}

// ─── Job Cards ───────────────────────────────────────────────────────
export async function getJobCards(userId: number, filters?: { stage?: string; season?: string; priority?: string }) {
  const db = await getDb();
  if (!db) return [];
  const conditions = [eq(jobCards.userId, userId)];
  if (filters?.stage) conditions.push(eq(jobCards.stage, filters.stage as any));
  if (filters?.season) conditions.push(eq(jobCards.season, filters.season as any));
  if (filters?.priority) conditions.push(eq(jobCards.priority, filters.priority as any));

  // Single LEFT JOIN to get MIN(dueDate) of incomplete follow_up tasks per card.
  // This avoids N+1 queries — one query returns all cards + their next follow-up date.
  const rows = await db
    .select({
      // All jobCards columns
      id: jobCards.id,
      userId: jobCards.userId,
      title: jobCards.title,
      company: jobCards.company,
      location: jobCards.location,
      stage: jobCards.stage,
      priority: jobCards.priority,
      season: jobCards.season,
      notes: jobCards.notes,
      url: jobCards.url,
      salary: jobCards.salary,
      jobType: jobCards.jobType,
      dueDate: jobCards.dueDate,
      followupsScheduledAt: jobCards.followupsScheduledAt,
      createdAt: jobCards.createdAt,
      updatedAt: jobCards.updatedAt,
      // Computed: earliest incomplete follow_up task due date
      nextFollowupDueAt: sql<Date | null>`MIN(CASE WHEN ${tasks.taskType} = 'follow_up' AND ${tasks.completed} = 0 AND ${tasks.dueDate} IS NOT NULL THEN ${tasks.dueDate} END)`,
    })
    .from(jobCards)
    .leftJoin(tasks, and(eq(tasks.jobCardId, jobCards.id), eq(tasks.userId, userId)))
    .where(and(...conditions))
    .groupBy(
      jobCards.id, jobCards.userId, jobCards.title, jobCards.company, jobCards.location,
      jobCards.stage, jobCards.priority, jobCards.season, jobCards.notes, jobCards.url,
      jobCards.salary, jobCards.jobType, jobCards.dueDate, jobCards.followupsScheduledAt,
      jobCards.createdAt, jobCards.updatedAt
    )
    .orderBy(desc(jobCards.updatedAt));

  return rows;
}

export async function getJobCardById(id: number, userId: number) {
  const db = await getDb();
  if (!db) return null;
  const rows = await db.select().from(jobCards).where(and(eq(jobCards.id, id), eq(jobCards.userId, userId))).limit(1);
  return rows[0] ?? null;
}

export async function createJobCard(data: InsertJobCard) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.insert(jobCards).values(data);
  return result[0].insertId;
}

export async function updateJobCard(id: number, userId: number, data: Partial<InsertJobCard>) {
  const db = await getDb();
  if (!db) return;
  await db.update(jobCards).set(data).where(and(eq(jobCards.id, id), eq(jobCards.userId, userId)));
}

export async function deleteJobCard(id: number, userId: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(jobCards).where(and(eq(jobCards.id, id), eq(jobCards.userId, userId)));
}

// ─── JD Snapshots ────────────────────────────────────────────────────
export async function getJdSnapshots(jobCardId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(jdSnapshots).where(eq(jdSnapshots.jobCardId, jobCardId)).orderBy(desc(jdSnapshots.version));
}

export async function getLatestJdSnapshot(jobCardId: number) {
  const db = await getDb();
  if (!db) return null;
  const rows = await db.select().from(jdSnapshots).where(eq(jdSnapshots.jobCardId, jobCardId)).orderBy(desc(jdSnapshots.version)).limit(1);
  return rows[0] ?? null;
}

export async function createJdSnapshot(data: InsertJdSnapshot) {
  const db = await getDb();
  if (!db) return null;
  const existing = await getJdSnapshots(data.jobCardId);
  const nextVersion = existing.length > 0 ? existing[0].version + 1 : 1;
  const result = await db.insert(jdSnapshots).values({ ...data, version: nextVersion });
  return result[0].insertId;
}

// ─── Evidence Runs ───────────────────────────────────────────────────
export async function getEvidenceRuns(jobCardId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(evidenceRuns).where(eq(evidenceRuns.jobCardId, jobCardId)).orderBy(desc(evidenceRuns.createdAt));
}

export async function getEvidenceRunById(id: number) {
  const db = await getDb();
  if (!db) return null;
  const rows = await db.select().from(evidenceRuns).where(eq(evidenceRuns.id, id)).limit(1);
  return rows[0] ?? null;
}

export async function createEvidenceRun(data: InsertEvidenceRun) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.insert(evidenceRuns).values(data);
  return result[0].insertId;
}

export async function updateEvidenceRun(id: number, data: Partial<InsertEvidenceRun>) {
  const db = await getDb();
  if (!db) return;
  await db.update(evidenceRuns).set(data).where(eq(evidenceRuns.id, id));
}

// ─── Evidence Items ──────────────────────────────────────────────────
export async function getEvidenceItems(evidenceRunId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(evidenceItems).where(eq(evidenceItems.evidenceRunId, evidenceRunId)).orderBy(asc(evidenceItems.sortOrder));
}

export async function createEvidenceItems(items: InsertEvidenceItem[]) {
  const db = await getDb();
  if (!db) return;
  if (items.length === 0) return;
  await db.insert(evidenceItems).values(items);
}

// ─── Tasks ───────────────────────────────────────────────────────────
export async function getTasks(userId: number, filters?: { jobCardId?: number; completed?: boolean; dueBefore?: Date }) {
  const db = await getDb();
  if (!db) return [];
  const conditions = [eq(tasks.userId, userId)];
  if (filters?.jobCardId) conditions.push(eq(tasks.jobCardId, filters.jobCardId));
  if (filters?.completed !== undefined) conditions.push(eq(tasks.completed, filters.completed));
  if (filters?.dueBefore) conditions.push(lte(tasks.dueDate, filters.dueBefore));
  return db.select().from(tasks).where(and(...conditions)).orderBy(asc(tasks.dueDate));
}

export async function getTodayTasks(userId: number) {
  const db = await getDb();
  if (!db) return [];
  const now = new Date();
  const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
  return db.select().from(tasks).where(
    and(
      eq(tasks.userId, userId),
      eq(tasks.completed, false),
      or(lte(tasks.dueDate, endOfDay), isNull(tasks.dueDate))
    )
  ).orderBy(asc(tasks.dueDate));
}

export async function createTask(data: InsertTask) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.insert(tasks).values(data);
  return result[0].insertId;
}

export async function updateTask(id: number, userId: number, data: Partial<InsertTask>) {
  const db = await getDb();
  if (!db) return;
  await db.update(tasks).set(data).where(and(eq(tasks.id, id), eq(tasks.userId, userId)));
}

export async function deleteTask(id: number, userId: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(tasks).where(and(eq(tasks.id, id), eq(tasks.userId, userId)));
}

// ─── Contacts ────────────────────────────────────────────────────────
export async function getContacts(userId: number, jobCardId?: number) {
  const db = await getDb();
  if (!db) return [];
  const conditions = [eq(contacts.userId, userId)];
  if (jobCardId) conditions.push(eq(contacts.jobCardId, jobCardId));
  return db.select().from(contacts).where(and(...conditions)).orderBy(desc(contacts.updatedAt));
}

export async function createContact(data: InsertContact) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.insert(contacts).values(data);
  return result[0].insertId;
}

export async function updateContact(id: number, userId: number, data: Partial<InsertContact>) {
  const db = await getDb();
  if (!db) return;
  await db.update(contacts).set(data).where(and(eq(contacts.id, id), eq(contacts.userId, userId)));
}

export async function deleteContact(id: number, userId: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(contacts).where(and(eq(contacts.id, id), eq(contacts.userId, userId)));
}
export async function getContactById(id: number, userId: number) {
  const db = await getDb();
  if (!db) return null;
  const rows = await db.select().from(contacts).where(and(eq(contacts.id, id), eq(contacts.userId, userId))).limit(1);
  return rows[0] ?? null;
}

/**
 * Aggregated contacts query — returns each contact enriched with:
 * - usedInCount: number of distinct job cards linked via outreach_threads
 * - mostRecentJobCard: the most recently updated job card linked to this contact
 * - recentJobCards: top 10 job cards linked to this contact
 * - lastTouchAt: MAX(outreach_messages.sentAt) across all threads for this contact
 * - nextTouchAt: MIN(job_cards.nextTouchAt) for future dates across linked job cards
 * No N+1: all data fetched in 3 queries then merged in memory.
 */
export async function getContactsWithUsage(userId: number) {
  const db = await getDb();
  if (!db) return [];
  // Query 1: all contacts for this user, with direct job card data via contacts.jobCardId
  const allContacts = await db
    .select({
      id: contacts.id,
      userId: contacts.userId,
      jobCardId: contacts.jobCardId,
      name: contacts.name,
      role: contacts.role,
      company: contacts.company,
      email: contacts.email,
      linkedinUrl: contacts.linkedinUrl,
      phone: contacts.phone,
      notes: contacts.notes,
      createdAt: contacts.createdAt,
      updatedAt: contacts.updatedAt,
      // Direct link: job card data from contacts.jobCardId
      directJobTitle: jobCards.title,
      directJobCompany: jobCards.company,
      directJobStage: jobCards.stage,
      directJobPriority: jobCards.priority,
      directJobUpdatedAt: jobCards.updatedAt,
      directJobNextTouchAt: jobCards.nextTouchAt,
    })
    .from(contacts)
    .leftJoin(jobCards, and(eq(contacts.jobCardId, jobCards.id), eq(jobCards.userId, userId)))
    .where(eq(contacts.userId, userId));
  if (allContacts.length === 0) return [];
  const contactIds = allContacts.map((c) => c.id);

  // Query 2: all outreach threads for these contacts, joined with job_cards
  const threads = await db
    .select({
      threadId: outreachThreads.id,
      contactId: outreachThreads.contactId,
      jobCardId: outreachThreads.jobCardId,
      jobTitle: jobCards.title,
      jobCompany: jobCards.company,
      jobStage: jobCards.stage,
      jobPriority: jobCards.priority,
      jobUpdatedAt: jobCards.updatedAt,
      jobNextTouchAt: jobCards.nextTouchAt,
    })
    .from(outreachThreads)
    .leftJoin(jobCards, eq(outreachThreads.jobCardId, jobCards.id))
    .where(
      and(
        eq(outreachThreads.userId, userId),
        inArray(outreachThreads.contactId, contactIds)
      )
    );

  // Query 3: last sent message per thread (for lastTouchAt)
  const threadIds = threads.map((t) => t.threadId);
  let lastMessages: { threadId: number; sentAt: Date | null }[] = [];
  if (threadIds.length > 0) {
    lastMessages = await db
      .select({
        threadId: outreachMessages.threadId,
        sentAt: sql<Date | null>`MAX(${outreachMessages.sentAt})`.as("sentAt"),
      })
      .from(outreachMessages)
      .where(inArray(outreachMessages.threadId, threadIds))
      .groupBy(outreachMessages.threadId);
  }

  // Build lookup: threadId -> lastSentAt
  const threadLastSent = new Map<number, Date | null>();
  for (const msg of lastMessages) {
    threadLastSent.set(msg.threadId, msg.sentAt);
  }

  // Build per-contact aggregates
  const now = new Date();
  const contactMap = new Map<number, {
    usedInCount: number;
    jobCardIds: Set<number>;
     jobCards: { id: number; company: string | null; title: string; stage: string; priority: string | null; updatedAt: Date }[];
    lastTouchAt: Date | null;
    nextTouchAt: Date | null;
  }>();
  for (const c of allContacts) {
    const agg = {
      usedInCount: 0,
      jobCardIds: new Set<number>(),
      jobCards: [] as { id: number; company: string | null; title: string; stage: string; priority: string | null; updatedAt: Date }[],
      lastTouchAt: null as Date | null,
      nextTouchAt: null as Date | null,
    };
    // Seed direct link from contacts.jobCardId (contacts created from Job Card detail page)
    if (c.jobCardId && c.directJobTitle) {
      agg.jobCardIds.add(c.jobCardId);
      agg.jobCards.push({
        id: c.jobCardId,
        company: c.directJobCompany ?? null,
        title: c.directJobTitle,
        stage: c.directJobStage ?? "bookmarked",
        priority: c.directJobPriority ?? null,
        updatedAt: c.directJobUpdatedAt ?? new Date(0),
      });
      // Seed nextTouchAt from direct job card
      if (c.directJobNextTouchAt && c.directJobNextTouchAt > now) {
        agg.nextTouchAt = c.directJobNextTouchAt;
      }
    }
    contactMap.set(c.id, agg);
  }

  for (const t of threads) {
    if (!t.contactId) continue;
    const agg = contactMap.get(t.contactId);
    if (!agg) continue;

    // Count distinct job cards
    if (t.jobCardId && !agg.jobCardIds.has(t.jobCardId)) {
      agg.jobCardIds.add(t.jobCardId);
      if (t.jobTitle) {
        agg.jobCards.push({
          id: t.jobCardId,
          company: t.jobCompany ?? null,
          title: t.jobTitle,
          stage: t.jobStage ?? "bookmarked",
          priority: t.jobPriority ?? null,
          updatedAt: t.jobUpdatedAt ?? new Date(0),
        });
      }
    }

    // Last touch: MAX(sentAt) across all threads for this contact
    const sentAt = threadLastSent.get(t.threadId);
    if (sentAt) {
      if (!agg.lastTouchAt || sentAt > agg.lastTouchAt) {
        agg.lastTouchAt = sentAt;
      }
    }

    // Next touch: MIN(future nextTouchAt) from linked job cards
    if (t.jobNextTouchAt && t.jobNextTouchAt > now) {
      if (!agg.nextTouchAt || t.jobNextTouchAt < agg.nextTouchAt) {
        agg.nextTouchAt = t.jobNextTouchAt;
      }
    }
  }

  // Build result array
  const result = allContacts.map((c) => {
    const agg = contactMap.get(c.id)!;
    const sortedJobCards = agg.jobCards
      .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
      .slice(0, 10);
    const mostRecentJobCard = sortedJobCards[0] ?? null;

    return {
      ...c,
      usedInCount: agg.jobCardIds.size,
      mostRecentJobCard,
      recentJobCards: sortedJobCards,
      lastTouchAt: agg.lastTouchAt,
      nextTouchAt: agg.nextTouchAt,
    };
  });

  // Sort: most recent activity desc, fallback createdAt desc
  result.sort((a, b) => {
    const aActivity = a.mostRecentJobCard?.updatedAt ?? a.lastTouchAt ?? a.createdAt;
    const bActivity = b.mostRecentJobCard?.updatedAt ?? b.lastTouchAt ?? b.createdAt;
    return bActivity.getTime() - aActivity.getTime();
  });

  return result;
}

// ─── Outreach ────────────────────────────────────────────────────────
export async function getOutreachThreads(userId: number, jobCardId?: number) {
  const db = await getDb();
  if (!db) return [];
  const conditions = [eq(outreachThreads.userId, userId)];
  if (jobCardId) conditions.push(eq(outreachThreads.jobCardId, jobCardId));
  return db.select().from(outreachThreads).where(and(...conditions)).orderBy(desc(outreachThreads.updatedAt));
}

export async function createOutreachThread(data: { userId: number; jobCardId?: number; contactId?: number; subject?: string; channel?: "email" | "linkedin" | "other" }) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.insert(outreachThreads).values(data as any);
  return result[0].insertId;
}

export async function getOutreachMessages(threadId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(outreachMessages).where(eq(outreachMessages.threadId, threadId)).orderBy(asc(outreachMessages.createdAt));
}

export async function createOutreachMessage(data: { threadId: number; direction?: "sent" | "received"; content: string; messageType?: "recruiter_email" | "linkedin_dm" | "follow_up_1" | "follow_up_2" | "custom"; sentAt?: Date }) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.insert(outreachMessages).values(data as any);
  return result[0].insertId;
}

export async function getOutreachPack(jobCardId: number, userId: number) {
  const db = await getDb();
  if (!db) return null;
  const rows = await db.select().from(outreachPacks).where(and(eq(outreachPacks.jobCardId, jobCardId), eq(outreachPacks.userId, userId))).orderBy(desc(outreachPacks.createdAt)).limit(1);
  return rows[0] ?? null;
}

export async function createOutreachPack(data: { userId: number; jobCardId: number; recruiterEmail?: string; linkedinDm?: string; followUp1?: string; followUp2?: string }) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.insert(outreachPacks).values(data as any);
  return result[0].insertId;
}

// ─── Analytics ───────────────────────────────────────────────────────
export async function getJobCardStats(userId: number) {
  const db = await getDb();
  if (!db) return { total: 0, byStage: {} as Record<string, number>, byPriority: {} as Record<string, number> };
  const allCards = await db.select().from(jobCards).where(eq(jobCards.userId, userId));
  const byStage: Record<string, number> = {};
  const byPriority: Record<string, number> = {};
  for (const card of allCards) {
    byStage[card.stage] = (byStage[card.stage] || 0) + 1;
    if (card.priority) byPriority[card.priority] = (byPriority[card.priority] || 0) + 1;
  }
  return { total: allCards.length, byStage, byPriority };
}

export async function getWeeklyApplications(userId: number) {
  const db = await getDb();
  if (!db) return [];
  const eightWeeksAgo = new Date();
  eightWeeksAgo.setDate(eightWeeksAgo.getDate() - 56);
  const applied = await db.select().from(jobCards).where(
    and(eq(jobCards.userId, userId), gte(jobCards.appliedAt, eightWeeksAgo))
  ).orderBy(asc(jobCards.appliedAt));
  // Group by week
  const weeks: Record<string, number> = {};
  for (const card of applied) {
    if (!card.appliedAt) continue;
    const d = new Date(card.appliedAt);
    const weekStart = new Date(d);
    weekStart.setDate(d.getDate() - d.getDay());
    const key = weekStart.toISOString().split("T")[0];
    weeks[key] = (weeks[key] || 0) + 1;
  }
  return Object.entries(weeks).map(([week, count]) => ({ week, count }));
}

export async function getTaskCompletionRate(userId: number) {
  const db = await getDb();
  if (!db) return { total: 0, completed: 0, rate: 0 };
  const allTasks = await db.select().from(tasks).where(eq(tasks.userId, userId));
  const completed = allTasks.filter(t => t.completed).length;
  return { total: allTasks.length, completed, rate: allTasks.length > 0 ? Math.round((completed / allTasks.length) * 100) : 0 };
}

// ─── Admin Helpers ──────────────────────────────────────────────────

export async function logAdminAction(adminUserId: number, action: string, targetUserId?: number, metadata?: Record<string, unknown>) {
  const db = await getDb();
  if (!db) return;
  await db.insert(adminActionLogs).values({
    adminUserId,
    action,
    targetUserId: targetUserId ?? null,
    metadataJson: metadata ? JSON.stringify(metadata) : null,
  });
}

export async function getAdminActionLogs(limit = 100) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(adminActionLogs).orderBy(desc(adminActionLogs.createdAt)).limit(limit);
}

// Admin: list all users with search
export async function adminListUsers(search?: string, limit = 50, offset = 0) {
  const db = await getDb();
  if (!db) return { users: [], total: 0 };
  if (search) {
    const pattern = `%${search}%`;
    const rows = await db.select().from(users)
      .where(or(sql`${users.name} LIKE ${pattern}`, sql`${users.email} LIKE ${pattern}`))
      .orderBy(desc(users.createdAt))
      .limit(limit).offset(offset);
    const countResult = await db.select({ count: sql<number>`COUNT(*)` }).from(users)
      .where(or(sql`${users.name} LIKE ${pattern}`, sql`${users.email} LIKE ${pattern}`));
    return { users: rows, total: Number(countResult[0]?.count ?? 0) };
  }
  const rows = await db.select().from(users).orderBy(desc(users.createdAt)).limit(limit).offset(offset);
  const countResult = await db.select({ count: sql<number>`COUNT(*)` }).from(users);
  return { users: rows, total: Number(countResult[0]?.count ?? 0) };
}

// Admin: get user detail with profile and activity summary
export async function adminGetUserDetail(userId: number) {
  const db = await getDb();
  if (!db) return null;
  const userRows = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  if (userRows.length === 0) return null;
  const user = userRows[0];
  const profile = await getProfile(userId);
  const balance = await getCreditsBalance(userId);
  const jobCardCount = await db.select({ count: sql<number>`COUNT(*)` }).from(jobCards).where(eq(jobCards.userId, userId));
  const evidenceRunCount = await db.select({ count: sql<number>`COUNT(*)` }).from(evidenceRuns).where(eq(evidenceRuns.userId, userId));
  const taskCount = await db.select({ count: sql<number>`COUNT(*)` }).from(tasks).where(eq(tasks.userId, userId));
  return {
    ...user,
    profile,
    creditBalance: balance,
    jobCardsCount: Number(jobCardCount[0]?.count ?? 0),
    evidenceRunsCount: Number(evidenceRunCount[0]?.count ?? 0),
    tasksCount: Number(taskCount[0]?.count ?? 0),
  };
}

// Admin: set isAdmin flag
export async function adminSetIsAdmin(userId: number, isAdmin: boolean) {
  const db = await getDb();
  if (!db) return;
  await db.update(users).set({ isAdmin, role: isAdmin ? 'admin' : 'user' }).where(eq(users.id, userId));
}

// Admin: disable/enable user
export async function adminSetDisabled(userId: number, disabled: boolean) {
  const db = await getDb();
  if (!db) return;
  await db.update(users).set({ disabled }).where(eq(users.id, userId));
}

// Admin: grant credits
export async function adminGrantCredits(userId: number, amount: number, adminUserId: number) {
  const db = await getDb();
  if (!db) return;
  const current = await getCreditsBalance(userId);
  const newBalance = current + amount;
  await db.update(creditsBalances).set({ balance: newBalance }).where(eq(creditsBalances.userId, userId));
  await db.insert(creditsLedger).values({
    userId, amount, reason: `Admin grant (by admin #${adminUserId})`, referenceType: "admin_grant", referenceId: null, balanceAfter: newBalance,
  });
}

// Admin: log admin test run (delta=0)
export async function adminLogTestRun(userId: number, reason: string, referenceType: string, referenceId?: number) {
  const db = await getDb();
  if (!db) return;
  const balance = await getCreditsBalance(userId);
  await db.insert(creditsLedger).values({
    userId, amount: 0, reason: `ADMIN TEST (no charge): ${reason}`, referenceType, referenceId: referenceId ?? null, balanceAfter: balance,
  });
}

// Admin: browse evidence runs (all users)
export async function adminListEvidenceRuns(filters?: { userId?: number; dateFrom?: Date; dateTo?: Date; status?: string }, limit = 50, offset = 0) {
  const db = await getDb();
  if (!db) return { runs: [], total: 0 };
  const conditions: any[] = [];
  if (filters?.userId) conditions.push(eq(evidenceRuns.userId, filters.userId));
  if (filters?.dateFrom) conditions.push(gte(evidenceRuns.createdAt, filters.dateFrom));
  if (filters?.dateTo) conditions.push(lte(evidenceRuns.createdAt, filters.dateTo));
  if (filters?.status) conditions.push(eq(evidenceRuns.status, filters.status as any));
  const where = conditions.length > 0 ? and(...conditions) : undefined;
  const rows = await db.select().from(evidenceRuns).where(where).orderBy(desc(evidenceRuns.createdAt)).limit(limit).offset(offset);
  const countResult = await db.select({ count: sql<number>`COUNT(*)` }).from(evidenceRuns).where(where);
  return { runs: rows, total: Number(countResult[0]?.count ?? 0) };
}

// Admin: get evidence run detail with items, JD snapshot, resume
export async function adminGetEvidenceRunDetail(runId: number) {
  const db = await getDb();
  if (!db) return null;
  const runRows = await db.select().from(evidenceRuns).where(eq(evidenceRuns.id, runId)).limit(1);
  if (runRows.length === 0) return null;
  const run = runRows[0];
  const items = await getEvidenceItems(runId);
  const jdSnapshotRows = await db.select().from(jdSnapshots).where(eq(jdSnapshots.id, run.jdSnapshotId)).limit(1);
  const resumeRows = await db.select().from(resumes).where(eq(resumes.id, run.resumeId)).limit(1);
  const userRows = await db.select().from(users).where(eq(users.id, run.userId)).limit(1);
  return {
    ...run,
    items,
    jdSnapshot: jdSnapshotRows[0] ?? null,
    resume: resumeRows[0] ?? null,
    user: userRows[0] ? { id: userRows[0].id, name: userRows[0].name, email: userRows[0].email } : null,
  };
}

// Admin: browse all ledger entries
export async function adminListLedger(filters?: { userId?: number; referenceType?: string; dateFrom?: Date; dateTo?: Date }, limit = 100, offset = 0) {
  const db = await getDb();
  if (!db) return { entries: [], total: 0 };
  const conditions: any[] = [];
  if (filters?.userId) conditions.push(eq(creditsLedger.userId, filters.userId));
  if (filters?.referenceType) conditions.push(eq(creditsLedger.referenceType, filters.referenceType));
  if (filters?.dateFrom) conditions.push(gte(creditsLedger.createdAt, filters.dateFrom));
  if (filters?.dateTo) conditions.push(lte(creditsLedger.createdAt, filters.dateTo));
  const where = conditions.length > 0 ? and(...conditions) : undefined;
  const rows = await db.select().from(creditsLedger).where(where).orderBy(desc(creditsLedger.createdAt)).limit(limit).offset(offset);
  const countResult = await db.select({ count: sql<number>`COUNT(*)` }).from(creditsLedger).where(where);
  return { entries: rows, total: Number(countResult[0]?.count ?? 0) };
}

// Admin: KPI stats
export async function adminGetKPIs() {
  const db = await getDb();
  if (!db) return { totalUsers: 0, activeUsers7d: 0, totalJobCards: 0, totalEvidenceRuns: 0, totalCreditsSpent: 0, errorRate: 0 };
  const totalUsersR = await db.select({ count: sql<number>`COUNT(*)` }).from(users);
  const sevenDaysAgo = new Date(); sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const activeUsersR = await db.select({ count: sql<number>`COUNT(*)` }).from(users).where(gte(users.lastSignedIn, sevenDaysAgo));
  const totalJobCardsR = await db.select({ count: sql<number>`COUNT(*)` }).from(jobCards);
  const totalRunsR = await db.select({ count: sql<number>`COUNT(*)` }).from(evidenceRuns);
  const failedRunsR = await db.select({ count: sql<number>`COUNT(*)` }).from(evidenceRuns).where(eq(evidenceRuns.status, "failed"));
  const totalSpentR = await db.select({ total: sql<number>`COALESCE(SUM(ABS(amount)), 0)` }).from(creditsLedger).where(sql`${creditsLedger.amount} < 0`);
  const totalRuns = Number(totalRunsR[0]?.count ?? 0);
  const failedRuns = Number(failedRunsR[0]?.count ?? 0);
  return {
    totalUsers: Number(totalUsersR[0]?.count ?? 0),
    activeUsers7d: Number(activeUsersR[0]?.count ?? 0),
    totalJobCards: Number(totalJobCardsR[0]?.count ?? 0),
    totalEvidenceRuns: totalRuns,
    totalCreditsSpent: Number(totalSpentR[0]?.total ?? 0),
    errorRate: totalRuns > 0 ? Math.round((failedRuns / totalRuns) * 100) : 0,
  };
}

// Admin: get all users count (for sandbox sample creation)
export async function adminGetUserById(userId: number) {
  const db = await getDb();
  if (!db) return null;
  const rows = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  return rows[0] ?? null;
}

// ─── JD Requirements ────────────────────────────────────────────────
export async function getRequirements(jobCardId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(jobCardRequirements)
    .where(eq(jobCardRequirements.jobCardId, jobCardId))
    .orderBy(asc(jobCardRequirements.requirementType), asc(jobCardRequirements.id));
}

export async function upsertRequirements(
  jobCardId: number,
  jdSnapshotId: number,
  items: Array<{ requirementText: string; requirementType: InsertJobCardRequirement["requirementType"] }>
) {
  const db = await getDb();
  if (!db) return;
  // Delete existing requirements for this job card, then insert fresh ones
  await db.delete(jobCardRequirements).where(eq(jobCardRequirements.jobCardId, jobCardId));
  if (items.length === 0) return;
  const rows: InsertJobCardRequirement[] = items.map(item => ({
    jobCardId,
    jdSnapshotId,
    requirementText: item.requirementText,
    requirementType: item.requirementType,
  }));
  await db.insert(jobCardRequirements).values(rows);
}

// ─── Application Kits ────────────────────────────────────────────────
export async function getApplicationKit(jobCardId: number, resumeId: number, evidenceRunId: number) {
  const db = await getDb();
  if (!db) return null;
  const rows = await db.select().from(applicationKits)
    .where(
      and(
        eq(applicationKits.jobCardId, jobCardId),
        eq(applicationKits.resumeId, resumeId),
        eq(applicationKits.evidenceRunId, evidenceRunId),
      )
    )
    .orderBy(desc(applicationKits.createdAt))
    .limit(1);
  return rows[0] ?? null;
}

export async function upsertApplicationKit(
  data: InsertApplicationKit & { id?: number }
): Promise<number> {
  const db = await getDb();
  if (!db) return 0;
  // Check for existing kit for same jobcard+resume+evidenceRun+tone
  const existing = await db.select({ id: applicationKits.id })
    .from(applicationKits)
    .where(
      and(
        eq(applicationKits.jobCardId, data.jobCardId),
        eq(applicationKits.resumeId, data.resumeId),
        eq(applicationKits.evidenceRunId, data.evidenceRunId),
        eq(applicationKits.tone, data.tone as "Human" | "Confident" | "Warm" | "Direct"),
      )
    )
    .limit(1);
  if (existing.length > 0) {
    await db.update(applicationKits)
      .set({
        topChangesJson: data.topChangesJson,
        bulletRewritesJson: data.bulletRewritesJson,
        coverLetterText: data.coverLetterText,
        createdAt: new Date(),
      })
      .where(eq(applicationKits.id, existing[0].id));
    return existing[0].id;
  }
  const result = await db.insert(applicationKits).values({
    jobCardId: data.jobCardId,
    resumeId: data.resumeId,
    evidenceRunId: data.evidenceRunId,
    regionCode: data.regionCode,
    trackCode: data.trackCode,
    tone: data.tone,
    topChangesJson: data.topChangesJson,
    bulletRewritesJson: data.bulletRewritesJson,
    coverLetterText: data.coverLetterText,
  });
  return (result as any)[0]?.insertId ?? 0;
}

export async function getLatestApplicationKit(jobCardId: number) {
  const db = await getDb();
  if (!db) return null;
  const rows = await db.select().from(applicationKits)
    .where(eq(applicationKits.jobCardId, jobCardId))
    .orderBy(desc(applicationKits.createdAt))
    .limit(1);
  return rows[0] ?? null;
}

// ─── Score History ────────────────────────────────────────────────────
export async function getScoreHistory(
  jobCardId: number,
  resumeId?: number,
  limit = 20
) {
  const db = await getDb();
  if (!db) return [];
  let query = db.select({
    id: evidenceRuns.id,
    resumeId: evidenceRuns.resumeId,
    overallScore: evidenceRuns.overallScore,
    createdAt: evidenceRuns.createdAt,
  })
    .from(evidenceRuns)
    .where(
      and(
        eq(evidenceRuns.jobCardId, jobCardId),
        eq(evidenceRuns.status, "completed"),
        ...(resumeId ? [eq(evidenceRuns.resumeId, resumeId)] : [])
      )
    )
    .orderBy(asc(evidenceRuns.createdAt))
    .limit(limit);
  return query;
}

// ─── Dashboard Score Trends (Patch 8G) ───────────────────────────────
/**
 * Returns up to `cardLimit` active job cards (bookmarked/applying/applied/interviewing)
 * for a user, each with up to `runsPerCard` most-recent completed evidence run scores.
 * Single query per table — no N+1.
 */
export async function getActiveScoredJobCards(
  userId: number,
  cardLimit = 10,
  runsPerCard = 10
): Promise<
  Array<{
    id: number;
    title: string;
    company: string | null;
    stage: string;
    updatedAt: Date;
    runs: Array<{ id: number; overallScore: number | null; createdAt: Date }>;
  }>
> {
  const db = await getDb();
  if (!db) return [];

  const ACTIVE_STAGES = ["bookmarked", "applying", "applied", "interviewing"] as const;

  // 1. Fetch active job cards (most recently updated first, limit cardLimit)
  const cards = await db
    .select({
      id: jobCards.id,
      title: jobCards.title,
      company: jobCards.company,
      stage: jobCards.stage,
      updatedAt: jobCards.updatedAt,
    })
    .from(jobCards)
    .where(
      and(
        eq(jobCards.userId, userId),
        sql`${jobCards.stage} IN ('bookmarked','applying','applied','interviewing')`
      )
    )
    .orderBy(desc(jobCards.updatedAt))
    .limit(cardLimit);

  if (cards.length === 0) return [];

  const cardIds = cards.map((c) => c.id);

  // 2. Fetch all completed runs for those cards in one query (most recent first)
  const runs = await db
    .select({
      id: evidenceRuns.id,
      jobCardId: evidenceRuns.jobCardId,
      overallScore: evidenceRuns.overallScore,
      createdAt: evidenceRuns.createdAt,
    })
    .from(evidenceRuns)
    .where(
      and(
        inArray(evidenceRuns.jobCardId, cardIds),
        eq(evidenceRuns.status, "completed")
      )
    )
    .orderBy(asc(evidenceRuns.createdAt));

  // 3. Group runs by jobCardId, keep last runsPerCard
  const runsByCard = new Map<number, Array<{ id: number; overallScore: number | null; createdAt: Date }>>();
  for (const run of runs) {
    if (!run.jobCardId) continue;
    const arr = runsByCard.get(run.jobCardId) ?? [];
    arr.push({ id: run.id, overallScore: run.overallScore, createdAt: run.createdAt });
    runsByCard.set(run.jobCardId, arr);
  }
  // Trim to last runsPerCard (already asc, so slice from end)
  for (const [cardId, arr] of Array.from(runsByCard.entries())) {
    if (arr.length > runsPerCard) {
      runsByCard.set(cardId, arr.slice(arr.length - runsPerCard));
    }
  }

  // 4. Merge
  return cards.map((card) => ({
    ...card,
    runs: runsByCard.get(card.id) ?? [],
  }));
}

// ─── Personalization Sources ─────────────────────────────────────────────────
export async function getPersonalizationSources(jobCardId: number, userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(jobCardPersonalizationSources)
    .where(and(
      eq(jobCardPersonalizationSources.jobCardId, jobCardId),
      eq(jobCardPersonalizationSources.userId, userId),
    ))
    .orderBy(asc(jobCardPersonalizationSources.capturedAt));
}

export async function upsertPersonalizationSource(
  data: InsertJobCardPersonalizationSource & { id?: number }
) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  if (data.id) {
    await db
      .update(jobCardPersonalizationSources)
      .set({
        sourceType: data.sourceType,
        url: data.url ?? null,
        pastedText: data.pastedText ?? null,
        updatedAt: new Date(),
      })
      .where(and(
        eq(jobCardPersonalizationSources.id, data.id),
        eq(jobCardPersonalizationSources.userId, data.userId),
      ));
    return data.id;
  } else {
    const [result] = await db
      .insert(jobCardPersonalizationSources)
      .values({
        jobCardId: data.jobCardId,
        userId: data.userId,
        sourceType: data.sourceType,
        url: data.url ?? null,
        pastedText: data.pastedText ?? null,
      });
    return (result as any).insertId as number;
  }
}

export async function deletePersonalizationSource(id: number, userId: number) {
  const db = await getDb();
  if (!db) return;
  await db
    .delete(jobCardPersonalizationSources)
    .where(and(
      eq(jobCardPersonalizationSources.id, id),
      eq(jobCardPersonalizationSources.userId, userId),
    ));
}

// ─── All Scanned Job Cards (Analytics ATS History) ───────────────────────────
export async function getAllScannedJobCards(
  userId: number
): Promise<
  Array<{
    id: number;
    title: string;
    company: string | null;
    stage: string;
    runs: Array<{ id: number; overallScore: number | null; createdAt: Date }>;
  }>
> {
  const db = await getDb();
  if (!db) return [];
  // 1. Fetch all job cards for this user that have at least 1 completed run
  const cards = await db
    .select({
      id: jobCards.id,
      title: jobCards.title,
      company: jobCards.company,
      stage: jobCards.stage,
    })
    .from(jobCards)
    .where(eq(jobCards.userId, userId))
    .orderBy(desc(jobCards.updatedAt));
  if (cards.length === 0) return [];
  const cardIds = cards.map((c) => c.id);
  // 2. Fetch all completed runs for those cards
  const runs = await db
    .select({
      id: evidenceRuns.id,
      jobCardId: evidenceRuns.jobCardId,
      overallScore: evidenceRuns.overallScore,
      createdAt: evidenceRuns.createdAt,
    })
    .from(evidenceRuns)
    .where(
      and(
        inArray(evidenceRuns.jobCardId, cardIds),
        eq(evidenceRuns.status, "completed")
      )
    )
    .orderBy(asc(evidenceRuns.createdAt));
  // 3. Group runs by jobCardId
  const runsByCard = new Map<number, Array<{ id: number; overallScore: number | null; createdAt: Date }>>();
  for (const run of runs) {
    if (!run.jobCardId) continue;
    const arr = runsByCard.get(run.jobCardId) ?? [];
    arr.push({ id: run.id, overallScore: run.overallScore, createdAt: run.createdAt });
    runsByCard.set(run.jobCardId, arr);
  }
  // 4. Merge and filter to only cards with >=1 run, sort by latest run desc
  const result = cards
    .map((card) => ({ ...card, runs: runsByCard.get(card.id) ?? [] }))
    .filter((card) => card.runs.length > 0)
    .sort((a, b) => {
      const aLatest = a.runs[a.runs.length - 1]?.createdAt?.getTime() ?? 0;
      const bLatest = b.runs[b.runs.length - 1]?.createdAt?.getTime() ?? 0;
      return bLatest - aLatest;
    });
  return result;
}

// ─── Operational Events ───────────────────────────────────────────────────────

/**
 * Insert a single operational event. Fire-and-forget — never throws.
 * Stores only non-PII fields: no payload, no names, no emails.
 */
export async function logOperationalEvent(
  event: InsertOperationalEvent
): Promise<void> {
  try {
    const db = await getDb();
    if (!db) return;
    await db.insert(operationalEvents).values(event);
  } catch {
    // Silently swallow — logging must never break the request path
  }
}

export interface AdminListOperationalEventsFilter {
  endpointGroup?: OperationalEvent["endpointGroup"];
  eventType?: OperationalEvent["eventType"];
  limit?: number;
  offset?: number;
}

/**
 * Return up to 500 operational events, newest first.
 * Supports optional filters by endpointGroup and eventType.
 */
export async function adminListOperationalEvents(
  filter: AdminListOperationalEventsFilter = {}
): Promise<OperationalEvent[]> {
  const db = await getDb();
  if (!db) return [];
  const { eq, and, desc } = await import("drizzle-orm");
  const { limit = 100, offset = 0, endpointGroup, eventType } = filter;

  const conditions: ReturnType<typeof eq>[] = [];
  if (endpointGroup) conditions.push(eq(operationalEvents.endpointGroup, endpointGroup));
  if (eventType) conditions.push(eq(operationalEvents.eventType, eventType));

  const rows = await db
    .select()
    .from(operationalEvents)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(operationalEvents.createdAt))
    .limit(Math.min(limit, 500))
    .offset(offset);

  return rows;
}

// ─── Waitlist Event Dedupe ──────────────────────────────────────────────────
/**
 * Returns true if a waitlist_joined operational event for this userIdHash
 * was already recorded within the last 24 hours.
 * Used to prevent spam logging on repeated page visits.
 */
export async function waitlistEventRecentlyLogged(userIdHash: string): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;
  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const rows = await db
    .select({ id: operationalEvents.id })
    .from(operationalEvents)
    .where(
      and(
        eq(operationalEvents.endpointGroup, "waitlist"),
        eq(operationalEvents.eventType, "waitlist_joined"),
        eq(operationalEvents.userIdHash, userIdHash),
        gte(operationalEvents.createdAt, cutoff),
      )
    )
    .limit(1);
  return rows.length > 0;
}

// ─── Stripe Events (idempotency) ─────────────────────────────────────────────

/**
 * Check whether a Stripe event has already been processed.
 * Returns true if the event ID exists in the stripe_events table.
 */
export async function stripeEventExists(stripeEventId: string): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;
  const { eq } = await import("drizzle-orm");
  const rows = await db
    .select({ id: stripeEvents.id })
    .from(stripeEvents)
    .where(eq(stripeEvents.stripeEventId, stripeEventId))
    .limit(1);
  return rows.length > 0;
}

/**
 * Record a processed Stripe event for idempotency.
 * Safe to call inside a try/catch — duplicate inserts are silently ignored.
 */
export async function recordStripeEvent(
  data: Pick<InsertStripeEvent, "stripeEventId" | "eventType" | "userId" | "creditsPurchased" | "status">
): Promise<void> {
  const db = await getDb();
  if (!db) return;
  try {
    await db.insert(stripeEvents).values({
      stripeEventId: data.stripeEventId,
      eventType: data.eventType,
      userId: data.userId ?? null,
      creditsPurchased: data.creditsPurchased ?? null,
      status: data.status,
    });
  } catch (err: any) {
    // Unique constraint violation = already processed; safe to ignore
    if (err?.code === "ER_DUP_ENTRY" || err?.message?.includes("Duplicate entry")) return;
    throw err;
  }
}

// ─── Admin: Stripe Events (Phase 10C-2) ──────────────────────────────────────
/**
 * List stripe_events for the admin view.
 * Returns only fields already in the stripe_events table — no joins, no PII.
 * Supports filtering by status and eventType, with limit/offset pagination.
 */
export async function adminListStripeEvents(filter: {
  status?: "processed" | "manual_review" | "skipped";
  eventType?: string;
  limit?: number;
  offset?: number;
}) {
  const db = await getDb();
  if (!db) return [];
  const { eq: eqFn, and: andFn, desc: descFn } = await import("drizzle-orm");
  const { limit = 100, offset = 0, status, eventType } = filter;
  const conditions: ReturnType<typeof eqFn>[] = [];
  if (status) conditions.push(eqFn(stripeEvents.status, status));
  if (eventType) conditions.push(eqFn(stripeEvents.eventType, eventType));
  const rows = await db
    .select()
    .from(stripeEvents)
    .where(conditions.length > 0 ? andFn(...conditions) : undefined)
    .orderBy(descFn(stripeEvents.createdAt))
    .limit(Math.min(limit, 500))
    .offset(offset);
  return rows;
}

// ─── Auto-purge helpers (Phase 10D-1) ────────────────────────────────────────

/** Retention windows in milliseconds */
export const OPERATIONAL_EVENTS_RETENTION_MS = 30 * 24 * 60 * 60 * 1000;  // 30 days
export const STRIPE_EVENTS_RETENTION_MS       = 90 * 24 * 60 * 60 * 1000;  // 90 days

/**
 * Delete operational_events rows older than 30 days.
 * Returns the number of rows deleted (or -1 if DB is unavailable).
 */
export async function purgeOldOperationalEvents(): Promise<number> {
  const db = await getDb();
  if (!db) return -1;
  const cutoff = new Date(Date.now() - OPERATIONAL_EVENTS_RETENTION_MS);
  const result = await db
    .delete(operationalEvents)
    .where(lte(operationalEvents.createdAt, cutoff));
  return (result as any)?.rowsAffected ?? 0;
}

/**
 * Delete stripe_events rows older than 90 days.
 * Returns the number of rows deleted (or -1 if DB is unavailable).
 */
export async function purgeOldStripeEvents(): Promise<number> {
  const db = await getDb();
  if (!db) return -1;
  const cutoff = new Date(Date.now() - STRIPE_EVENTS_RETENTION_MS);
  const result = await db
    .delete(stripeEvents)
    .where(lte(stripeEvents.createdAt, cutoff));
  return (result as any)?.rowsAffected ?? 0;
}

// ─── Early Access (Phase 10F-1) ──────────────────────────────────────────────
/** Grant or revoke early access for a user by userId.
 *  When transitioning to enabled=true for the first time, awards 10 starter credits
 *  (idempotent: earlyAccessGrantUsed flag prevents double-grants on re-enable).
 *  Returns { creditsGranted: boolean } so callers can surface the right confirmation.
 */
export async function adminSetEarlyAccess(
  userId: number,
  enabled: boolean,
): Promise<{ creditsGranted: boolean }> {
  const db = await getDb();
  if (!db) return { creditsGranted: false };

  if (enabled) {
    // Fetch current grant state to decide whether to award starter credits.
    const rows = await db
      .select({ earlyAccessGrantUsed: users.earlyAccessGrantUsed })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);
    const alreadyGranted = rows[0]?.earlyAccessGrantUsed ?? false;

    if (!alreadyGranted) {
      // First-time grant: award credits and mark the flag atomically.
      await addCredits(userId, 10, "early_access_grant", "early_access");
      await db
        .update(users)
        .set({ earlyAccessEnabled: true, earlyAccessGrantUsed: true })
        .where(eq(users.id, userId));
      return { creditsGranted: true };
    }
    // Already granted before — just re-enable access, no extra credits.
    await db.update(users).set({ earlyAccessEnabled: true }).where(eq(users.id, userId));
    return { creditsGranted: false };
  }

  // Revoking access: only flip the flag, never touch credits.
  await db.update(users).set({ earlyAccessEnabled: false }).where(eq(users.id, userId));
  return { creditsGranted: false };
}

/** Look up a user by email (for admin early-access toggle UI). */
export async function adminGetUserByEmail(email: string) {
  const db = await getDb();
  if (!db) return null;
  const result = await db
    .select({ id: users.id, name: users.name, email: users.email, role: users.role, earlyAccessEnabled: users.earlyAccessEnabled, earlyAccessGrantUsed: users.earlyAccessGrantUsed })
    .from(users)
    .where(eq(users.email, email))
    .limit(1);
  return result[0] ?? null;
}

// ─── V2 Phase 1B: Country Pack Resolver ──────────────────────────────────────
// Single source of truth for resolving the effective country pack for a user/job.
// Inheritance: job_cards.countryPackId → users.countryPackId → "US" (default).
// This helper is safe to call even when V2 flags are OFF — it does not change
// any V1 runtime behavior; it is only used by V2 procedures.

import { type CountryPackId, DEFAULT_COUNTRY_PACK_ID } from "../shared/countryPacks";

export interface ResolveCountryPackResult {
  /** The effective country pack to use for generation. */
  effectiveCountryPackId: CountryPackId;
  /** Where the effective pack came from. */
  source: "job_card" | "user" | "default";
  /** The user's own country pack setting (null if not set). */
  userCountryPackId: CountryPackId | null;
  /** The job card's country pack override (null if not set or jobCardId not provided). */
  jobCardCountryPackId: CountryPackId | null;
}

/**
 * Resolve the effective country pack for a given user + optional job card.
 *
 * Inheritance order:
 *   1. job_cards.countryPackId (if jobCardId provided and column is non-null)
 *   2. users.countryPackId (if non-null)
 *   3. DEFAULT_COUNTRY_PACK_ID ("US")
 *
 * Never throws — falls back to default on any DB error or missing record.
 */
export async function resolveCountryPack(params: {
  userId: number;
  jobCardId?: number | null;
}): Promise<ResolveCountryPackResult> {
  const { userId, jobCardId } = params;
  let userCountryPackId: CountryPackId | null = null;
  let jobCardCountryPackId: CountryPackId | null = null;

  try {
    const db = await getDb();
    if (!db) {
      return {
        effectiveCountryPackId: DEFAULT_COUNTRY_PACK_ID,
        source: "default",
        userCountryPackId: null,
        jobCardCountryPackId: null,
      };
    }

    // Fetch user's country pack setting
    const userRow = await db
      .select({ countryPackId: users.countryPackId })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);
    userCountryPackId = (userRow[0]?.countryPackId as CountryPackId | null | undefined) ?? null;

    // Fetch job card's country pack override (if jobCardId provided)
    if (jobCardId != null) {
      const jobRow = await db
        .select({ countryPackId: jobCards.countryPackId })
        .from(jobCards)
        .where(and(eq(jobCards.id, jobCardId), eq(jobCards.userId, userId)))
        .limit(1);
      jobCardCountryPackId = (jobRow[0]?.countryPackId as CountryPackId | null | undefined) ?? null;
    }
  } catch {
    // On any DB error, fall back to default safely
    return {
      effectiveCountryPackId: DEFAULT_COUNTRY_PACK_ID,
      source: "default",
      userCountryPackId: null,
      jobCardCountryPackId: null,
    };
  }

  // Apply inheritance rules
  if (jobCardCountryPackId != null) {
    return { effectiveCountryPackId: jobCardCountryPackId, source: "job_card", userCountryPackId, jobCardCountryPackId };
  }
  if (userCountryPackId != null) {
    return { effectiveCountryPackId: userCountryPackId, source: "user", userCountryPackId, jobCardCountryPackId };
  }
  return { effectiveCountryPackId: DEFAULT_COUNTRY_PACK_ID, source: "default", userCountryPackId, jobCardCountryPackId };
}

// ─── V2 Analytics KPI Helpers (Phase 1B.2) ──────────────────────────────────
import { analyticsEvents } from "../drizzle/schema";
import {
  EVT_SIGNUP_COMPLETED, EVT_JOB_CARD_CREATED, EVT_QUICK_MATCH_RUN,
  EVT_COVER_LETTER_GENERATED, EVT_OUTREACH_GENERATED,
  FUNNEL_STEPS,
} from "../shared/analyticsEvents";

async function countDistinctUsersForEvent(eventName: string, days: number): Promise<number> {
  const db = await getDb();
  if (!db) return 0;
  const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  const rows = await db
    .select({ cnt: sql<number>`COUNT(DISTINCT ${analyticsEvents.userId})` })
    .from(analyticsEvents)
    .where(and(eq(analyticsEvents.eventName, eventName), gte(analyticsEvents.eventAt, cutoff), sql`${analyticsEvents.userId} IS NOT NULL`));
  return Number(rows[0]?.cnt ?? 0);
}

export async function getActivatedUsers7d(): Promise<number> {
  const db = await getDb();
  if (!db) return 0;
  const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const jobCardUsers = await db
    .selectDistinct({ userId: analyticsEvents.userId })
    .from(analyticsEvents)
    .where(and(eq(analyticsEvents.eventName, EVT_JOB_CARD_CREATED), gte(analyticsEvents.eventAt, cutoff), sql`${analyticsEvents.userId} IS NOT NULL`));
  if (jobCardUsers.length === 0) return 0;
  const userIds = jobCardUsers.map((r) => r.userId as number);
  const rows = await db
    .select({ cnt: sql<number>`COUNT(DISTINCT ${analyticsEvents.userId})` })
    .from(analyticsEvents)
    .where(and(eq(analyticsEvents.eventName, EVT_QUICK_MATCH_RUN), gte(analyticsEvents.eventAt, cutoff), inArray(analyticsEvents.userId, userIds)));
  return Number(rows[0]?.cnt ?? 0);
}

export async function getNewUsers(days: 7 | 30): Promise<number> {
  // DB ground truth: count users created within the last N days
  // Accurate even if signup_completed analytics events are missing
  const db = await getDb();
  if (!db) return 0;
  const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  const rows = await db
    .select({ cnt: sql<number>`COUNT(*)` })
    .from(users)
    .where(gte(users.createdAt, cutoff));
  return Number(rows[0]?.cnt ?? 0);
}

export async function getWAU(): Promise<number> {
  const db = await getDb();
  if (!db) return 0;
  const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const rows = await db
    .select({ cnt: sql<number>`COUNT(DISTINCT ${analyticsEvents.userId})` })
    .from(analyticsEvents)
    .where(and(gte(analyticsEvents.eventAt, cutoff), sql`${analyticsEvents.userId} IS NOT NULL`));
  return Number(rows[0]?.cnt ?? 0);
}

export async function getMAU(): Promise<number> {
  const db = await getDb();
  if (!db) return 0;
  const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const rows = await db
    .select({ cnt: sql<number>`COUNT(DISTINCT ${analyticsEvents.userId})` })
    .from(analyticsEvents)
    .where(and(gte(analyticsEvents.eventAt, cutoff), sql`${analyticsEvents.userId} IS NOT NULL`));
  return Number(rows[0]?.cnt ?? 0);
}

export async function getFunnelCompletion7d(): Promise<Array<{ step: string; count: number; pct: number }>> {
  const db = await getDb();
  if (!db) return FUNNEL_STEPS.map((s) => ({ step: s, count: 0, pct: 0 }));
  const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const signupRows = await db
    .selectDistinct({ userId: analyticsEvents.userId })
    .from(analyticsEvents)
    .where(and(eq(analyticsEvents.eventName, EVT_SIGNUP_COMPLETED), gte(analyticsEvents.eventAt, cutoff), sql`${analyticsEvents.userId} IS NOT NULL`));
  const baseCount = signupRows.length;
  if (baseCount === 0) return FUNNEL_STEPS.map((s) => ({ step: s, count: 0, pct: 0 }));
  const signupUserIds = signupRows.map((r) => r.userId as number);
  const result: Array<{ step: string; count: number; pct: number }> = [];
  for (const step of FUNNEL_STEPS) {
    if (step === EVT_SIGNUP_COMPLETED) { result.push({ step, count: baseCount, pct: 100 }); continue; }
    const rows = await db
      .select({ cnt: sql<number>`COUNT(DISTINCT ${analyticsEvents.userId})` })
      .from(analyticsEvents)
      .where(and(eq(analyticsEvents.eventName, step), inArray(analyticsEvents.userId, signupUserIds)));
    const count = Number(rows[0]?.cnt ?? 0);
    result.push({ step, count, pct: baseCount > 0 ? Math.round((count / baseCount) * 100) : 0 });
  }
  return result;
}

export async function getP95AiLatency7d(): Promise<number | null> {
  const db = await getDb();
  if (!db) return null;
  const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const rows = await db
    .select({ props: analyticsEvents.props })
    .from(analyticsEvents)
    .where(and(eq(analyticsEvents.eventName, "ai_run_completed"), gte(analyticsEvents.eventAt, cutoff), sql`JSON_EXTRACT(${analyticsEvents.props}, '$.latency_ms') IS NOT NULL`));
  const latencies = rows
    .map((r) => { const p = r.props as Record<string, unknown> | null; return typeof p?.latency_ms === "number" ? p.latency_ms : null; })
    .filter((v): v is number => v !== null)
    .sort((a, b) => a - b);
  if (latencies.length === 0) return null;
  const idx = Math.ceil(latencies.length * 0.95) - 1;
  return latencies[Math.max(0, idx)];
}

export async function getOutcomeCounts(): Promise<{ interviews: number; offers: number }> {
  const db = await getDb();
  if (!db) return { interviews: 0, offers: 0 };
  const rows = await db.select({ props: analyticsEvents.props }).from(analyticsEvents).where(eq(analyticsEvents.eventName, "outcome_reported"));
  let interviews = 0; let offers = 0;
  for (const row of rows) { const p = row.props as Record<string, unknown> | null; if (p?.outcome === "interview") interviews++; if (p?.outcome === "offer") offers++; }
  return { interviews, offers };
}

export async function getErrorCount7d(): Promise<number> {
  const db = await getDb();
  if (!db) return 0;
  const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const rows = await db
    .select({ cnt: sql<number>`COUNT(*)` })
    .from(analyticsEvents)
    .where(and(inArray(analyticsEvents.eventName, ["client_error", "server_error"]), gte(analyticsEvents.eventAt, cutoff)));
  return Number(rows[0]?.cnt ?? 0);
}

export async function getEventCount(eventName: string, days: number): Promise<number> {
  const db = await getDb();
  if (!db) return 0;
  const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  const rows = await db
    .select({ cnt: sql<number>`COUNT(*)` })
    .from(analyticsEvents)
    .where(and(eq(analyticsEvents.eventName, eventName), gte(analyticsEvents.eventAt, cutoff)));
  return Number(rows[0]?.cnt ?? 0);
}

// ─── Instrumentation Health (admin-only) ─────────────────────────────
export interface InstrumentationHealth {
  events24h: number;
  lastEventAt: Date | null;
  topEvents24h: Array<{ name: string; count: number }>;
}

export async function getInstrumentationHealth24h(): Promise<InstrumentationHealth> {
  const db = await getDb();
  if (!db) return { events24h: 0, lastEventAt: null, topEvents24h: [] };
  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);

  // Total events in last 24h
  const totalRows = await db
    .select({ cnt: sql<number>`COUNT(*)` })
    .from(analyticsEvents)
    .where(gte(analyticsEvents.eventAt, cutoff));
  const events24h = Number(totalRows[0]?.cnt ?? 0);

  // Most recent event timestamp
  const lastRows = await db
    .select({ lastAt: sql<Date | null>`MAX(${analyticsEvents.eventAt})` })
    .from(analyticsEvents)
    .where(gte(analyticsEvents.eventAt, cutoff));
  const lastEventAt = lastRows[0]?.lastAt ?? null;

  // Top 5 event names by count in last 24h (no props — non-PII)
  const topRows = await db
    .select({
      name: analyticsEvents.eventName,
      count: sql<number>`COUNT(*)`,
    })
    .from(analyticsEvents)
    .where(gte(analyticsEvents.eventAt, cutoff))
    .groupBy(analyticsEvents.eventName)
    .orderBy(sql`COUNT(*) DESC`)
    .limit(5);
  const topEvents24h = topRows.map((r) => ({ name: r.name, count: Number(r.count) }));

  return { events24h, lastEventAt, topEvents24h };
}

// ─── getDailyMetrics ─────────────────────────────────────────────────────────
// Returns per-day buckets for the last N days (UTC dates, YYYY-MM-DD).
// Two queries: one for analytics_events (grouped by date+eventName), one for
// new users (grouped by date from users.createdAt). Merged in JS.

export interface DailyMetricBucket {
  date: string; // "YYYY-MM-DD"
  eventsTotal: number;
  newUsers: number;
  jobCardCreated: number;
  quickMatchRun: number;
  coverLetterGenerated: number;
  outreachGenerated: number;
}

export async function getDailyMetrics(rangeDays: 7 | 14 | 30): Promise<DailyMetricBucket[]> {
  const db = await getDb();
  if (!db) return [];
  const cutoff = new Date(Date.now() - rangeDays * 24 * 60 * 60 * 1000);
  const cutoffStr = cutoff.toISOString().replace('T', ' ').slice(0, 23);
  // Query 1: raw SQL avoids MySQL ONLY_FULL_GROUP_BY with DATE_FORMAT in SELECT
  type EvtRow = { date: string; eventName: string; cnt: string | number };
  type UserRow = { date: string; cnt: string | number };
  const [evtResult] = await db.execute(
    sql.raw(`SELECT DATE_FORMAT(\`eventAt\`, '%Y-%m-%d') AS date, \`eventName\` AS eventName, COUNT(*) AS cnt FROM analytics_events WHERE \`eventAt\` >= '${cutoffStr}' GROUP BY DATE_FORMAT(\`eventAt\`, '%Y-%m-%d'), \`eventName\``)
  ) as unknown as [EvtRow[], unknown];
  const evtRows: EvtRow[] = Array.isArray(evtResult) ? evtResult : [];
  // Query 2: new users grouped by date
  const [userResult] = await db.execute(
    sql.raw(`SELECT DATE_FORMAT(\`createdAt\`, '%Y-%m-%d') AS date, COUNT(*) AS cnt FROM users WHERE \`createdAt\` >= '${cutoffStr}' GROUP BY DATE_FORMAT(\`createdAt\`, '%Y-%m-%d')`)
  ) as unknown as [UserRow[], unknown];
  const userRows: UserRow[] = Array.isArray(userResult) ? userResult : [];

  // Build a map of date -> bucket, seeded with all dates in range (zero-filled)
  const buckets = new Map<string, DailyMetricBucket>();
  for (let i = rangeDays - 1; i >= 0; i--) {
    const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
    const key = d.toISOString().slice(0, 10);
    buckets.set(key, {
      date: key,
      eventsTotal: 0,
      newUsers: 0,
      jobCardCreated: 0,
      quickMatchRun: 0,
      coverLetterGenerated: 0,
      outreachGenerated: 0,
    });
  }

  // Merge analytics_events rows
  for (const row of evtRows) {
    const b = buckets.get(row.date);
    if (!b) continue;
    const cnt = Number(row.cnt);
    b.eventsTotal += cnt;
    if (row.eventName === EVT_JOB_CARD_CREATED) b.jobCardCreated += cnt;
    else if (row.eventName === EVT_QUICK_MATCH_RUN) b.quickMatchRun += cnt;
    else if (row.eventName === EVT_COVER_LETTER_GENERATED) b.coverLetterGenerated += cnt;
    else if (row.eventName === EVT_OUTREACH_GENERATED) b.outreachGenerated += cnt;
  }

  // Merge new users rows
  for (const row of userRows) {
    const b = buckets.get(row.date);
    if (!b) continue;
    b.newUsers += Number(row.cnt);
  }

  return Array.from(buckets.values()).sort((a, b) => a.date.localeCompare(b.date));
}

// ─── Purchase Receipts (Phase 11C.1) ─────────────────────────────────────────

/**
 * Create a purchase receipt. Idempotent: if a row with the same
 * stripeCheckoutSessionId already exists, the insert is silently ignored.
 */
export async function createPurchaseReceipt(data: InsertPurchaseReceipt): Promise<void> {
  const db = await getDb();
  if (!db) return;
  try {
    await db.insert(purchaseReceipts).values(data);
  } catch (err: any) {
    // Duplicate key on stripeCheckoutSessionId — idempotent, ignore
    if (err?.code === 'ER_DUP_ENTRY' || err?.message?.includes('Duplicate entry')) return;
    throw err;
  }
}

/**
 * List purchase receipts for a user, newest first.
 * Returns at most `limit` rows (default 50).
 */
export async function listPurchaseReceipts(
  userId: number,
  limit = 50
): Promise<PurchaseReceipt[]> {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(purchaseReceipts)
    .where(eq(purchaseReceipts.userId, userId))
    .orderBy(desc(purchaseReceipts.createdAt))
    .limit(limit);
}

/**
 * Check if a purchase receipt already exists for a given Stripe session.
 * Used to prevent duplicate receipt creation on webhook retries.
 */
export async function purchaseReceiptExists(stripeCheckoutSessionId: string): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;
  const rows = await db
    .select({ id: purchaseReceipts.id })
    .from(purchaseReceipts)
    .where(eq(purchaseReceipts.stripeCheckoutSessionId, stripeCheckoutSessionId))
    .limit(1);
  return rows.length > 0;
}

// ─── Refund Queue (Phase 11D) ─────────────────────────────────────────────────
import {
  refundQueue, InsertRefundQueueItem, RefundQueueItem,
} from "../drizzle/schema";

/**
 * Create a refund queue item from a charge.refunded Stripe event.
 * Idempotent: if a row with the same stripeRefundId already exists, the insert
 * is silently ignored (duplicate key on unique constraint).
 */
export async function createRefundQueueItem(data: InsertRefundQueueItem): Promise<void> {
  const db = await getDb();
  if (!db) return;
  try {
    await db.insert(refundQueue).values(data);
  } catch (err: any) {
    if (err?.code === 'ER_DUP_ENTRY' || err?.message?.includes('Duplicate entry')) return;
    throw err;
  }
}

/**
 * List refund queue items for admin review.
 * Returns all items ordered by createdAt desc, optionally filtered by status.
 */
export async function listRefundQueueItems(
  status?: "pending" | "processed" | "ignored",
  limit = 100
): Promise<RefundQueueItem[]> {
  const db = await getDb();
  if (!db) return [];
  const query = db
    .select()
    .from(refundQueue)
    .orderBy(desc(refundQueue.createdAt))
    .limit(limit);
  if (status) {
    return db
      .select()
      .from(refundQueue)
      .where(eq(refundQueue.status, status))
      .orderBy(desc(refundQueue.createdAt))
      .limit(limit);
  }
  return query;
}

/**
 * Process a refund queue item: apply a negative ledger entry and mark as processed.
 * Idempotent: if ledgerEntryId is already set, returns false (already processed).
 * Returns the new ledger entry id on success, or null if already processed.
 */
export async function processRefundQueueItem(
  refundQueueId: number,
  adminUserId: number,
  debitAmount: number,
  reason: string
): Promise<number | null> {
  const db = await getDb();
  if (!db) return null;

  // Fetch the item
  const rows = await db
    .select()
    .from(refundQueue)
    .where(eq(refundQueue.id, refundQueueId))
    .limit(1);
  const item = rows[0];
  if (!item) throw new Error(`Refund queue item ${refundQueueId} not found`);

  // Idempotency: already processed
  if (item.ledgerEntryId !== null && item.ledgerEntryId !== undefined) return null;
  if (item.status === "processed") return null;

  const userId = item.userId;
  if (!userId) throw new Error("Cannot debit credits: no userId on refund queue item");

  // Apply negative ledger entry (allow balance to go negative per spec)
  const current = await getCreditsBalance(userId);
  const newBalance = current - debitAmount;
  await db.update(creditsBalances).set({ balance: newBalance }).where(eq(creditsBalances.userId, userId));
  const [ledgerResult] = await db.insert(creditsLedger).values({
    userId,
    amount: -debitAmount,
    reason,
    referenceType: "refund",
    referenceId: null,
    balanceAfter: newBalance,
  });
  const ledgerEntryId = (ledgerResult as any).insertId as number;

  // Mark as processed
  await db.update(refundQueue)
    .set({ status: "processed", adminUserId, ledgerEntryId, processedAt: new Date() })
    .where(eq(refundQueue.id, refundQueueId));

  return ledgerEntryId;
}

/**
 * Ignore a refund queue item (no credits debited).
 * Requires a non-empty reason string.
 */
export async function ignoreRefundQueueItem(
  refundQueueId: number,
  adminUserId: number,
  reason: string
): Promise<void> {
  const db = await getDb();
  if (!db) return;
  if (!reason || reason.trim().length === 0) {
    throw new Error("Ignore reason is required");
  }
  await db.update(refundQueue)
    .set({ status: "ignored", adminUserId, ignoreReason: reason.trim(), processedAt: new Date() })
    .where(eq(refundQueue.id, refundQueueId));
}

/**
 * Check if a refund queue item already exists for a given Stripe refund ID.
 */
export async function refundQueueItemExists(stripeRefundId: string): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;
  const rows = await db
    .select({ id: refundQueue.id })
    .from(refundQueue)
    .where(eq(refundQueue.stripeRefundId, stripeRefundId))
    .limit(1);
  return rows.length > 0;
}

// ─── Phase 11F: Purchase Email Idempotency Helpers ────────────────────────────

/**
 * Mark a purchase receipt as having had its confirmation email sent.
 * Sets emailSentAt to now and clears any previous emailError.
 */
export async function markReceiptEmailSent(receiptId: number): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.update(purchaseReceipts)
    .set({ emailSentAt: new Date(), emailError: null })
    .where(eq(purchaseReceipts.id, receiptId));
}

/**
 * Record an email error on a purchase receipt so it can be retried later.
 * Does NOT set emailSentAt so the next webhook replay will attempt again.
 */
export async function markReceiptEmailError(receiptId: number, error: string): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.update(purchaseReceipts)
    .set({ emailError: error.slice(0, 1000) })
    .where(eq(purchaseReceipts.id, receiptId));
}

/**
 * Fetch a purchase receipt by its Stripe checkout session ID.
 * Returns null if not found.
 */
export async function getPurchaseReceiptBySessionId(
  stripeCheckoutSessionId: string
): Promise<PurchaseReceipt | null> {
  const db = await getDb();
  if (!db) return null;
  const rows = await db
    .select()
    .from(purchaseReceipts)
    .where(eq(purchaseReceipts.stripeCheckoutSessionId, stripeCheckoutSessionId))
    .limit(1);
  return rows[0] ?? null;
}

/**
 * Fetch a single purchase receipt by its internal ID.
 * Returns null if not found.
 */
export async function getPurchaseReceiptById(
  id: number
): Promise<PurchaseReceipt | null> {
  const db = await getDb();
  if (!db) return null;
  const rows = await db
    .select()
    .from(purchaseReceipts)
    .where(eq(purchaseReceipts.id, id))
    .limit(1);
  return rows[0] ?? null;
}



/**
 * Admin: list all purchase receipts across all users, ordered by most recent first.
 * Supports optional userId filter, emailSentAt filter, and free-text query
 * (searches user email via LEFT JOIN with users table, or receipt ID if numeric).
 */
export async function adminListPurchaseReceipts(
  filters?: { userId?: number; emailSentAt?: "sent" | "unsent"; query?: string },
  limit = 100,
  offset = 0
): Promise<(PurchaseReceipt & { userEmail: string | null })[]> {
  const db = await getDb();
  if (!db) return [];
  // Build WHERE conditions
  const conditions: ReturnType<typeof eq>[] = [];
  if (filters?.userId !== undefined) {
    conditions.push(eq(purchaseReceipts.userId, filters.userId));
  }
  if (filters?.emailSentAt === "unsent") {
    conditions.push(isNull(purchaseReceipts.emailSentAt));
  } else if (filters?.emailSentAt === "sent") {
    conditions.push(isNotNull(purchaseReceipts.emailSentAt));
  }
  if (filters?.query) {
    const q = filters.query.trim();
    if (/^\d+$/.test(q)) {
      // All digits → match userId OR receiptId
      const numericId = parseInt(q, 10);
      conditions.push(or(eq(purchaseReceipts.userId, numericId), eq(purchaseReceipts.id, numericId))!);
    } else if (q.startsWith("#")) {
      // "#NNN" → match receipt ID exactly (strip # prefix)
      const receiptId = parseInt(q.slice(1), 10);
      if (!isNaN(receiptId)) {
        conditions.push(eq(purchaseReceipts.id, receiptId));
      }
    } else if (q.includes("@")) {
      // Contains "@" → case-insensitive partial email match
      const pattern = `%${q}%`;
      conditions.push(sql`${users.email} LIKE ${pattern}`);
    }
    // else: unrecognised format → no filter added (spec: "do nothing / show No matches")
  }
  // LEFT JOIN with users to expose userEmail
  const baseQuery = db
    .select({
      id: purchaseReceipts.id,
      userId: purchaseReceipts.userId,
      stripeCheckoutSessionId: purchaseReceipts.stripeCheckoutSessionId,
      packId: purchaseReceipts.packId,
      creditsAdded: purchaseReceipts.creditsAdded,
      amountCents: purchaseReceipts.amountCents,
      currency: purchaseReceipts.currency,
      stripePaymentIntentId: purchaseReceipts.stripePaymentIntentId,
      stripeReceiptUrl: purchaseReceipts.stripeReceiptUrl,
      createdAt: purchaseReceipts.createdAt,
      emailSentAt: purchaseReceipts.emailSentAt,
      emailError: purchaseReceipts.emailError,
      userEmail: users.email,
    })
    .from(purchaseReceipts)
    .leftJoin(users, eq(purchaseReceipts.userId, users.id))
    .orderBy(desc(purchaseReceipts.createdAt))
    .limit(limit)
    .offset(offset);
  if (conditions.length > 0) {
    return baseQuery.where(and(...conditions));
  }
  return baseQuery;
}

// ─── Ops Status helpers (Phase 12E.1) ────────────────────────────────────────
/** Return the single ops_status row, or null if the table is empty. */
export async function getOpsStatus() {
  const db = await getDb();
  if (!db) return null;
  const { opsStatus } = await import("../drizzle/schema");
  const rows = await db.select().from(opsStatus).limit(1);
  return rows[0] ?? null;
}

/** Upsert the single ops_status row (id=1). Called by the webhook handler. */
export async function upsertOpsStatus(patch: {
  lastStripeWebhookSuccessAt?: Date;
  lastStripeWebhookFailureAt?: Date;
  lastStripeWebhookEventId?: string;
  lastStripeWebhookEventType?: string;
}) {
  const db = await getDb();
  if (!db) return;
  const { opsStatus } = await import("../drizzle/schema");
  await db
    .insert(opsStatus)
    .values({ id: 1, ...patch, updatedAt: new Date() })
    .onDuplicateKeyUpdate({ set: { ...patch, updatedAt: new Date() } });
}

// ─── Phase 12H: Stripe Events Audit Pagination ───────────────────────────────
export async function getStripeEventsPage(
  limit: number,
  cursor?: number
): Promise<{ items: StripeEvent[]; nextCursor: number | null }> {
  const db = await getDb();
  if (!db) return { items: [], nextCursor: null };
  const pageSize = Math.min(limit, 50);
  const conditions = cursor !== undefined ? lt(stripeEvents.id, cursor) : undefined;
  const rows = await db
    .select()
    .from(stripeEvents)
    .where(conditions)
    .orderBy(desc(stripeEvents.id))
    .limit(pageSize + 1);
  const hasMore = rows.length > pageSize;
  const items = hasMore ? rows.slice(0, pageSize) : rows;
  const nextCursor = hasMore ? items[items.length - 1].id : null;
  return { items, nextCursor };
}
