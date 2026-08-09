#!/usr/bin/env node
/**
 * Import PDFs from a Paperpile ZIP export, attach them to publications.json,
 * and render page-one thumbnails for publications that do not already have art.
 *
 *   node scripts/import-paperpile-pdfs.mjs /path/to/unzipped-paperpile-export
 *   node scripts/import-paperpile-pdfs.mjs /path/to/export /path/to/one-more.pdf
 *   node scripts/import-paperpile-pdfs.mjs --all-first-pages public/pdfs
 *
 * Paperpile filenames follow "Authors YEAR - Title.pdf". Some long titles are
 * shortened with an ellipsis, so matching uses both a normalized prefix and
 * title-word overlap. Ambiguous or weak matches are reported and left alone.
 */

import { copyFile, mkdir, readFile, readdir, rm, stat, writeFile } from "node:fs/promises";
import { basename, dirname, extname, join, resolve } from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const run = promisify(execFile);
const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, "..");
const DATA = join(ROOT, "src/data/publications.json");
const PDF_OUT = join(ROOT, "public/pdfs");
const IMAGE_OUT = join(ROOT, "public/images/pubs");
const TMP = join(ROOT, "node_modules/.cache/paperpile-import");
const ALL_FIRST_PAGES = process.argv.includes("--all-first-pages");
const inputs = process.argv.slice(2).filter((p) => !p.startsWith("--")).map((p) => resolve(p));

if (!inputs.length) {
  console.error("Pass an unzipped Paperpile export directory or one or more PDF files.");
  process.exit(1);
}

const normalize = (s) =>
  (s ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

function slug(p) {
  const words = normalize(p.title).split(" ");
  let out = "";
  for (const word of words) {
    if (out && out.length + word.length + 1 > 52) break;
    out = out ? `${out}-${word}` : word;
  }
  return `${p.year}-${out}`;
}

async function collectPdfs(path) {
  const details = await stat(path);
  if (details.isFile()) return extname(path).toLowerCase() === ".pdf" ? [path] : [];

  const found = [];
  for (const entry of await readdir(path, { withFileTypes: true })) {
    const child = join(path, entry.name);
    if (entry.isDirectory()) found.push(...(await collectPdfs(child)));
    else if (entry.isFile() && extname(entry.name).toLowerCase() === ".pdf") found.push(child);
  }
  return found;
}

function filenameTitle(path) {
  const stem = basename(path, extname(path)).replace(/\s+\.\.\.\s+/g, " ");
  const divider = stem.indexOf(" - ");
  return divider >= 0 ? stem.slice(divider + 3) : stem;
}

function filenameYear(path) {
  return Number(basename(path).match(/\b(19|20)\d{2}\b/)?.[0]) || null;
}

function similarity(a, b) {
  const left = normalize(a);
  const right = normalize(b);
  if (!left || !right) return 0;
  if (left === right) return 1;

  const aWords = left.split(" ");
  const bWords = right.split(" ");
  const aSet = new Set(aWords);
  const bSet = new Set(bWords);
  let overlap = 0;
  for (const word of aSet) if (bSet.has(word)) overlap++;
  const f1 = (2 * overlap) / (aSet.size + bSet.size);

  let common = 0;
  while (common < aWords.length && common < bWords.length && aWords[common] === bWords[common]) common++;
  const prefix = common / Math.min(aWords.length, bWords.length);
  const contained = left.startsWith(right) || right.startsWith(left) ? Math.min(left.length, right.length) / Math.max(left.length, right.length) : 0;
  return Math.max(f1, prefix * 0.94, contained * 0.98);
}

async function renderFirstPage(pdf, out, stemName) {
  const stem = join(TMP, stemName);
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
  const publications = data.sections.flatMap((section) => section.items);
  const pdfs = (await Promise.all(inputs.map(collectPdfs))).flat();

  const choices = pdfs.map((pdf) => {
    const sourceTitle = filenameTitle(pdf);
    const sourceYear = filenameYear(pdf);
    const sourceStem = basename(pdf, extname(pdf)).toLowerCase();
    const doiPublication = publications.find((publication) => {
      const doiTail = publication.doi?.split("/").at(-1)?.toLowerCase();
      return doiTail && sourceStem.includes(doiTail);
    });
    const ranked = publications
      .map((publication) => ({
        publication,
        score:
          (publication === doiPublication ? 1.1 : similarity(sourceTitle, publication.title)) +
          (sourceYear === publication.year ? 0.05 : 0),
      }))
      .sort((a, b) => b.score - a.score);
    return { pdf, sourceTitle, sourceYear, best: ranked[0], runnerUp: ranked[1] };
  });

  const byPublication = new Map();
  const unmatched = [];
  for (const choice of choices) {
    const confident = choice.best.score >= 0.55 && choice.best.score - choice.runnerUp.score >= 0.04;
    if (!confident) {
      unmatched.push(choice);
      continue;
    }
    const current = byPublication.get(choice.best.publication);
    if (!current || choice.best.score > current.best.score) byPublication.set(choice.best.publication, choice);
  }

  await mkdir(PDF_OUT, { recursive: true });
  await mkdir(IMAGE_OUT, { recursive: true });
  await mkdir(TMP, { recursive: true });

  let imported = 0;
  let rendered = 0;
  for (const [publication, choice] of byPublication) {
    const name = slug(publication);
    const pdfDest = join(PDF_OUT, `${name}.pdf`);
    if (resolve(choice.pdf) !== resolve(pdfDest)) await copyFile(choice.pdf, pdfDest);
    publication.pdf = `/pdfs/${name}.pdf`;
    imported++;

    if (publication.type === "preprint") {
      delete publication.image;
      delete publication.imageKind;
      delete publication.imageW;
      delete publication.imageH;
      delete publication.noImage;
    } else if (ALL_FIRST_PAGES || !publication.image || publication.noImage) {
      const imageDest = join(IMAGE_OUT, `${name}.jpg`);
      const meta = await renderFirstPage(pdfDest, imageDest, name);
      publication.image = `/images/pubs/${name}.jpg`;
      publication.imageKind = "firstpage";
      publication.imageW = meta.width;
      publication.imageH = meta.height;
      delete publication.noImage;
      rendered++;
    }
  }

  await writeFile(DATA, `${JSON.stringify(data, null, 2)}\n`);

  console.log(`Imported ${imported} PDF(s); rendered ${rendered} new first-page image(s).`);
  console.log(`${publications.filter((p) => p.pdf).length}/${publications.length} publications now have a local PDF.`);

  const missing = publications.filter((p) => !p.pdf);
  if (missing.length) {
    console.log("\nPublications still missing a PDF:");
    for (const p of missing) console.log(`  · ${p.year}  ${p.title}`);
  }

  if (unmatched.length) {
    console.log("\nExported PDFs not confidently matched:");
    for (const item of unmatched) {
      console.log(`  · ${basename(item.pdf)}\n      nearest: ${item.best.publication.title} (${item.best.score.toFixed(2)})`);
    }
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
