import { ACCOUNT_DISABLED_CODE, ACCOUNT_DISABLED_ERR_MSG, NOT_ADMIN_ERR_MSG, UNAUTHED_ERR_MSG } from '@shared/const';
import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import type { TrpcContext } from "./context";

const t = initTRPC.context<TrpcContext>().create({
  transformer: superjson,
});

export const router = t.router;
export const publicProcedure = t.procedure;

/**
 * OPTION A: disabled flag blocks ALL authenticated endpoints, including admin.
 * This is the simplest and safest approach — a disabled account has zero access.
 * To re-enable, an admin must set users.disabled = false via the Admin Users panel.
 */
const requireUser = t.middleware(async opts => {
  const { ctx, next } = opts;

  if (!ctx.user) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: UNAUTHED_ERR_MSG });
  }

  // ACCOUNT_DISABLED check: enforced universally for all authenticated procedures.
  // Uses FORBIDDEN (403) so the client can distinguish it from a plain 401.
  if (ctx.user.disabled) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: ACCOUNT_DISABLED_ERR_MSG,
      // Attach a machine-readable code so the frontend can detect and handle it
      // without string-matching the message.
      cause: { code: ACCOUNT_DISABLED_CODE },
    });
  }

  return next({
    ctx: {
      ...ctx,
      user: ctx.user,
    },
  });
});

export const protectedProcedure = t.procedure.use(requireUser);

// adminProcedure also runs requireUser first (via the shared middleware chain),
// so a disabled admin is blocked before the role check is even reached.
// ctx.user is guaranteed non-null here because requireUser throws UNAUTHORIZED
// before this middleware is reached.
export const adminProcedure = t.procedure.use(requireUser).use(
  t.middleware(async opts => {
    const { ctx, next } = opts;
    // requireUser already validated ctx.user is non-null and not disabled;
    // use non-null assertion to satisfy TypeScript's narrowing.
    const user = ctx.user!;

    if (user.role !== 'admin') {
      throw new TRPCError({ code: "FORBIDDEN", message: NOT_ADMIN_ERR_MSG });
    }

    return next({
      ctx: {
        ...ctx,
        user,
      },
    });
  }),
);
