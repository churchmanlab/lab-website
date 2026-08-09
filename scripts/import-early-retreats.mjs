import { createHash } from "node:crypto";
import { mkdir, readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";

import sharp from "sharp";

const projectRoot = path.resolve(import.meta.dirname, "..");
const dropboxRoot = "/Users/stirlingchurchman/Dropbox";

const retreats = {
  2012: [
    path.join(dropboxRoot, "Churchman lab retreat_Andreas"),
    path.join(dropboxRoot, "Photos", "Churchman lab retreat 2012"),
    path.join(dropboxRoot, "Photos", "2012 lab retreat-Magdalena"),
  ],
  2013: [path.join(dropboxRoot, "2nd Churchman lab retreat_Andreas")],
  2014: [path.join(dropboxRoot, "3rd Churchman lab retreat")],
};

const imageExtensions = new Set([".jpg", ".jpeg", ".png", ".webp", ".heic"]);

async function walk(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];

  for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }))) {
    const itemPath = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...(await walk(itemPath)));
    if (entry.isFile() && imageExtensions.has(path.extname(entry.name).toLowerCase())) files.push(itemPath);
  }

  return files;
}

for (const [year, sourceDirectories] of Object.entries(retreats)) {
  const candidates = [];
  for (const directory of sourceDirectories) candidates.push(...(await walk(directory)));

  const unique = [];
  const seen = new Set();
  for (const source of candidates) {
    const metadata = await stat(source);
    if (metadata.size === 0) continue;

    const digest = createHash("sha256").update(await readFile(source)).digest("hex");
    if (seen.has(digest)) continue;
    seen.add(digest);
    unique.push(source);
  }

  const albumRoot = path.join(projectRoot, "public", "images", "lab-life", `${year}-retreat`);
  const fullDirectory = path.join(albumRoot, "full");
  const thumbDirectory = path.join(albumRoot, "thumbs");
  await mkdir(fullDirectory, { recursive: true });
  await mkdir(thumbDirectory, { recursive: true });

  for (const [index, source] of unique.entries()) {
    const filename = `photo-${String(index + 1).padStart(3, "0")}.jpg`;
    const base = sharp(source, { failOn: "none" }).rotate();

    await base
      .clone()
      .resize({ width: 2200, height: 2200, fit: "inside", withoutEnlargement: true })
      .jpeg({ quality: 84, mozjpeg: true })
      .toFile(path.join(fullDirectory, filename));

    await base
      .clone()
      .resize({ width: 800, height: 800, fit: "inside", withoutEnlargement: true })
      .jpeg({ quality: 78, mozjpeg: true })
      .toFile(path.join(thumbDirectory, filename));
  }

  console.log(`${year}: ${unique.length} unique photos from ${candidates.length} candidates`);
}
