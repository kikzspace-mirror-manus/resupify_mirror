import { trpc } from "@/lib/trpc";
import { ACCOUNT_DISABLED_CODE, ACCOUNT_DISABLED_ERR_MSG, UNAUTHED_ERR_MSG } from '@shared/const';
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { httpBatchLink, TRPCClientError } from "@trpc/client";
import { createRoot } from "react-dom/client";
import superjson from "superjson";
import App from "./App";
import AccountDisabled from "./components/AccountDisabled";
import { getLoginUrl } from "./const";
import "./index.css";

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
    console.error("[API Mutation Error]", error);
  }
});

const trpcClient = trpc.createClient({
  links: [
    httpBatchLink({
      url: "/api/trpc",
      transformer: superjson,
      fetch(input, init) {
        return globalThis.fetch(input, {
          ...(init ?? {}),
          credentials: "include",
        });
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
