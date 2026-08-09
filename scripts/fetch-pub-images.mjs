#!/usr/bin/env node
/**
 * Generate a thumbnail image for each publication and record it in publications.json.
 *
 *   node scripts/fetch-pub-images.mjs --dry-run  # report what is fetchable, write nothing
 *   node scripts/fetch-pub-images.mjs            # fetch, render and record missing images
 *   node scripts/fetch-pub-images.mjs --force    # re-render entries that already have one
 *
 * Images come from three places, in priority order:
 *
 *   1. A journal cover, set by hand as `"image"` in publications.json. Always wins — a cover
 *      the lab earned is a better thumbnail than a page of text.
 *   2. A PDF staged by hand at `pdfs/<slug>.pdf`. This is the route for bioRxiv preprints:
 *      bioRxiv sits behind Cloudflare and answers scripted requests with 429, so its PDFs
 *      cannot be fetched here. Save the PDF from a browser, drop it in `pdfs/`, re-run.
 *   3. Europe PMC, which serves a free rendered PDF for anything deposited in PMC — including
 *      author manuscripts of papers that are otherwise paywalled.
 *
 * Entries marked `"noImage": true` are skipped forever. Use that for the author manuscripts
 * whose HHS Public Access banner and "Author Manuscript" side rails make an ugly thumbnail.
 *
 * Rendering needs poppler's pdftoppm (`brew install poppler`); resizing uses sharp, which
 * Astro already depends on.
 */

import { readFile, writeFile, mkdir, readdir, rm } from "node:fs/promises";
import { existsSync } from "node:fs";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";
import { dirname, resolve, join } from "node:path";
import sharp from "sharp";

const run = promisify(execFile);
const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, "..");
const DATA = join(ROOT, "src/data/publications.json");
const OUT = join(ROOT, "public/images/pubs");
const STAGED = join(ROOT, "pdfs");
const TMP = join(ROOT, "node_modules/.cache/pub-pdfs");

const FORCE = process.argv.includes("--force");
const DRY = process.argv.includes("--dry-run");

const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 " +
  "(KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36";
const EPMC = "https://www.ebi.ac.uk/europepmc/webservices/rest";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** Stable, readable filename for a paper. Long titles are truncated at a word boundary. */
function slug(p) {
  const words = p.title
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .split("-");

  let out = "";
  for (const w of words) {
    if (out && out.length + w.length + 1 > 52) break; // stop at the first overflow, don't skip past it
    out = out ? `${out}-${w}` : w;
  }
  return `${p.year}-${out}`;
}

/** Ask Europe PMC for a free, rendered PDF for this paper. Returns a URL or null. */
async function europePmcPdf(p) {
  const query = p.doi ? `DOI:"${p.doi}"` : p.pmid ? `EXT_ID:${p.pmid} AND SRC:MED` : null;
  if (!query) return null;

  const url = `${EPMC}/search?query=${encodeURIComponent(query)}&format=json&resultType=core`;
  const res = await fetch(url, { headers: { "User-Agent": UA } });
  if (!res.ok) return null;

  const hit = (await res.json()).resultList?.result?.[0];
  if (!hit) return null;

  const pdf = (hit.fullTextUrlList?.fullTextUrl ?? []).find(
    (f) => f.documentStyle === "pdf" && f.availabilityCode === "F",
  );
  if (pdf) return pdf.url;

  // Some PMC records omit the pdf entry but still render one from the PMC id.
  return hit.pmcid ? `https://europepmc.org/articles/${hit.pmcid}?pdf=render` : null;
}

/**
 * Europe PMC renders these PDFs on demand and throttles with 429, which clears on its own.
 * It also answers 500 in two different situations: transient load, and a permanent
 * per-article failure that reports itself as JSON ({"error": "Failed to retrieve PDF…"}).
 * Retrying the permanent kind just burns minutes, so read the body before backing off.
 */
async function download(url, dest) {
  let lastErr = "";
  for (let attempt = 1; attempt <= 4; attempt++) {
    const res = await fetch(url, {
      headers: { "User-Agent": UA, Accept: "application/pdf,*/*" },
      redirect: "follow",
    });

    if (res.ok) {
      const buf = Buffer.from(await res.arrayBuffer());
      if (buf.subarray(0, 5).toString() !== "%PDF-") throw new Error("not a PDF");
      await writeFile(dest, buf);
      return buf.length;
    }

    lastErr = `HTTP ${res.status}`;

    if (res.status >= 500 && res.headers.get("content-type")?.includes("json")) {
      const body = await res.text().catch(() => "");
      const why = body.match(/"error"\s*:\s*"([^"]+)"/)?.[1];
      if (why) throw new Error(why); // Europe PMC has no PDF for this one; asking again won't help.
    }
    if (res.status !== 429 && res.status < 500) throw new Error(lastErr);

    await sleep(attempt * 6000);
  }
  throw new Error(`${lastErr} after 4 attempts`);
}

