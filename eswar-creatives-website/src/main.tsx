import { createRoot, hydrateRoot } from "react-dom/client";
import { HelmetProvider } from "react-helmet-async";
import App from "./app/App.tsx";
import "./styles/index.css";
import { initClarity } from "./lib/clarity";

initClarity();

const container = document.getElementById("root")!;
const app = (
  <HelmetProvider>
    <App />
  </HelmetProvider>
);

// Only the 13 marketing routes prerender.mjs actually loops over carry
// server-rendered markup for THEIR OWN url — that loop stamps
// data-ssr-path="<its route>" on this exact div (see prerender.mjs). Every
// other route, including all of /portal/*, is served via Cloudflare's SPA
// catch-all, which resolves to a prerendered file for a DIFFERENT route
// (almost always the homepage, "/"): its markup and its data-ssr-path stay
// stamped for that other route, so they never match window.location here.
//
// hydrateRoot() assumes the DOM already matches what is about to render and
// tries to reconcile the two. Asked to reconcile a live admin screen against
// a portfolio nav bar, it cannot — that mismatch is the reported
// #418/#423/#425 console errors, and the partial recovery it leaves behind
// is why a later view switch inside the same component can render against
// stray leftover DOM nodes instead of fresh ones. createRoot() carries no
// such assumption: it clears the container and renders once, cleanly. A
// route with no stamp at all (local `vite dev`, which never runs
// prerender.mjs) falls to createRoot too — there is no server markup to
// hydrate against there either.
const currentPath = window.location.pathname.replace(/\/$/, "") || "/";
const ssrPath = container.getAttribute("data-ssr-path");
const normalizedSsrPath = ssrPath ? ssrPath.replace(/\/$/, "") || "/" : null;

if (normalizedSsrPath === currentPath) {
  hydrateRoot(container, app);
} else {
  createRoot(container).render(app);
}
