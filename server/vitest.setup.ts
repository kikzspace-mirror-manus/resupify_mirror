/**
 * Vitest global setup — runs before every test file.
 *
 * Forces LLM_PROVIDER=manus and clears OPENAI_API_KEY so the test
 * suite never calls the real OpenAI API, regardless of what is set
 * in the host environment or Manus Secrets.
 *
 * Production code paths are unchanged — this only affects the test
 * process environment.
 */

// Override before any test module is imported
process.env.LLM_PROVIDER = "manus";
delete process.env.OPENAI_API_KEY;
