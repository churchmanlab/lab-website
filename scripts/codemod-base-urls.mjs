#!/usr/bin/env node
/**
 * One-off codemod: wrap every internal href in the base-aware u() helper.
 * Kept in the repo as a record of what was changed, not because it needs re-running.
 */
import { readFile, writeFile, readdir } from "node:fs/promises";
import { resolve, dirname, relative, join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const SRC = resolve(HERE, "../src");
const LIB = resolve(SRC, "lib/path.js");

async function walk(dir) {
  const out = [];
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) out.push(...(await walk(p)));
    else if (e.name.endsWith(".astro")) out.push(p);
  }
  return out;
}

// Identifiers whose values are hrefs pulled from data files.
const DATA_HREFS = ["n.href", "p.href", "h.href", "a.href", "l.href", "site.links.cv"];

let changed = 0;
for (const file of await walk(SRC)) {
  let src = await readFile(file, "utf8");
  const before = src;

  // href="/research"  ->  href={u("/research")}
  src = src.replace(/href="(\/(?!\/)[^"]*)"/g, 'href={u("$1")}');

  // href={n.href}  ->  href={u(n.href)}
  for (const id of DATA_HREFS) {
    src = src.split(`href={${id}}`).join(`href={u(${id})}`);
  }

  if (src === before) continue;

  if (!src.includes('from "') || !/import \{ u \}/.test(src)) {
    let rel = relative(dirname(file), LIB).replace(/\\/g, "/");
    if (!rel.startsWith(".")) rel = "./" + rel;
    // Insert the import after the last existing import in the frontmatter.
    const fm = src.indexOf("---", 3);
    const head = src.slice(0, fm);
    const lastImport = head.lastIndexOf("\nimport ");
    const eol = head.indexOf("\n", lastImport + 1);
    src = head.slice(0, eol) + `\nimport { u } from "${rel}";` + head.slice(eol) + src.slice(fm);
  }

  await writeFile(file, src);
  changed++;
  console.log(`  rewrote ${relative(SRC, file)}`);
}
console.log(`\n${changed} file(s) updated.`);
