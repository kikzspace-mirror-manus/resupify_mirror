import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, json, boolean } from "drizzle-orm/mysql-core";

// ─── Users ───────────────────────────────────────────────────────────
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  isAdmin: boolean("isAdmin").default(false).notNull(),
  adminNotes: text("adminNotes"),
  disabled: boolean("disabled").default(false).notNull(),
  earlyAccessEnabled: boolean("earlyAccessEnabled").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// ─── User Profiles (onboarding data) ────────────────────────────────
export const userProfiles = mysqlTable("user_profiles", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  regionCode: varchar("regionCode", { length: 16 }).notNull().default("CA"),
  trackCode: mysqlEnum("trackCode", ["COOP", "NEW_GRAD"]).notNull().default("COOP"),
  school: varchar("school", { length: 256 }),
  program: varchar("program", { length: 256 }),
  graduationDate: varchar("graduationDate", { length: 32 }),
  currentlyEnrolled: boolean("currentlyEnrolled").default(false),
  onboardingComplete: boolean("onboardingComplete").default(false),
  onboardingSkippedAt: timestamp("onboardingSkippedAt"),
  workStatus: mysqlEnum("workStatus", ["citizen_pr", "temporary_resident", "unknown"]).default("unknown"),
  workStatusDetail: mysqlEnum("workStatusDetail", ["open_work_permit", "employer_specific_permit", "student_work_authorization", "other"]),
  needsSponsorship: mysqlEnum("needsSponsorship", ["true", "false", "unknown"]).default("unknown"),
  countryOfResidence: varchar("countryOfResidence", { length: 128 }),
  willingToRelocate: boolean("willingToRelocate"),
  phone: varchar("phone", { length: 64 }),
  linkedinUrl: text("linkedinUrl"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type UserProfile = typeof userProfiles.$inferSelect;;
export type InsertUserProfile = typeof userProfiles.$inferInsert;

// ─── Credits ─────────────────────────────────────────────────────────
export const creditsBalances = mysqlTable("credits_balances", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  balance: int("balance").notNull().default(3), // 3 free Evidence+ATS runs
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type CreditsBalance = typeof creditsBalances.$inferSelect;

export const creditsLedger = mysqlTable("credits_ledger", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  amount: int("amount").notNull(), // positive = add, negative = spend
  reason: text("reason").notNull(),
  referenceType: varchar("referenceType", { length: 64 }), // e.g., "evidence_run", "outreach_pack", "batch_sprint", "purchase"
  referenceId: int("referenceId"),
  balanceAfter: int("balanceAfter").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type CreditsLedgerEntry = typeof creditsLedger.$inferSelect;

// ─── Resumes ─────────────────────────────────────────────────────────
export const resumes = mysqlTable("resumes", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  title: varchar("title", { length: 256 }).notNull(),
  content: text("content").notNull(), // plain text content of resume
  fileUrl: text("fileUrl"), // S3 URL if uploaded as file
  fileKey: text("fileKey"),
  version: int("version").notNull().default(1),
  parentId: int("parentId"), // for versioning chain
  isActive: boolean("isActive").default(true),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Resume = typeof resumes.$inferSelect;
export type InsertResume = typeof resumes.$inferInsert;

// ─── Job Cards ───────────────────────────────────────────────────────
export const jobCards = mysqlTable("job_cards", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  title: varchar("title", { length: 512 }).notNull(),
  company: varchar("company", { length: 256 }),
  location: varchar("location", { length: 256 }),
  url: text("url"),
  stage: mysqlEnum("stage", [
    "bookmarked", "applying", "applied", "interviewing", "offered", "rejected", "archived"
  ]).notNull().default("bookmarked"),
  priority: mysqlEnum("priority", ["low", "medium", "high"]).default("medium"),
  season: mysqlEnum("season", ["fall", "winter", "summer", "year_round"]),
  notes: text("notes"),
  nextTouchAt: timestamp("nextTouchAt"),
  appliedAt: timestamp("appliedAt"),
  followupsScheduledAt: timestamp("followupsScheduledAt"),
  dueDate: timestamp("dueDate"),
  salary: varchar("salary", { length: 128 }),
  jobType: varchar("jobType", { length: 64 }), // full-time, part-time, contract, internship
  eligibilityPrecheckStatus: mysqlEnum("eligibilityPrecheckStatus", ["none", "recommended", "conflict"]).default("none"),
  eligibilityPrecheckRulesJson: text("eligibilityPrecheckRulesJson"), // JSON array of { ruleId, title }
  eligibilityPrecheckUpdatedAt: timestamp("eligibilityPrecheckUpdatedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type JobCard = typeof jobCards.$inferSelect;
export type InsertJobCard = typeof jobCards.$inferInsert;

// ─── JD Snapshots (immutable) ────────────────────────────────────────
export const jdSnapshots = mysqlTable("jd_snapshots", {
  id: int("id").autoincrement().primaryKey(),
  jobCardId: int("jobCardId").notNull(),
  snapshotText: text("snapshotText").notNull(),
  sourceUrl: text("sourceUrl"),
  version: int("version").notNull().default(1),
  capturedAt: timestamp("capturedAt").defaultNow().notNull(),
});

export type JdSnapshot = typeof jdSnapshots.$inferSelect;
export type InsertJdSnapshot = typeof jdSnapshots.$inferInsert;
// ─── JD Requirements (extracted from JD Snapshot via LLM) ───────────
export const jobCardRequirements = mysqlTable("job_card_requirements", {
  id: int("id").autoincrement().primaryKey(),
  jobCardId: int("jobCardId").notNull(),
  jdSnapshotId: int("jdSnapshotId").notNull(),
  requirementText: text("requirementText").notNull(),
  requirementType: mysqlEnum("requirementType", ["skill", "responsibility", "tool", "softskill", "eligibility"]).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type JobCardRequirement = typeof jobCardRequirements.$inferSelect;
export type InsertJobCardRequirement = typeof jobCardRequirements.$inferInsert;

// ─── Evidence Runs ───────────────────────────────────────────────────
export const evidenceRuns = mysqlTable("evidence_runs", {
  id: int("id").autoincrement().primaryKey(),
  jobCardId: int("jobCardId").notNull(),
  userId: int("userId").notNull(),
  resumeId: int("resumeId").notNull(),
  jdSnapshotId: int("jdSnapshotId").notNull(),
  regionCode: varchar("regionCode", { length: 16 }).notNull(),
  trackCode: varchar("trackCode", { length: 16 }).notNull(),
  overallScore: int("overallScore"), // 0-100
  summary: text("summary"),
  scoreBreakdownJson: text("scoreBreakdownJson"), // JSON: { evidence_strength, keyword_coverage, formatting_ats, role_fit, flags }
  status: mysqlEnum("status", ["pending", "running", "completed", "failed"]).default("pending"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  completedAt: timestamp("completedAt"),
});

export type EvidenceRun = typeof evidenceRuns.$inferSelect;
export type InsertEvidenceRun = typeof evidenceRuns.$inferInsert;

// ─── Evidence Items ──────────────────────────────────────────────────
export const evidenceItems = mysqlTable("evidence_items", {
  id: int("id").autoincrement().primaryKey(),
  evidenceRunId: int("evidenceRunId").notNull(),
  groupType: mysqlEnum("groupType", [
    "eligibility", "tools", "responsibilities", "skills", "soft_skills"
  ]).notNull(),
  jdRequirement: text("jdRequirement").notNull(),
  resumeProof: text("resumeProof"), // null = "None found"
  status: mysqlEnum("status", ["matched", "partial", "missing"]).notNull(),
  fix: text("fix"),
  rewriteA: text("rewriteA"),
  rewriteB: text("rewriteB"),
  whyItMatters: text("whyItMatters"),
  needsConfirmation: boolean("needsConfirmation").default(false),
  sortOrder: int("sortOrder").default(0),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type EvidenceItem = typeof evidenceItems.$inferSelect;
export type InsertEvidenceItem = typeof evidenceItems.$inferInsert;

// ─── Tasks ───────────────────────────────────────────────────────────
export const tasks = mysqlTable("tasks", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  jobCardId: int("jobCardId"),
  title: varchar("title", { length: 512 }).notNull(),
  description: text("description"),
  taskType: mysqlEnum("taskType", [
    "follow_up", "apply", "interview_prep", "custom", "outreach", "review_evidence"
  ]).default("custom"),
  completed: boolean("completed").default(false),
  dueDate: timestamp("dueDate"),
  completedAt: timestamp("completedAt"),
  /** Set when user clicks "Mark as sent" on a follow_up task. Null for non-followup tasks. */
  sentAt: timestamp("sentAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Task = typeof tasks.$inferSelect;
export type InsertTask = typeof tasks.$inferInsert;

// ─── Contacts ────────────────────────────────────────────────────────
export const contacts = mysqlTable("contacts", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  jobCardId: int("jobCardId"),
  name: varchar("name", { length: 256 }).notNull(),
  role: varchar("contactRole", { length: 256 }),
  company: varchar("company", { length: 256 }),
  email: varchar("email", { length: 320 }),
  linkedinUrl: text("linkedinUrl"),
  phone: varchar("phone", { length: 64 }),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Contact = typeof contacts.$inferSelect;
export type InsertContact = typeof contacts.$inferInsert;

// ─── Outreach Threads ────────────────────────────────────────────────
export const outreachThreads = mysqlTable("outreach_threads", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  jobCardId: int("jobCardId"),
  contactId: int("contactId"),
  subject: varchar("subject", { length: 512 }),
  channel: mysqlEnum("channel", ["email", "linkedin", "other"]).default("email"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type OutreachThread = typeof outreachThreads.$inferSelect;

// ─── Outreach Messages ───────────────────────────────────────────────
export const outreachMessages = mysqlTable("outreach_messages", {
  id: int("id").autoincrement().primaryKey(),
  threadId: int("threadId").notNull(),
  direction: mysqlEnum("direction", ["sent", "received"]).default("sent"),
  content: text("content").notNull(),
  messageType: mysqlEnum("messageType", [
    "recruiter_email", "linkedin_dm", "follow_up_1", "follow_up_2", "custom"
  ]).default("custom"),
  sentAt: timestamp("sentAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type OutreachMessage = typeof outreachMessages.$inferSelect;

// ─── Outreach Packs (generated) ──────────────────────────────────────
export const outreachPacks = mysqlTable("outreach_packs", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  jobCardId: int("jobCardId").notNull(),
  recruiterEmail: text("recruiterEmail"),
  linkedinDm: text("linkedinDm"),
  followUp1: text("followUp1"),
  followUp2: text("followUp2"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type OutreachPack = typeof outreachPacks.$inferSelect;

// ─── Admin Action Logs ──────────────────────────────────────────────
export const adminActionLogs = mysqlTable("admin_action_logs", {
  id: int("id").autoincrement().primaryKey(),
  adminUserId: int("adminUserId").notNull(),
  action: varchar("action", { length: 256 }).notNull(),
  targetUserId: int("targetUserId"),
  metadataJson: text("metadataJson"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type AdminActionLog = typeof adminActionLogs.$inferSelect;
export type InsertAdminActionLog = typeof adminActionLogs.$inferInsert;

// ─── Application Kits ────────────────────────────────────────────────
export const applicationKits = mysqlTable("application_kits", {
  id: int("id").autoincrement().primaryKey(),
  jobCardId: int("jobCardId").notNull(),
  resumeId: int("resumeId").notNull(),
  evidenceRunId: int("evidenceRunId").notNull(),
  regionCode: varchar("regionCode", { length: 16 }).notNull(),
  trackCode: varchar("trackCode", { length: 16 }).notNull(),
  tone: mysqlEnum("tone", ["Human", "Confident", "Warm", "Direct"]).notNull().default("Human"),
  topChangesJson: text("topChangesJson"),   // JSON: [{requirement_text, status, fix}]
  bulletRewritesJson: text("bulletRewritesJson"), // JSON: [{requirement_text, status, fix, rewrite_a, rewrite_b, needs_confirmation}]
  coverLetterText: text("coverLetterText"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ApplicationKit = typeof applicationKits.$inferSelect;
export type InsertApplicationKit = typeof applicationKits.$inferInsert;
// ─── Job Card Personalization Sources ───────────────────────────────
export const jobCardPersonalizationSources = mysqlTable("job_card_personalization_sources", {
  id: int("id").autoincrement().primaryKey(),
  jobCardId: int("jobCardId").notNull(),
  userId: int("userId").notNull(),
  sourceType: mysqlEnum("sourceType", ["linkedin_post", "linkedin_about", "company_news", "other"]).notNull().default("other"),
  url: varchar("url", { length: 2048 }),
  pastedText: text("pastedText"),
  capturedAt: timestamp("capturedAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull().onUpdateNow(),
});
export type JobCardPersonalizationSource = typeof jobCardPersonalizationSources.$inferSelect;
export type InsertJobCardPersonalizationSource = typeof jobCardPersonalizationSources.$inferInsert;

// ─── Operational Events (admin-only, no PII, no payloads) ────────────────────
// Stores only non-PII operational signals: rate limits, provider errors,
// validation errors. No free-text, no names, no emails, no resume/JD/outreach
// content. user_id_hash and ip_hash are one-way SHA-256 truncated hashes.
export const operationalEvents = mysqlTable("operational_events", {
  id: int("id").autoincrement().primaryKey(),
  requestId: varchar("requestId", { length: 36 }).notNull(),
  endpointGroup: mysqlEnum("endpointGroup", ["evidence", "outreach", "kit", "url_fetch", "auth"]).notNull(),
  eventType: mysqlEnum("eventType", ["rate_limited", "provider_error", "validation_error", "unknown"]).notNull(),
  statusCode: int("statusCode").notNull(),
  retryAfterSeconds: int("retryAfterSeconds"),
  userIdHash: varchar("userIdHash", { length: 16 }),
  ipHash: varchar("ipHash", { length: 16 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type OperationalEvent = typeof operationalEvents.$inferSelect;
export type InsertOperationalEvent = typeof operationalEvents.$inferInsert;

// ─── Stripe Events (idempotency log) ────────────────────────────────────────
// Stores only the Stripe event ID, type, and fulfillment metadata.
// No payment amounts, card details, or PII beyond the internal userId.
// The unique constraint on stripeEventId prevents double-crediting on retries.
export const stripeEvents = mysqlTable("stripe_events", {
  id: int("id").autoincrement().primaryKey(),
  stripeEventId: varchar("stripeEventId", { length: 128 }).notNull().unique(),
  eventType: varchar("eventType", { length: 128 }).notNull(),
  userId: int("userId"),                          // null for events we can't map
  creditsPurchased: int("creditsPurchased"),       // credits granted (positive)
  status: mysqlEnum("status", ["processed", "manual_review", "skipped"]).notNull().default("processed"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type StripeEvent = typeof stripeEvents.$inferSelect;
export type InsertStripeEvent = typeof stripeEvents.$inferInsert;
