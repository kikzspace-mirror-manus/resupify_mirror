import { z } from "zod";
import { notifyOwner } from "./notification";
import { adminProcedure, publicProcedure, router } from "./trpc";
import { featureFlags } from "../../shared/featureFlags";

export const systemRouter = router({
  health: publicProcedure
    .input(
      z.object({
        timestamp: z.number().min(0, "timestamp cannot be negative"),
      })
    )
    .query(() => ({
      ok: true,
    })),

  featureFlags: publicProcedure.query(() => ({
    v2CountryPacksEnabled: featureFlags.v2CountryPacksEnabled,
    v2VnTranslationEnabled: featureFlags.v2VnTranslationEnabled,
    v2BilingualViewEnabled: featureFlags.v2BilingualViewEnabled,
  })),

  notifyOwner: adminProcedure
    .input(
      z.object({
        title: z.string().min(1, "title is required"),
        content: z.string().min(1, "content is required"),
      })
    )
    .mutation(async ({ input }) => {
      const delivered = await notifyOwner(input);
      return {
        success: delivered,
      } as const;
    }),
});
