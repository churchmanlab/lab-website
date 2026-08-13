import { defineConfig } from "astro/config";
import sitemap from "@astrojs/sitemap";

/**
 * Three deploy targets, one config:
 *
 *   npm run build                                  → root-relative, for local preview
 *   SITE_BASE=/lab-website npm run build           → GitHub Pages project site
 *   SITE=https://churchman.med.harvard.edu ...      → production custom domain
 *
 * The GitHub Pages workflow sets SITE and SITE_BASE for you.
 */
const site = process.env.SITE || "https://churchman.med.harvard.edu";
const base = process.env.SITE_BASE || "/";

export default defineConfig({
  site,
  base,
  trailingSlash: "ignore",
  integrations: [sitemap()],
  build: { format: "directory" },

  // Old Squarespace URLs kept alive so nothing that already links to the lab breaks.
  // Astro prefixes redirect *sources* with the base but not their destinations, so
  // that is done here — otherwise every one of these 404s on a subpath deploy.
  redirects: Object.fromEntries(
    Object.entries({
      "/stirling-churchman": "/stirling",
      "/join-us": "/join",
      "/publications-1": "/tools",
      "/protocols": "/tools",
      "/genewalk": "/tools/genewalk",
      "/home": "/",
      "/team-old": "/team",
    }).map(([from, to]) => [from, base === "/" ? to : base.replace(/\/$/, "") + to]),
  ),
});
