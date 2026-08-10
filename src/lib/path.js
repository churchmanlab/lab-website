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

/**
 * Rewrites site-absolute links inside trusted CMS-authored HTML so rich-text
 * fields work both at the production domain root and in the GitHub Pages
 * /lab-website/ preview.
 *
 * Pages CMS writes this HTML into version-controlled JSON files. It is trusted
 * editorial content, not visitor input, so rendering it is equivalent to the
 * hand-authored HTML that previously lived in the Astro templates.
 */
export function contentHtml(html) {
  if (typeof html !== "string") return "";
  return html.replace(/\b(href|src)=(['"])(\/[^'"]*)\2/g, (_match, attribute, quote, path) =>
    `${attribute}=${quote}${u(path)}${quote}`,
  );
}