/**
 * NIH/HHS Public Access author manuscripts are deposited in PMC for paywalled papers.
 * Their first page is a PMC cover sheet — the "HHS Public Access" banner across the top and
 * "Author Manuscript" rails down both sides — which makes a poor thumbnail and is not the
 * published article as it appeared. Detect and skip them; the publisher PDF is the only one
 * worth showing.
 */
async function isAuthorManuscript(pdf) {
  try {
    const { stdout } = await run("pdftotext", ["-f", "1", "-l", "1", pdf, "-"]);
    return /HHS Public Access|Author manuscript;|available in PMC/i.test(stdout);
  } catch {
    return false; // If pdftotext cannot read it, let the render attempt decide.
  }
}

/** Render page 1 at print-ish resolution, then downsample — sharper than rendering small. */
async function renderFirstPage(pdf, out) {
  const stem = join(TMP, "page");
  await run("pdftoppm", ["-jpeg", "-r", "110", "-singlefile", "-f", "1", "-l", "1", pdf, stem]);
  const meta = await sharp(`${stem}.jpg`)
    .resize({ width: 520, withoutEnlargement: true })
    .jpeg({ quality: 80, mozjpeg: true })
    .toFile(out);
  await rm(`${stem}.jpg`, { force: true });
  return meta;
}

async function main() {
  const data = JSON.parse(await readFile(DATA, "utf8"));
  const items = data.sections.flatMap((s) => s.items);

  await mkdir(OUT, { recursive: true });
  await mkdir(TMP, { recursive: true });

  const staged = existsSync(STAGED)
    ? new Set((await readdir(STAGED)).filter((f) => f.endsWith(".pdf")).map((f) => f.slice(0, -4)))
    : new Set();

  const todo = items.filter((p) => !p.noImage && (FORCE || !p.image));
  console.log(
    `${items.length} publications · ${items.filter((p) => p.image).length} already have an image · ` +
      `${items.filter((p) => p.noImage).length} opted out · ${todo.length} to try\n`,
  );

  let made = 0;
  const failed = [];

  for (const p of todo) {
    const name = slug(p);
    const label = `${p.year}  ${p.title.slice(0, 62)}`;

    let source = null;
    let pdf = join(TMP, `${name}.pdf`);

    if (staged.has(name)) {
      pdf = join(STAGED, `${name}.pdf`);
      source = "staged";
    } else {
      try {
        const url = await europePmcPdf(p);
        if (url) source = url;
      } catch (err) {
        failed.push([label, `Europe PMC lookup: ${err.message}`]);
        continue;
      }
      await sleep(1500); // Europe PMC throttles the render endpoint; stay well under it.
    }

    if (!source) {
      failed.push([label, "no free PDF found — stage one at pdfs/" + name + ".pdf"]);
      continue;
    }

    if (DRY) {
      console.log(`  would fetch  ${label}\n               ${source}`);
      made++;
      continue;
    }

    try {
      if (source !== "staged") await download(source, pdf);

      if (await isAuthorManuscript(pdf)) {
        p.noImage = "NIH Public Access author manuscript — cover sheet, not the published page";
        failed.push([label, "author manuscript, skipped"]);
        continue;
      }

      const out = join(OUT, `${name}.jpg`);
      const meta = await renderFirstPage(pdf, out);
      p.image = `/images/pubs/${name}.jpg`;
      p.imageKind = "firstpage";
      // Recorded so the page can reserve the right box and avoid layout shift.
      p.imageW = meta.width;
      p.imageH = meta.height;
      console.log(`  ✓ ${label}\n      ${meta.width}×${meta.height}  ${Math.round(meta.size / 1024)}KB  (${source === "staged" ? "staged PDF" : "Europe PMC"})`);
      made++;
    } catch (err) {
      failed.push([label, err.message]);
    }
  }

  if (failed.length) {
    console.log(`\n${failed.length} could not be imaged:`);
    for (const [label, why] of failed) console.log(`  · ${label}\n      ${why}`);
  }

  if (DRY) {
    console.log(`\n--dry-run: ${made} fetchable, nothing written.`);
    return;
  }

  await writeFile(DATA, JSON.stringify(data, null, 2) + "\n");
  console.log(`\nRendered ${made} image(s). Wrote ${DATA}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
