import { eq, and, desc, asc, lte, gte, sql, isNull, or, inArray } from "drizzle-orm";
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
  stripeEvents, InsertStripeEvent,
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
