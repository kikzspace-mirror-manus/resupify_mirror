import { eq, and, desc, asc, lte, gte, sql, isNull, or } from "drizzle-orm";
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

export async function getCreditLedger(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(creditsLedger).where(eq(creditsLedger.userId, userId)).orderBy(desc(creditsLedger.createdAt));
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
  return db.select().from(jobCards).where(and(...conditions)).orderBy(desc(jobCards.updatedAt));
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
