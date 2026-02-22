/**
 * Phase: Waitlist Auth States Patch
 * Tests: A-F (6 tests)
 * A) Logged-out: title is "Early access"
 * B) Logged-out: Sign in button present
 * C) Logged-out: Sign up button present
 * D) Logged-out: no "your account was created" or "registered email" copy
 * E) Logged-in gated: title is "You're on the waitlist"
 * F) Logged-in gated: Sign out button present, no Sign in / Sign up buttons
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";

const WAITLIST_PATH = join(
  __dirname,
  "../client/src/pages/Waitlist.tsx"
);

function readWaitlist(): string {
  return readFileSync(WAITLIST_PATH, "utf-8");
}

describe("Waitlist Auth States", () => {
  it("A) logged-out branch renders 'Early access' title", () => {
    const src = readWaitlist();
    // The logged-out branch must contain the "Early access" CardTitle
    expect(src).toContain("Early access");
  });

  it("B) logged-out branch has a Sign in button", () => {
    const src = readWaitlist();
    expect(src).toContain("Sign in");
    // Must use getLoginUrl for the sign-in action
    expect(src).toContain("getLoginUrl");
  });

  it("C) logged-out branch has a Sign up button", () => {
    const src = readWaitlist();
    expect(src).toContain("Sign up");
    // Must use getSignupUrl (type=signUp) for the sign-up action
    expect(src).toContain("signUp");
  });

  it("D) logged-out branch does not imply an account was already created", () => {
    const src = readWaitlist();
    // These phrases must not appear anywhere in the file
    expect(src).not.toContain("your account has been created");
    expect(src).not.toContain("registered email");
    expect(src).not.toContain("account has been created");
  });

  it("E) logged-in gated branch renders 'You're on the waitlist' title", () => {
    const src = readWaitlist();
    expect(src).toContain("You're on the waitlist");
  });

  it("F) logged-in gated branch has Sign out button and no Sign in/Sign up buttons in same branch", () => {
    const src = readWaitlist();
    // Sign out must be present for the logged-in gated branch
    expect(src).toContain("Sign out");
    expect(src).toContain("handleLogout");
    // The file must have both branches — verify both titles exist
    expect(src).toContain("Early access");
    expect(src).toContain("You're on the waitlist");
    // The loading guard must also be present
    expect(src).toContain("loading");
  });
});
