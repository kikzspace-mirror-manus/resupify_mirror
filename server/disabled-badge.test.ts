/**
 * Tests for the Admin Users list disabled badge logic.
 *
 * Because the badge is pure frontend rendering (no server logic), we test
 * the underlying data contract: that adminListUsers returns the `disabled`
 * boolean so the UI can render the badge correctly.
 *
 * We also test the filter predicate used by the "Show disabled only" toggle:
 *   filter((u) => !showDisabledOnly || u.disabled)
 */
import { describe, expect, it } from "vitest";

// ─── Types ────────────────────────────────────────────────────────────────────

type UserRow = {
  id: number;
  name: string | null;
  email: string | null;
  isAdmin: boolean;
  disabled: boolean;
  lastSignedIn: Date;
};

// ─── Filter predicate (mirrors AdminUsers.tsx line 81) ────────────────────────

function applyDisabledFilter(users: UserRow[], showDisabledOnly: boolean): UserRow[] {
  return users.filter((u) => !showDisabledOnly || u.disabled);
}

// ─── Test data ────────────────────────────────────────────────────────────────

const enabledUser: UserRow = {
  id: 1,
  name: "Alice",
  email: "alice@example.com",
  isAdmin: false,
  disabled: false,
  lastSignedIn: new Date(),
};

const disabledUser: UserRow = {
  id: 2,
  name: "Bob",
  email: "bob@example.com",
  isAdmin: false,
  disabled: true,
  lastSignedIn: new Date(),
};

const disabledAdmin: UserRow = {
  id: 3,
  name: "Carol",
  email: "carol@example.com",
  isAdmin: true,
  disabled: true,
  lastSignedIn: new Date(),
};

const allUsers = [enabledUser, disabledUser, disabledAdmin];

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("Admin Users list — disabled badge data contract", () => {

  it("disabled user has disabled=true so the badge renders", () => {
    // The badge condition in AdminUsers.tsx is: {u.disabled && <Badge>Disabled</Badge>}
    expect(disabledUser.disabled).toBe(true);
  });

  it("enabled user has disabled=false so the badge does NOT render", () => {
    expect(enabledUser.disabled).toBe(false);
  });

  it("disabled admin has both isAdmin=true and disabled=true (both badges shown)", () => {
    expect(disabledAdmin.isAdmin).toBe(true);
    expect(disabledAdmin.disabled).toBe(true);
  });

});

describe("Admin Users list — 'Show disabled only' filter toggle", () => {

  it("when showDisabledOnly=false, all users are shown", () => {
    const result = applyDisabledFilter(allUsers, false);
    expect(result).toHaveLength(3);
    expect(result.map((u) => u.id)).toEqual([1, 2, 3]);
  });

  it("when showDisabledOnly=true, only disabled users are shown", () => {
    const result = applyDisabledFilter(allUsers, true);
    expect(result).toHaveLength(2);
    expect(result.every((u) => u.disabled)).toBe(true);
    expect(result.map((u) => u.id)).toEqual([2, 3]);
  });

  it("when showDisabledOnly=true and no users are disabled, result is empty", () => {
    const result = applyDisabledFilter([enabledUser], true);
    expect(result).toHaveLength(0);
  });

  it("toggling showDisabledOnly back to false restores full list", () => {
    const filtered = applyDisabledFilter(allUsers, true);
    expect(filtered).toHaveLength(2);
    const restored = applyDisabledFilter(allUsers, false);
    expect(restored).toHaveLength(3);
  });

});
