/**
 * Base-aware URL helper.
 *
 * GitHub Pages serves a project repo from a subpath (/lab-website/), while the real
 * site will eventually sit at a domain root (/). Astro rewrites asset URLs for you but
 * not hrefs you write by hand, so every internal link goes through this.
 *
 * Anything that is not a site-absolute path — external URLs, mailto:, #anchors — is
 * returned untouched, so it is safe to wrap every href indiscriminately.
 */
const BASE = (import.meta.env.BASE_URL || "/").replace(/\/$/, "");

export function u(href) {
  if (typeof href !== "string" || !href.startsWith("/") || href.startsWith("//")) return href;
  return BASE + href;
}
