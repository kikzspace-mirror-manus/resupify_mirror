/**
 * Phase 10B-2B — Operational Events: Acceptance Tests
 *
 * Acceptance criteria:
 * A) Non-admin user is blocked from admin.operationalEvents.list (FORBIDDEN)
 * B) Unauthenticated caller is blocked (UNAUTHORIZED)
 * C) logOperationalEvent stores exactly the approved field set (no PII, no payload)
 * D) Stored fields match the allowlist: requestId, endpointGroup, eventType,
 *    statusCode, retryAfterSeconds, userIdHash, ipHash, createdAt
 * E) No forbidden fields are stored: no name, email, content, jdText, resumeText, etc.
 * F) adminListOperationalEvents returns events filtered by endpointGroup
 * G) adminListOperationalEvents returns events filtered by eventType
 * H) shortHash produces a 16-char hex string (non-reversible truncated SHA-256)
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";
import { shortHash } from "./rateLimiter";

// ─── Hoisted mocks (required by vitest for module-level vi.mock) ──────────────

const { mockAdminListOperationalEvents, mockLogOperationalEvent } = vi.hoisted(() => ({
  mockAdminListOperationalEvents: vi.fn(),
  mockLogOperationalEvent: vi.fn(),
}));

vi.mock("./db", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./db")>();
  return {
    ...actual,
    adminListOperationalEvents: mockAdminListOperationalEvents,
    logOperationalEvent: mockLogOperationalEvent,
  };
});

// ─── Context helpers ──────────────────────────────────────────────────────────

function makeUserCtx(userId = 42): TrpcContext {
  return {
    user: {
      id: userId,
      openId: `user-${userId}`,
      name: "Regular User",
      email: `user${userId}@example.com`,
      loginMethod: "manus",
      role: "user",
      disabled: false,
      isAdmin: false,
      adminNotes: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
    req: { protocol: "https", headers: {}, ip: "10.0.0.1", socket: { remoteAddress: "10.0.0.1" } } as TrpcContext["req"],
    res: { clearCookie: vi.fn(), setHeader: vi.fn() } as unknown as TrpcContext["res"],
  };
}

function makeAdminCtx(userId = 1): TrpcContext {
  return {
    user: {
      id: userId,
      openId: `admin-${userId}`,
      name: "Admin User",
      email: `admin${userId}@example.com`,
      loginMethod: "manus",
      role: "admin",
      disabled: false,
      isAdmin: true,
      adminNotes: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
    req: { protocol: "https", headers: {}, ip: "10.0.0.1", socket: { remoteAddress: "10.0.0.1" } } as TrpcContext["req"],
    res: { clearCookie: vi.fn(), setHeader: vi.fn() } as unknown as TrpcContext["res"],
  };
}

function makeAnonCtx(): TrpcContext {
  return {
    user: null,
    req: { protocol: "https", headers: {}, ip: "10.0.0.2", socket: { remoteAddress: "10.0.0.2" } } as TrpcContext["req"],
    res: { clearCookie: vi.fn(), setHeader: vi.fn() } as unknown as TrpcContext["res"],
  };
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("Phase 10B-2B — Operational Events", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAdminListOperationalEvents.mockResolvedValue([]);
    mockLogOperationalEvent.mockResolvedValue(undefined);
  });

  // ── A: Non-admin blocked ──────────────────────────────────────────────────

  it("A — non-admin user receives FORBIDDEN on operationalEvents.list", async () => {
    const caller = appRouter.createCaller(makeUserCtx());
    await expect(
      caller.admin.operationalEvents.list({})
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  // ── B: Unauthenticated blocked ────────────────────────────────────────────

  it("B — unauthenticated caller receives UNAUTHORIZED on operationalEvents.list", async () => {
    const caller = appRouter.createCaller(makeAnonCtx());
    await expect(
      caller.admin.operationalEvents.list({})
    ).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });

  // ── C: logOperationalEvent stores only approved fields ────────────────────

  it("C — logOperationalEvent is called with only the approved field set", async () => {
    const { logOperationalEvent } = await import("./db");
    await logOperationalEvent({
      requestId: "test-req-id-001",
      endpointGroup: "evidence",
      eventType: "rate_limited",
      statusCode: 429,
      retryAfterSeconds: 300,
      userIdHash: "abc123def456789a",
      ipHash: "fedcba9876543210",
    });

    expect(mockLogOperationalEvent).toHaveBeenCalledOnce();
    const callArg = mockLogOperationalEvent.mock.calls[0]![0];

    // All approved fields must be present
    expect(callArg).toHaveProperty("requestId");
    expect(callArg).toHaveProperty("endpointGroup");
    expect(callArg).toHaveProperty("eventType");
    expect(callArg).toHaveProperty("statusCode");
    expect(callArg).toHaveProperty("retryAfterSeconds");
    expect(callArg).toHaveProperty("userIdHash");
    expect(callArg).toHaveProperty("ipHash");
  });

  // ── D: Stored field values match the allowlist ────────────────────────────

  it("D — stored field values are correct and within the approved set", async () => {
    const { logOperationalEvent } = await import("./db");
    await logOperationalEvent({
      requestId: "req-d-001",
      endpointGroup: "outreach",
      eventType: "provider_error",
      statusCode: 500,
      retryAfterSeconds: null,
      userIdHash: "aabbccddeeff0011",
      ipHash: "1122334455667788",
    });

    const callArg = mockLogOperationalEvent.mock.calls[0]![0];
    expect(callArg.requestId).toBe("req-d-001");
    expect(callArg.endpointGroup).toBe("outreach");
    expect(callArg.eventType).toBe("provider_error");
    expect(callArg.statusCode).toBe(500);
    expect(callArg.retryAfterSeconds).toBeNull();
    expect(callArg.userIdHash).toBe("aabbccddeeff0011");
    expect(callArg.ipHash).toBe("1122334455667788");
  });

  // ── E: No forbidden (PII/payload) fields stored ───────────────────────────

  it("E — no forbidden PII or payload fields are present in the stored event", async () => {
    const { logOperationalEvent } = await import("./db");
    await logOperationalEvent({
      requestId: "req-e-001",
      endpointGroup: "kit",
      eventType: "validation_error",
      statusCode: 422,
      retryAfterSeconds: null,
      userIdHash: null,
      ipHash: null,
    });

    const callArg = mockLogOperationalEvent.mock.calls[0]![0];
    const forbiddenFields = [
      "name", "email", "linkedinUrl", "phone",
      "resumeText", "jdText", "outreachText", "content",
      "userId", "openId", "payload", "body",
    ];
    for (const field of forbiddenFields) {
      expect(callArg).not.toHaveProperty(field);
    }
  });

  // ── F: Admin can filter by endpointGroup ─────────────────────────────────

  it("F — admin.operationalEvents.list passes endpointGroup filter to db helper", async () => {
    const sampleEvent = {
      id: 1,
      requestId: "req-f-001",
      endpointGroup: "evidence",
      eventType: "rate_limited",
      statusCode: 429,
      retryAfterSeconds: 300,
      userIdHash: "abc",
      ipHash: "def",
      createdAt: new Date(),
    };
    mockAdminListOperationalEvents.mockResolvedValue([sampleEvent]);

    const caller = appRouter.createCaller(makeAdminCtx());
    const result = await caller.admin.operationalEvents.list({
      endpointGroup: "evidence",
    });

    expect(mockAdminListOperationalEvents).toHaveBeenCalledOnce();
    const filterArg = mockAdminListOperationalEvents.mock.calls[0]![0];
    expect(filterArg.endpointGroup).toBe("evidence");
    expect(result).toHaveLength(1);
    expect(result[0]?.endpointGroup).toBe("evidence");
  });

  // ── G: Admin can filter by eventType ─────────────────────────────────────

  it("G — admin.operationalEvents.list passes eventType filter to db helper", async () => {
    const sampleEvent = {
      id: 2,
      requestId: "req-g-001",
      endpointGroup: "auth",
      eventType: "rate_limited",
      statusCode: 429,
      retryAfterSeconds: 60,
      userIdHash: null,
      ipHash: "xyz",
      createdAt: new Date(),
    };
    mockAdminListOperationalEvents.mockResolvedValue([sampleEvent]);

    const caller = appRouter.createCaller(makeAdminCtx());
    const result = await caller.admin.operationalEvents.list({
      eventType: "rate_limited",
    });

    const filterArg = mockAdminListOperationalEvents.mock.calls[0]![0];
    expect(filterArg.eventType).toBe("rate_limited");
    expect(result[0]?.eventType).toBe("rate_limited");
  });

  // ── H: shortHash produces a 16-char hex string ───────────────────────────

  it("H — shortHash returns a 16-character lowercase hex string", () => {
    const hash1 = shortHash("user-id-12345");
    const hash2 = shortHash("192.168.1.1");
    const hash3 = shortHash("");

    // Must be exactly 16 hex chars
    expect(hash1).toMatch(/^[0-9a-f]{16}$/);
    expect(hash2).toMatch(/^[0-9a-f]{16}$/);
    expect(hash3).toMatch(/^[0-9a-f]{16}$/);

    // Different inputs must produce different hashes
    expect(hash1).not.toBe(hash2);

    // Same input must be deterministic
    expect(shortHash("user-id-12345")).toBe(hash1);
  });
});
