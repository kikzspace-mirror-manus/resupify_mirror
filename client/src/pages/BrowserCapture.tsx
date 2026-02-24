/**
 * /capture — Browser Capture helper page
 *
 * Opened in a new tab by the "Try Browser Capture" fallback button.
 * Loads the target URL in an iframe (when allowed) and extracts visible text,
 * then sends it back to the opener via postMessage.
 *
 * If the iframe is blocked (X-Frame-Options / CSP), falls back to a manual
 * "Select all + copy" paste box that also sends text back via postMessage.
 */
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, AlertTriangle, CheckCircle2, Copy, ExternalLink } from "lucide-react";

const MIN_TEXT_LENGTH = 200;

type Phase =
  | "loading"     // iframe loading
  | "extracting"  // running extraction script
  | "success"     // text extracted and sent
  | "blocked"     // iframe blocked, showing paste fallback
  | "error";      // unexpected error

function extractTextFromIframe(iframe: HTMLIFrameElement): string | null {
  try {
    const doc = iframe.contentDocument || iframe.contentWindow?.document;
    if (!doc) return null;
    // Remove noise
    for (const tag of ["script", "style", "noscript", "svg", "iframe", "nav", "footer", "header"]) {
      doc.querySelectorAll(tag).forEach((el) => el.remove());
    }
    doc.querySelectorAll('[class*="ad-"], [class*="ads-"], [id*="ad-"], [class*="cookie"], [class*="banner"]').forEach((el) => el.remove());
    // Prefer content containers
    const CONTENT_SELECTORS = ["main", "article", '[role="main"]', ".job-description", "#job-description", ".description", "#description", ".content", "#content"];
    for (const sel of CONTENT_SELECTORS) {
      const el = doc.querySelector(sel);
      if (el) {
        const text = (el as HTMLElement).innerText || el.textContent || "";
        if (text.trim().length >= MIN_TEXT_LENGTH) return normalizeText(text);
      }
    }
    // Full body fallback
    const text = (doc.body as HTMLElement).innerText || doc.body.textContent || "";
    return text.trim().length >= MIN_TEXT_LENGTH ? normalizeText(text) : null;
  } catch {
    return null;
  }
}

