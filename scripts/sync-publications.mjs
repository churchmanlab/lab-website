#!/usr/bin/env node
/**
 * Sync src/data/publications.json against PubMed.
 *
 *   node scripts/sync-publications.mjs           # fill in missing DOIs/PMIDs, report new papers
 *   node scripts/sync-publications.mjs --add     # ...and append newly found papers to the file
 *   node scripts/sync-publications.mjs --dry-run # report only, write nothing
 *
 * Uses the NCBI E-utilities API. No API key is required at the default rate
 * (3 requests/second); set NCBI_API_KEY in the environment to go faster.
 *
 * Why this exists: a hand-maintained publications page is stale the moment you stop
 * editing it. This makes the list self-updating, and — more importantly — attaches a
 * real DOI to every entry so both people and machines can follow it.
 */

import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const HERE = dirname(fileURLToPath(import.meta.url));
const DATA = resolve(HERE, "../src/data/publications.json");

const AUTHOR_QUERY = "Churchman LS[Author]";
const EUTILS = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils";
const API_KEY = process.env.NCBI_API_KEY ?? "";
const ADD = process.argv.includes("--add");
const DRY = process.argv.includes("--dry-run");

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** Titles differ in punctuation, case and diacritics between sources; compare on a skeleton. */
const norm = (s) =>
  (s ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

async function eutils(path, params) {
  const qs = new URLSearchParams({ ...params, retmode: "json", tool: "churchman-lab-site", email: "churchman@genetics.med.harvard.edu" });
  if (API_KEY) qs.set("api_key", API_KEY);
  const url = `${EUTILS}/${path}?${qs}`;
  for (let attempt = 1; attempt <= 4; attempt++) {
    const res = await fetch(url);
    if (res.ok) return res.json();
    if (res.status === 429 || res.status >= 500) {
      await sleep(attempt * 1200);
      continue;
    }
    throw new Error(`${path} failed: ${res.status} ${res.statusText}`);
  }
  throw new Error(`${path} failed after retries`);
}

async function fetchAllRecords() {
  const search = await eutils("esearch.fcgi", { db: "pubmed", term: AUTHOR_QUERY, retmax: "1000" });
  const ids = search.esearchresult?.idlist ?? [];
  console.log(`PubMed returned ${ids.length} records for ${AUTHOR_QUERY}`);

  const records = [];
  for (let i = 0; i < ids.length; i += 100) {
    const batch = ids.slice(i, i + 100);
    const sum = await eutils("esummary.fcgi", { db: "pubmed", id: batch.join(",") });
    for (const id of batch) {
      const r = sum.result?.[id];
      if (!r || r.error) continue;
      const doi = (r.articleids ?? []).find((a) => a.idtype === "doi")?.value ?? null;
      records.push({
        pmid: id,
        doi,
        title: (r.title ?? "").replace(/\.$/, "").replace(/<\/?[^>]+>/g, ""),
        journal: r.fulljournalname || r.source || "",
        year: Number((r.pubdate ?? "").slice(0, 4)) || null,
        volume: r.volume || null,
        pages: r.pages || null,
        authors: (r.authors ?? []).map((a) => a.name).join(", "),
        type: (r.pubtype ?? []).some((t) => /review/i.test(t)) ? "review" : "research",
      });
    }
    await sleep(API_KEY ? 120 : 380);
  }
  return records;
}

async function main() {
  const data = JSON.parse(await readFile(DATA, "utf8"));
  const existing = data.sections.flatMap((s) => s.items);
  const byTitle = new Map(existing.map((p) => [norm(p.title), p]));

  let records;
  try {
    records = await fetchAllRecords();
  } catch (err) {
    console.error(`\nCould not reach PubMed: ${err.message}`);
    console.error("Nothing was written. Re-run when you have network access.");
    process.exit(1);
  }

  let filled = 0;
  const unseen = [];

  for (const rec of records) {
    const match = byTitle.get(norm(rec.title));
    if (!match) {
      unseen.push(rec);
      continue;
    }
    if (!match.pmid) { match.pmid = rec.pmid; filled++; }
    if (!match.doi && rec.doi) { match.doi = rec.doi; filled++; }
    if (!match.volume && rec.volume) match.volume = rec.volume;
    if (!match.pages && rec.pages) match.pages = rec.pages;
  }

  const missing = existing.filter((p) => !p.doi && !p.pmid);

  console.log(`\nFilled ${filled} identifier(s) on existing entries.`);
  console.log(`${existing.length - missing.length}/${existing.length} entries now carry a DOI or PMID.`);

  if (missing.length) {
    console.log(`\nStill unmatched (title differs from PubMed, or not indexed — e.g. preprints):`);
    for (const p of missing) console.log(`  · ${p.year}  ${p.title}`);
  }

  if (unseen.length) {
    console.log(`\n${unseen.length} PubMed record(s) not on the site:`);
    for (const r of unseen) console.log(`  + ${r.year}  ${r.title}  (PMID ${r.pmid})`);
    if (ADD) {
      const target = data.sections.find((s) => s.id === "research");
      for (const r of unseen) {
        target.items.unshift({
          authors: r.authors,
          title: r.title,
          journal: r.journal,
          year: r.year,
          volume: r.volume,
          pages: r.pages,
          type: r.type,
          doi: r.doi,
          pmid: r.pmid,
          _needsReview: "Auto-added from PubMed — check author bolding and section placement.",
        });
      }
      target.items.sort((a, b) => b.year - a.year);
      console.log(`\nAdded ${unseen.length} entry/entries. Lab-member bolding needs a human pass.`);
    } else {
      console.log(`\nRe-run with --add to append these automatically.`);
    }
  }

  if (DRY) {
    console.log("\n--dry-run: no changes written.");
    return;
  }

  data.lastSynced = new Date().toISOString().slice(0, 10);
  await writeFile(DATA, JSON.stringify(data, null, 2) + "\n");
  console.log(`\nWrote ${DATA}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
