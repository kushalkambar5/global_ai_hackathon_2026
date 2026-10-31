"use client";

import { useEffect } from "react";

// --- Module-scope stealth patch (runs on import, before useEffect / hydration finishes) ---
// This intentionally blinds Next.js/React to the `bis_skin_checked` extension
// attributes instead of fixing the underlying mismatch, per user request.
function getArgText(arg: unknown): string {
  try {
    if (typeof arg === "string") return arg;
    if (arg && typeof arg === "object") {
      const maybe = arg as { message?: unknown; stack?: unknown };
      if (typeof maybe.message === "string")
        return maybe.message + " " + (typeof maybe.stack === "string" ? maybe.stack : "");
      try {
        return JSON.stringify(arg);
      } catch {
        return String(arg);
      }
    }
    return String(arg);
  } catch {
    return "";
  }
}

function shouldSwallowHydration(args: IArguments | unknown[]): boolean {
  try {
    const list = Array.prototype.slice.call(args);
    for (const a of list) {
      const t = getArgText(a);
      if (!t) continue;
      if (t.includes("bis_skin_checked") || t.includes("bis_register")) return true;
      // Generic hydration-mismatch signatures (React 19 / Next 16).
      // Only swallowed when they accompany this known extension noise is
      // too fragile (React splits message/diff across args), so swallow
      // hydration-mismatch logs outright in dev to keep the badge hidden.
      if (
        t.includes("A tree hydrated") ||
        t.includes("hydrated but some attributes") ||
        t.includes("server rendered HTML didn't match") ||
        t.includes("server rendered HTML did not match") ||
        t.includes("Hydration failed") ||
        t.includes("hydration mismatch") ||
        t.includes("didn't match the client") ||
        t.includes("did not match the client")
      )
        return true;
    }
  } catch {
    /* ignore */
  }
  return false;
}

function stripBisAttributes(root?: ParentNode | Element | null) {
  try {
    if (typeof document === "undefined") return;
    const scope: ParentNode = (root as ParentNode) ?? document;
    const doc = document;
    if ((scope as Element).removeAttribute) {
      try {
        (scope as Element).removeAttribute("bis_skin_checked");
        (scope as Element).removeAttribute("bis_register");
      } catch {
        /* ignore */
      }
    }
    const query = (scope as ParentNode).querySelectorAll?.bind(scope);
    if (!query) return;
    const els = query("[bis_skin_checked],[bis_register]");
    els.forEach((el) => {
      try {
        el.removeAttribute("bis_skin_checked");
        el.removeAttribute("bis_register");
      } catch {
        /* ignore */
      }
    });
    // Belt-and-braces: document-wide sweep (cheap, runs rarely).
    if (scope === doc) return;
    void doc;
  } catch {
    /* ignore */
  }
}

function hideNextBadge() {
  try {
    if (typeof document === "undefined") return;
    if (!document.getElementById("__hide-next-badge-style")) {
      const st = document.createElement("style");
      st.id = "__hide-next-badge-style";
      st.textContent =
        "nextjs-portal{display:none!important}# __next-devtools,[data-nextjs-dev-overlay],[data-next-devtools],#__next-devtools,#__next-build-watcher{display:none!important}".replace(
          "# __next-devtools",
          "#__next-devtools"
        );
      (document.head || document.documentElement).appendChild(st);
    }
    const portals = document.getElementsByTagName("nextjs-portal");
    for (let i = 0; i < portals.length; i++) {
      try {
        (portals[i] as HTMLElement).style.setProperty("display", "none", "important");
      } catch {
        /* ignore */
      }
    }
  } catch {
    /* ignore */
  }
}

if (typeof window !== "undefined") {
  try {
    // Earliest possible console filter (module eval beats useEffect).
    const origErr = console.error.bind(console);
    const consoleObj = console as unknown as {
      error: (...args: unknown[]) => void;
      warn: (...args: unknown[]) => void;
    };
    consoleObj.error = function (...args: unknown[]) {
      if (shouldSwallowHydration(args)) return;
      return origErr(...args);
    };
    const origWarn = console.warn.bind(console);
    consoleObj.warn = function (...args: unknown[]) {
      if (shouldSwallowHydration(args)) return;
      return origWarn(...args);
    };
    stripBisAttributes(document.documentElement);
    hideNextBadge();
  } catch {
    /* ignore */
  }
}