function normalizeText(raw: string): string {
  return raw
    .replace(/\r\n/g, "\n")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export default function BrowserCapture() {
  const params = new URLSearchParams(window.location.search);
  const targetUrl = params.get("url") ?? "";
  const openerOrigin = params.get("origin") ?? "";

  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [phase, setPhase] = useState<Phase>(targetUrl ? "loading" : "error");
  const [pasteText, setPasteText] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  // Send extracted text back to opener
  function sendToOpener(text: string) {
    if (window.opener) {
      window.opener.postMessage({ type: "BROWSER_CAPTURE_RESULT", text }, openerOrigin || "*");
    }
    setPhase("success");
  }

  // Handle iframe load
  function handleIframeLoad() {
    setPhase("extracting");
    setTimeout(() => {
      const text = extractTextFromIframe(iframeRef.current!);
      if (text && text.length >= MIN_TEXT_LENGTH) {
        sendToOpener(text);
      } else {
        // Extraction yielded too little — show paste fallback
        setPhase("blocked");
      }
    }, 500);
  }

  // Handle iframe error (X-Frame-Options / CSP blocks)
  function handleIframeError() {
    setPhase("blocked");
  }

  // Detect if iframe was blocked by checking for empty content after a timeout
  useEffect(() => {
    if (phase !== "loading") return;
    const timer = setTimeout(() => {
      // If still "loading" after 8s, assume blocked
      if (phase === "loading") setPhase("blocked");
    }, 8000);
    return () => clearTimeout(timer);
  }, [phase]);

  // Handle paste submission
  function handlePasteSubmit() {
    const text = normalizeText(pasteText);
    if (text.length < MIN_TEXT_LENGTH) {
      setErrorMsg(`Text too short (${text.length} chars). Please paste the full job description.`);
      return;
    }
    sendToOpener(text);
  }

  if (!targetUrl) {
    return (
      <div className="min-h-screen flex items-center justify-center p-8 bg-background text-foreground">
        <div className="max-w-md text-center space-y-3">
          <AlertTriangle className="h-8 w-8 text-destructive mx-auto" />
          <p className="font-semibold">No URL provided.</p>
          <p className="text-sm text-muted-foreground">This page is opened automatically by Resupify when a server fetch fails. Please close this tab and try again.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      {/* Header */}
      <div className="border-b px-4 py-3 flex items-center justify-between">
        <div>
          <p className="font-semibold text-sm">Resupify — Browser Capture</p>
          <p className="text-xs text-muted-foreground truncate max-w-[60vw]">{targetUrl}</p>
        </div>
        <a href={targetUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1">
          Open in new tab <ExternalLink className="h-3 w-3" />
        </a>
      </div>

      {/* Status banner */}
      <div className="px-4 py-2 border-b bg-muted/30">
        {phase === "loading" && (
          <p className="text-xs text-muted-foreground flex items-center gap-1.5">
            <Loader2 className="h-3 w-3 animate-spin" />
            Loading page in browser… this may take a few seconds.
          </p>
        )}
        {phase === "extracting" && (
          <p className="text-xs text-muted-foreground flex items-center gap-1.5">
            <Loader2 className="h-3 w-3 animate-spin" />
            Extracting job description text…
          </p>
        )}
        {phase === "success" && (
          <p className="text-xs text-emerald-600 flex items-center gap-1.5">
            <CheckCircle2 className="h-3 w-3" />
            Text captured and sent back to Resupify. You can close this tab.
          </p>
        )}
        {phase === "blocked" && (
          <p className="text-xs text-amber-600 flex items-center gap-1.5">
            <AlertTriangle className="h-3 w-3" />
            This site blocks iframe embedding. Use the paste fallback below.
          </p>
        )}
        {phase === "error" && (
          <p className="text-xs text-destructive flex items-center gap-1.5">
            <AlertTriangle className="h-3 w-3" />
            {errorMsg || "An unexpected error occurred."}
          </p>
        )}
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col">
        {/* Iframe (loading / extracting / success phases) */}
        {(phase === "loading" || phase === "extracting" || phase === "success") && (
          <iframe
            ref={iframeRef}
            src={targetUrl}
            className="flex-1 w-full border-0"
            onLoad={handleIframeLoad}
            onError={handleIframeError}
            sandbox="allow-scripts allow-same-origin"
            title="Job Posting"
          />
        )}

        {/* Paste fallback (blocked phase) */}
        {phase === "blocked" && (
          <div className="flex-1 flex flex-col items-center justify-center p-6 gap-4 max-w-xl mx-auto w-full">
            <div className="space-y-1 text-center">
              <p className="font-semibold text-sm">Paste the job description manually</p>
              <p className="text-xs text-muted-foreground">
                Some sites block automated capture.{" "}
                <a href={targetUrl} target="_blank" rel="noopener noreferrer" className="underline">
                  Open the job posting
                </a>
                , select all text (Ctrl+A / Cmd+A), copy it, then paste it below.
              </p>
            </div>
            <Textarea
              className="min-h-[200px] text-sm font-mono w-full"
              placeholder="Paste the full job description here…"
              value={pasteText}
              onChange={(e) => { setPasteText(e.target.value); setErrorMsg(""); }}
            />
            {errorMsg && (
              <p className="text-xs text-destructive flex items-center gap-1">
                <AlertTriangle className="h-3 w-3" />{errorMsg}
              </p>
            )}
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={handlePasteSubmit}
                disabled={pasteText.trim().length < MIN_TEXT_LENGTH}
              >
                <Copy className="h-3.5 w-3.5 mr-1.5" />
                Send to Resupify
              </Button>
              <Button size="sm" variant="outline" asChild>
                <a href={targetUrl} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
                  Open job posting
                </a>
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
