/**
 * Operational Events Enums (Shared)
 * Used by both server (Zod schemas) and client (type definitions).
 */
import { z } from "zod";

export const endpointGroupSchema = z.enum([
  "evidence",
  "outreach",
  "kit",
  "url_fetch",
  "auth",
  "waitlist",
  "jd_extract",
]);

export type EndpointGroup = z.infer<typeof endpointGroupSchema>;

export const eventTypeSchema = z.enum([
  "rate_limited",
  "provider_error",
  "validation_error",
  "unknown",
  "waitlist_joined",
]);

export type EventType = z.infer<typeof eventTypeSchema>;

// For backward compatibility with existing code
export const ENDPOINT_GROUPS = [
  "evidence",
  "outreach",
  "kit",
  "url_fetch",
  "auth",
  "waitlist",
  "jd_extract",
] as const;

export const EVENT_TYPES = [
  "rate_limited",
  "provider_error",
  "validation_error",
  "unknown",
  "waitlist_joined",
] as const;
