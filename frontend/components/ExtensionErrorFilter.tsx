"use client";

import { useEffect } from "react";

export default function ExtensionErrorFilter() {
  useEffect(() => {
    if (typeof window === "undefined") return;

    const originalFetch = window.fetch;
    window.fetch = async function (input, init) {
      if (typeof window === "undefined") {
        return originalFetch.apply(this, arguments as any);
      }
      
      const customBackend = localStorage.getItem("custom_backend_url");
      const customModels = localStorage.getItem("custom_models_url");

      if (!customBackend && !customModels) {
        return originalFetch.apply(this, arguments as any);
      }

      // Get URL string
      let url = "";
      if (typeof input === "string") {
        url = input;
      } else if (input instanceof URL) {
        url = input.toString();
      } else if (input && typeof input === "object" && "url" in input) {
        url = (input as any).url;
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
          return originalFetch.call(this, newRequest);
        } else {
          const newInit = { ...init, headers: headers };
          return originalFetch.call(this, input, newInit);
        }
      }

      return originalFetch.apply(this, arguments as any);
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
      }
    };

    const originalConsoleError = console.error;
    console.error = (...args: any[]) => {
      const isExtensionMismatch = args.some((arg) => {
        const str = typeof arg === "string" ? arg : (arg?.message || "");
        return typeof str === "string" && (str.includes("bis_skin_checked") || str.includes("bis_register"));
      });
      if (isExtensionMismatch) {
        return;
      }
      originalConsoleError.apply(console, args);
    };

    window.addEventListener("unhandledrejection", handleUnhandledRejection);
    window.addEventListener("error", handleError);

    return () => {
      console.error = originalConsoleError;
      window.fetch = originalFetch;
      window.removeEventListener("unhandledrejection", handleUnhandledRejection);
      window.removeEventListener("error", handleError);
    };
  }, []);

  return null;
}
