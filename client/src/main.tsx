import { trpc } from "@/lib/trpc";
import { ACCOUNT_DISABLED_CODE, ACCOUNT_DISABLED_ERR_MSG, UNAUTHED_ERR_MSG } from '@shared/const';
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { httpBatchLink, TRPCClientError } from "@trpc/client";
import { createRoot } from "react-dom/client";
import superjson from "superjson";
import { toast } from "sonner";
import App from "./App";
import AccountDisabled from "./components/AccountDisabled";
import { getLoginUrl } from "./const";
import "./index.css";

/** Message shown when the server rejects a request for being too large (HTTP 413). */
export const PAYLOAD_TOO_LARGE_MSG = "Your request was too large. Please shorten the text and try again.";

const queryClient = new QueryClient();

/**
 * Reactive flag: when the server returns ACCOUNT_DISABLED we swap the entire
 * React tree for the blocking screen. We use a module-level variable + a
 * forced re-render because this must work outside React component lifecycle.
 */
let _isAccountDisabled = false;
let _forceRerender: (() => void) | null = null;

function setAccountDisabled() {
  if (_isAccountDisabled) return; // already showing the screen
  _isAccountDisabled = true;
  _forceRerender?.();
}

/**
 * Expected JD fetch errors: user-actionable failures that should show inline
 * only — never trigger the global console.error overlay.
 */
const EXPECTED_FETCH_SUBSTRINGS = [
  "too short to be a job description",
  "blocks automated fetch",
  "gated or login-protected",
  "Couldn't extract text",
  "Couldn't fetch text",
  "Couldn't reach this URL",
  "Request timed out",
  "URL does not point to a web page",
  "Page is too large to fetch",
  "Invalid URL",
  "Please paste the JD",
  "Please paste the JD instead",
] as const;

function isExpectedFetchError(error: unknown): boolean {
  if (!(error instanceof TRPCClientError)) return false;
  const msg = error.message ?? "";
  return EXPECTED_FETCH_SUBSTRINGS.some((s) => msg.includes(s));
}

const handleApiError = (error: unknown) => {
  if (!(error instanceof TRPCClientError)) return;
  if (typeof window === "undefined") return;

  // ACCOUNT_DISABLED: show blocking screen
  const isDisabled =
    error.message === ACCOUNT_DISABLED_ERR_MSG ||
    (error.data as any)?.cause?.code === ACCOUNT_DISABLED_CODE ||
    (error.cause as any)?.code === ACCOUNT_DISABLED_CODE;

  if (isDisabled) {
    setAccountDisabled();
    return;
  }

  // UNAUTHORIZED: redirect to login
  if (error.message === UNAUTHED_ERR_MSG) {
    window.location.href = getLoginUrl();
  }
};

queryClient.getQueryCache().subscribe(event => {
  if (event.type === "updated" && event.action.type === "error") {
    const error = event.query.state.error;
    handleApiError(error);
    console.error("[API Query Error]", error);
  }
});

queryClient.getMutationCache().subscribe(event => {
  if (event.type === "updated" && event.action.type === "error") {
    const error = event.mutation.state.error;
    handleApiError(error);
    // Suppress console.error for expected JD fetch errors — they show inline
    // and must not trigger the Manus debug overlay.
    if (!isExpectedFetchError(error)) {
      console.error("[API Mutation Error]", error);
    }
  }
});

const trpcClient = trpc.createClient({
  links: [
    httpBatchLink({
      url: "/api/trpc",
      transformer: superjson,
      async fetch(input, init) {
        const response = await globalThis.fetch(input, {
          ...(init ?? {}),
          credentials: "include",
        });
        // HTTP 413 Payload Too Large: show a friendly toast before tRPC parses
        // the response. The server already rejected the body, so no credits are
        // spent and no tRPC error object is available — we must intercept here.
        if (response.status === 413) {
          toast.error(PAYLOAD_TOO_LARGE_MSG);
        }
        return response;
      },
    }),
  ],
});

function Root() {
  const [, forceUpdate] = (window as any).__accountDisabledState ?? [false, () => {}];
  // Register the force-rerender callback so the module-level handler can trigger it
  const [tick, setTick] = (window as any).__accountDisabledTick ?? [0, () => {}];
  void tick; // suppress unused warning

  return _isAccountDisabled ? (
    <AccountDisabled />
  ) : (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>
        <App />
      </QueryClientProvider>
    </trpc.Provider>
  );
}

const rootEl = document.getElementById("root")!;
const root = createRoot(rootEl);

// Wire the force-rerender callback after root is created
_forceRerender = () => root.render(
  _isAccountDisabled ? (
    <AccountDisabled />
  ) : (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>
        <App />
      </QueryClientProvider>
    </trpc.Provider>
  )
);

root.render(
  <trpc.Provider client={trpcClient} queryClient={queryClient}>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </trpc.Provider>
);
