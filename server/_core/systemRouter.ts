import { z } from "zod";
import { notifyOwner } from "./notification";
import { adminProcedure, publicProcedure, router } from "./trpc";
import { featureFlags } from "../../shared/featureFlags";
import * as db from "../db";

const ALL_PACK_IDS = ["GLOBAL", "CA", "VN", "PH", "US"] as const;

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

  featureFlags: publicProcedure.query(async () => {
    const enabledCountryPacks = featureFlags.v2CountryPacksEnabled
      ? await db.getEnabledCountryPacks()
      : ["CA"]; // V1 fallback — irrelevant when flag is OFF, but safe default
    return {
      v2CountryPacksEnabled: featureFlags.v2CountryPacksEnabled,
      v2VnTranslationEnabled: featureFlags.v2VnTranslationEnabled,
      v2BilingualViewEnabled: featureFlags.v2BilingualViewEnabled,
      enabledCountryPacks,
    };
  }),

  setEnabledCountryPacks: adminProcedure
    .input(
      z.object({
        enabled: z
          .array(z.enum(ALL_PACK_IDS))
          .min(1, "At least one country pack must be enabled"),
      })
    )
    .mutation(async ({ input }) => {
      await db.setAdminSetting(
        "enabled_country_packs",
        JSON.stringify(input.enabled)
      );
      return { success: true, enabled: input.enabled };
    }),

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
