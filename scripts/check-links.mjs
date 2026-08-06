#!/usr/bin/env node
/**
 * Walks the built site and verifies every internal link resolves to a real file.
 *
 * This exists because the base-path problem is invisible until deploy: links look fine
 * locally at "/" and 404 on GitHub Pages at "/lab-website/". The CI job runs this on
 * every pull request so that class of bug can never reach the preview URL.
 *
 * External links are listed but not fetched — no network calls, so CI stays fast and
 * does not fail because a journal was briefly down.
 */
import { readdir, readFile, stat } from "node:fs/promises";
import { resolve, dirname, join, posix } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const DIST = resolve(HERE, "../dist");
const BASE = (process.env.SITE_BASE || "/").replace(/\/$/, "");

async function walk(dir) {
  const out = [];
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) out.push(...(await walk(p)));
    else if (e.name.endsWith(".html")) out.push(p);
  }
  return out;
}

const exists = async (p) => {
  try {
    await stat(p);
    return true;
  } catch {
    return false;
  }
};

async function resolves(href) {
  // strip query and fragment
  const clean = href.split("#")[0].split("?")[0];
  if (!clean || clean === "/") return exists(resolve(DIST, "index.html"));

  let rel = clean;
  if (BASE && rel.startsWith(BASE + "/")) rel = rel.slice(BASE.length);
  else if (BASE && rel === BASE) rel = "/";
  else if (BASE) return false; // site-absolute link that forgot the base

  rel = rel.replace(/^\//, "");
  const candidates = [
    resolve(DIST, rel),
    resolve(DIST, rel, "index.html"),
    resolve(DIST, rel + ".html"),
  ];
  for (const c of candidates) if (await exists(c)) return true;
  return false;
}

const files = await walk(DIST);
const broken = [];
const externals = new Set();
let checked = 0;

for (const file of files) {
  const html = await readFile(file, "utf8");
  const hrefs = [...html.matchAll(/(?:href|src)="([^"]+)"/g)].map((m) => m[1]);
  for (const href of hrefs) {
    if (/^(https?:|mailto:|tel:|data:|#|javascript:)/.test(href)) {
      if (href.startsWith("http")) externals.add(new URL(href).host);
      continue;
    }
    if (!href.startsWith("/")) continue; // relative asset paths are Astro's problem, and it gets them right
    checked++;
    if (!(await resolves(href))) {
      broken.push({ file: file.replace(DIST + "/", ""), href });
    }
  }
}

console.log(`Checked ${checked} internal link(s) across ${files.length} page(s).`);
console.log(`Base: "${BASE || "/"}"  ·  ${externals.size} distinct external host(s) linked.`);

if (broken.length) {
  console.error(`\n${broken.length} broken internal link(s):\n`);
  for (const b of broken) console.error(`  ${b.file}  →  ${b.href}`);
  process.exit(1);
}
console.log("\nAll internal links resolve.");
