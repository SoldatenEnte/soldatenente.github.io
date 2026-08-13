// Cross-origin isolation without server headers.
//
// Hosts such as GitHub Pages do not let you set COOP/COEP. This service worker
// re-serves every same-origin response with those headers attached, which makes
// the document cross-origin isolated and therefore re-enables SharedArrayBuffer
// — and with it the rayon thread pool the labs use.
//
// The first load registers the worker and reloads once; from then on the page is
// isolated. If registration fails the labs still work, single-threaded, and say
// so in their environment panel.
//
// Include it before any module script:
//   <script src="/coi-serviceworker.js"></script>

if (typeof window === "undefined") {
  // --- service worker scope ---
  self.addEventListener("install", () => self.skipWaiting());
  self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()));

  self.addEventListener("fetch", (event) => {
    const req = event.request;
    if (req.cache === "only-if-cached" && req.mode !== "same-origin") return;

    event.respondWith(
      fetch(req)
        .then((res) => {
          // Opaque responses carry no readable headers; passing them through
          // unchanged keeps third-party subresources working.
          if (res.status === 0) return res;

          const headers = new Headers(res.headers);
          headers.set("Cross-Origin-Embedder-Policy", "require-corp");
          headers.set("Cross-Origin-Opener-Policy", "same-origin");
          return new Response(res.body, {
            status: res.status,
            statusText: res.statusText,
            headers,
          });
        })
        .catch((e) => console.error("[coi] ", e)),
    );
  });
} else {
  // --- page scope ---
  (() => {
    if (window.crossOriginIsolated) return; // already isolated by real headers
    if (!window.isSecureContext) {
      console.warn("[coi] insecure context — cross-origin isolation unavailable");
      return;
    }
    if (!navigator.serviceWorker) {
      console.warn("[coi] service workers unavailable — labs will run single-threaded");
      return;
    }

    navigator.serviceWorker
      .register(window.document.currentScript.src)
      .then((registration) => {
        registration.addEventListener("updatefound", () => window.location.reload());
        // A controller means the worker is already intercepting; a fresh
        // registration needs one reload before its headers take effect.
        if (registration.active && !navigator.serviceWorker.controller) {
          window.location.reload();
        }
      })
      .catch((e) => console.warn("[coi] registration failed:", e));
  })();
}