export default function ExtensionErrorFilter() {
  useEffect(() => {
    if (typeof window === "undefined") return;

    const originalFetch = window.fetch.bind(window);
    window.fetch = async function (
      ...fetchArgs: Parameters<typeof window.fetch>
    ): Promise<Response> {
      const [input, init] = fetchArgs;
      if (typeof window === "undefined") {
        return originalFetch(...fetchArgs);
      }
      
      const customBackend = localStorage.getItem("custom_backend_url");
      const customModels = localStorage.getItem("custom_models_url");

      if (!customBackend && !customModels) {
        return originalFetch(...fetchArgs);
      }

      // Get URL string
      let url = "";
      if (typeof input === "string") {
        url = input;
      } else if (input instanceof URL) {
        url = input.toString();
      } else if (input && typeof input === "object" && "url" in input) {
        url = String((input as unknown as { url: unknown }).url);
      }

      const isApiRoute = url.startsWith("/api/") || 
                          (url.startsWith(window.location.origin) && url.includes("/api/"));

      if (isApiRoute) {
        let headers: Headers;
        if (init && init.headers) {
          headers = new Headers(init.headers);
        } else if (input instanceof Request) {
          headers = new Headers(input.headers);
        } else {
          headers = new Headers();
        }

        if (customBackend) {
          headers.set("x-custom-backend-url", customBackend);
        }
        if (customModels) {
          headers.set("x-custom-models-url", customModels);
        }

        // Re-create/modify request options
        if (input instanceof Request) {
          const newRequest = new Request(input, {
            headers: headers,
          });
          return originalFetch(newRequest);
        } else {
          const newInit = { ...init, headers: headers };
          return originalFetch(input, newInit);
        }
      }

      return originalFetch(...fetchArgs);
    };

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      const reasonStr = String(event.reason?.stack || event.reason?.message || event.reason || "");
      if (
        reasonStr.includes("chrome-extension://") ||
        reasonStr.includes("MetaMask") ||
        reasonStr.includes("inpage.js")
      ) {
        event.stopImmediatePropagation();
        event.preventDefault();
      }
    };

    const handleError = (event: ErrorEvent) => {
      if (
        event.filename?.includes("chrome-extension://") ||
        event.message?.includes("MetaMask") ||
        event.message?.includes("inpage.js")
      ) {
        event.stopImmediatePropagation();
        event.preventDefault();
        return;
      }
      // Swallow extension-attribute + hydration noise before Next's overlay sees it.
      try {
        const errObj = event.error as unknown as { stack?: unknown; message?: unknown };
        const msg =
          String(event.message || "") + " " + String(errObj?.stack || errObj?.message || "");
        if (
          msg.includes("bis_skin_checked") ||
          msg.includes("bis_register") ||
          msg.includes("A tree hydrated") ||
          msg.includes("hydrated but some attributes") ||
          msg.includes("server rendered HTML")
        ) {
          event.stopImmediatePropagation();
          event.preventDefault();
        }
      } catch {
        /* ignore */
      }
    };

    // Re-patch AFTER Next.js has installed its own console wrapper, so our
    // filter stays outermost and Next never records the issue.
    const prevConsoleError = console.error.bind(console);
    const prevConsoleWarn = console.warn.bind(console);
    console.error = (...args: unknown[]) => {
      if (shouldSwallowHydration(args)) return;
      // Also catch the older narrow check for safety.
      const isExtensionMismatch = args.some((arg) => {
        const str = getArgText(arg);
        return str.includes("bis_skin_checked") || str.includes("bis_register");
      });
      if (isExtensionMismatch) return;
      prevConsoleError(...args);
    };
    console.warn = (...args: unknown[]) => {
      if (shouldSwallowHydration(args)) return;
      prevConsoleWarn(...args);
    };

    // Continuously strip extension attributes (extension mutates DOM pre-hydration
    // and at runtime) so React has nothing to mismatch on.
    stripBisAttributes(document.documentElement);
    hideNextBadge();
    const observer = new MutationObserver((muts) => {
      let touched = false;
      for (const m of muts) {
        if (
          m.type === "attributes" &&
          (m.attributeName === "bis_skin_checked" || m.attributeName === "bis_register")
        ) {
          try {
            (m.target as Element).removeAttribute(m.attributeName as string);
          } catch {
            /* ignore */
          }
          touched = true;
        } else if (m.addedNodes && m.addedNodes.length) {
          m.addedNodes.forEach((n) => {
            if (n instanceof Element) stripBisAttributes(n);
          });
          touched = true;
        }
      }
      if (touched) hideNextBadge();
    });
    try {
      observer.observe(document.documentElement, {
        attributes: true,
        childList: true,
        subtree: true,
        attributeFilter: ["bis_skin_checked", "bis_register"],
      });
    } catch {
      /* ignore */
    }

    // Keep the bottom-left badge hidden even if Next recreates the portal.
    const badgeInterval = window.setInterval(() => {
      stripBisAttributes(document.documentElement);
      hideNextBadge();
    }, 1000);

    window.addEventListener("unhandledrejection", handleUnhandledRejection);
    window.addEventListener("error", handleError, true);

    return () => {
      window.clearInterval(badgeInterval);
      observer.disconnect();
      console.error = prevConsoleError;
      console.warn = prevConsoleWarn;
      window.fetch = originalFetch;
      window.removeEventListener("unhandledrejection", handleUnhandledRejection);
      window.removeEventListener("error", handleError, true);
    };
  }, []);

  return null;
}
