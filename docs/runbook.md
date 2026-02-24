# Resupify Day-1 Runbook

This is the practical operating guide for launch week and day-to-day admin tasks.

## Quick links
- Admin Dashboard: `/admin`
- Ops Events: `/admin/operational-events`
- Stripe Events: `/admin/stripe-events`
- Early Access: `/admin/early-access`
- Billing: `/billing`
- Waitlist page: `/waitlist`

---

## Day-1 launch checklist

### A) Confirm environment is correct
1) **LLM provider**
- Go to `/admin`
- Check the LLM badge in the header (example: `openai / gpt-4.1`)

2) **Stripe mode**
- Go to `/billing`
- Confirm **test-card helper text is hidden** in live mode
  - If you see "Use card 4242…", you are still in test mode (`sk_test_...`)

3) **Early access gate**
- Open an incognito window
- Create a new account
- Confirm you land on `/waitlist` (default access is gated)

### B) Run one end-to-end smoke test
1) As an allowlisted user:
- Create a Job Card
- Fetch JD from URL
- Run Evidence/ATS scan
- Generate Outreach
- Generate Application Kit

2) If payments are live:
- Buy the smallest credit pack
- Confirm credits increase and ledger updates

---

## Grant early access to a user
1) Go to `/admin/early-access`
2) Search by email
3) Click **Grant access**
4) Ask user to refresh or re-login (guard is route-based)

Notes:
- Admin users bypass the gate automatically.
- Default for new users is `earlyAccessEnabled=false`.

---

## Revoke early access
1) Go to `/admin/early-access`
2) Search by email
3) Click **Revoke access**
4) User will be redirected to `/waitlist` on next navigation/login

---

## Monitor production health

### Ops Events (errors, abuse, rate limits)
Go to `/admin/operational-events`

What to look for:
- Spikes in `provider_error` (LLM failures)
- Large volume of `rate_limited` (abuse or UX friction)
- `validation_error` spikes (users hitting caps or crafted payloads)

Suggested response:
- If provider errors spike: temporarily switch LLM provider back to Manus or investigate OpenAI status.
- If rate limits spike: confirm it's not a UX issue (users repeatedly clicking) before adjusting limits.

### Stripe Events (purchases, refunds)
Go to `/admin/stripe-events`

What to look for:
- `processed` events increasing normally
- Any `manual_review` from refunds (expected behavior)
- Too many `skipped` or unknown event types (misconfigured webhook events)

---

## Switch LLM provider (OpenAI ↔ Manus)

### What controls it
Manus **Settings → Secrets**:
- `LLM_PROVIDER = manus | openai`
- `OPENAI_API_KEY` required only for `openai`
- `LLM_MODEL_OPENAI` defaults to `gpt-4.1`

### Safe switch procedure
1) Change `LLM_PROVIDER` in Secrets
2) Refresh `/admin` and confirm the badge updates
3) Run one Evidence scan + one Outreach generation
4) Watch `/admin/operational-events` for provider errors for 10 minutes

Rollback:
- Set `LLM_PROVIDER=manus` (or unset it) and re-test one scan

Important:
- Tests/CI force `LLM_PROVIDER=manus` automatically. This does not affect production.

---

## Stripe live mode checklist

### Required server secrets
- `STRIPE_SECRET_KEY = sk_live_...`
- `STRIPE_WEBHOOK_SECRET = whsec_...` (LIVE signing secret)

### Webhook endpoint (Stripe Dashboard, LIVE mode)
- Endpoint URL: `https://resupify.com/api/stripe/webhook`
- Events:
  - `checkout.session.completed`
  - `charge.refunded`

### Verification
1) Make a real purchase (smallest pack)
2) Confirm:
- Credits increase
- Billing Transaction History shows the purchase
- `/admin/stripe-events` shows `processed`

Refund behavior:
- Refunds are recorded as `manual_review` (credits are not automatically deducted)

---

## Confirm cleanup job is healthy (10D)
Cleanup runs:
- 10 seconds after server start
- Then every 24 hours

Where to verify:
- Server log line after startup: shows purged counts for `operational_events` and `stripe_events`

What it does:
- Purges `operational_events` older than 30 days
- Purges `stripe_events` older than 90 days

---

## Common issues and fast fixes

### Users can sign up but are "blocked"
Expected. They are gated.
Fix:
- Grant early access in `/admin/early-access`

### Stripe purchase completed but credits did not appear
Check in order:
1) Stripe Dashboard → Events: did `checkout.session.completed` fire?
2) Webhook endpoint status: delivered successfully?
3) `/admin/stripe-events`: is there a row for the session/event?
4) Verify `STRIPE_WEBHOOK_SECRET` is correct for the current mode (test vs live)

### Lots of 429 errors
- This usually means heavy clicking or abuse.
- Confirm UX messaging is clear (toast).
- Check `/admin/operational-events` volume and endpoint group.

### 413 "request too large"
- User pasted too much text.
- App shows a friendly toast.
- Suggest they shorten JD/resume text.

---

## Suggested weekly maintenance
- Review `/admin/operational-events` for trends (rate_limited, provider_error)
- Review `/admin/stripe-events` for manual_review refunds
- Confirm early access list is kept reasonable until you're ready to remove gating
