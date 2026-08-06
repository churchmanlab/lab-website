#!/usr/bin/env node
/**
 * Bundles the built site into ONE self-contained preview.html that works from a
 * file:// URL — so the prototype can be opened by double-clicking, with no server.
 * This is a viewing aid only; the real site is the dist/ directory.
 */
import { readFile, writeFile, readdir } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const DIST = resolve(HERE, "../dist");

const ROUTES = [
  ["/", "Home"],
  ["/research", "Research"],
  ["/team", "Team"],
  ["/publications", "Publications"],
  ["/tools", "Tools & Protocols"],
  ["/tools/genewalk", "GeneWalk"],
  ["/join", "Join Us"],
  ["/stirling", "Stirling"],
  ["/fun", "Lab Life"],
  ["/contact", "Contact"],
];

const grab = (html, tag, attrs = "") => {
  const re = new RegExp(`<${tag}${attrs}[^>]*>([\\s\\S]*?)</${tag}>`, "i");
  return (html.match(re) ?? [, ""])[1];
};

async function css() {
  const dir = resolve(DIST, "_astro");
  const files = await readdir(dir).catch(() => []);
  const out = [];
  for (const f of files.filter((f) => f.endsWith(".css"))) {
    out.push(await readFile(resolve(dir, f), "utf8"));
  }
  return out.join("\n");
}

const rewrite = (html) =>
  html
    // internal links become hash routes so they work offline
    .replace(/href="\/(?!\/)([^"#]*)(#[^"]*)?"/g, (m, path, hash) => {
      if (/^(publications\.json|llms\.txt|s\/)/.test(path)) return m;
      const clean = "/" + path.replace(/\/$/, "");
      return `href="#${clean === "/" ? "/" : clean}${hash ?? ""}"`;
    })
    .replace(/href="\/"/g, 'href="#/"');

const pageFile = (route) =>
  route === "/" ? resolve(DIST, "index.html") : resolve(DIST, route.slice(1), "index.html");

const pages = [];
let footer = "";
for (const [route, label] of ROUTES) {
  const html = await readFile(pageFile(route), "utf8");
  const main = grab(html, "main", ' id="main"');
  if (!footer) footer = rewrite(grab(html, "footer", ' class="site-footer"'));
  pages.push({ route, label, html: rewrite(main) });
}

const nav = ROUTES.map(
  ([r, l]) => `<a href="#${r}" data-route="${r}">${l}</a>`,
).join("");

const doc = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Churchman Lab — prototype rebuild</title>
<style>
${await css()}
.pv-banner{background:#17161a;color:#f2efe9;font-size:.82rem;padding:9px 0}
.pv-banner .wrap{display:flex;gap:14px;align-items:center;flex-wrap:wrap}
.pv-banner b{color:#fff}
.pv-banner a{color:#f0b8bf}
.pv-page{display:none}
.pv-page.on{display:block}
.site-nav a.on{color:var(--ink);border-bottom-color:var(--accent)}
</style>
</head>
<body>
<div class="pv-banner"><div class="wrap">
  <b>Prototype</b>
  <span>Rebuild of churchman.med.harvard.edu as a code-based site. Images load from the current Squarespace CDN. Nothing here is live.</span>
</div></div>

<header class="site-header"><div class="wrap">
  <a class="brand" href="#/">Churchman Lab</a>
  <nav class="site-nav" aria-label="Primary">${nav}</nav>
</div></header>

<main id="main">
${pages.map((p) => `<div class="pv-page" data-route="${p.route}">${p.html}</div>`).join("\n")}
</main>

${footer}

<script>
(function(){
  var pages = Array.prototype.slice.call(document.querySelectorAll('.pv-page'));
  var links = Array.prototype.slice.call(document.querySelectorAll('.site-nav a'));
  function show(){
    var hash = location.hash.replace(/^#/, '') || '/';
    var anchor = '';
    var i = hash.indexOf('#');
    if (i > -1) { anchor = hash.slice(i+1); hash = hash.slice(0, i); }
    hash = hash.replace(/\\/$/, '') || '/';
    var found = false;
    pages.forEach(function(p){
      var on = p.dataset.route === hash;
      p.classList.toggle('on', on);
      if (on) found = true;
    });
    if (!found) pages[0].classList.add('on');
    links.forEach(function(a){ a.classList.toggle('on', a.dataset.route === hash); });
    if (anchor) {
      var el = document.getElementById(anchor);
      if (el) { el.scrollIntoView(); return; }
    }
    window.scrollTo(0,0);
  }
  window.addEventListener('hashchange', show);
  show();
})();
</script>
</body>
</html>`;

await writeFile(resolve(DIST, "preview.html"), doc);
console.log(`preview.html written — ${pages.length} pages, ${(doc.length / 1024).toFixed(0)} KB`);
