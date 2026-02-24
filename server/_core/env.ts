export const ENV = {
  appId: process.env.VITE_APP_ID ?? "",
  cookieSecret: process.env.JWT_SECRET ?? "",
  databaseUrl: process.env.DATABASE_URL ?? "",
  oAuthServerUrl: process.env.OAUTH_SERVER_URL ?? "",
  ownerOpenId: process.env.OWNER_OPEN_ID ?? "",
  isProduction: process.env.NODE_ENV === "production",
  forgeApiUrl: process.env.BUILT_IN_FORGE_API_URL ?? "",
  forgeApiKey: process.env.BUILT_IN_FORGE_API_KEY ?? "",
  STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY ?? "",
  STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET ?? "",
  // LLM provider routing (Phase 10E-1)
  LLM_PROVIDER: (process.env.LLM_PROVIDER ?? "manus") as "manus" | "openai",
  OPENAI_API_KEY: process.env.OPENAI_API_KEY ?? "",
  LLM_MODEL_OPENAI: process.env.LLM_MODEL_OPENAI ?? "gpt-4.1",
  RESEND_API_KEY: process.env.RESEND_API_KEY ?? "",
  FROM_EMAIL: process.env.FROM_EMAIL ?? "noreply@resupify.com",
};
