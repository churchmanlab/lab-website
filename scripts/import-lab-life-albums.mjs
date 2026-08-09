import { createHash } from "node:crypto";
import { execFile as execFileCallback } from "node:child_process";
import { mkdir, readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";

import sharp from "sharp";

const projectRoot = path.resolve(import.meta.dirname, "..");
const websiteRoot = path.resolve(projectRoot, "..");
const execFile = promisify(execFileCallback);

const albums = [
  {
    id: "2013-harpoon-outing",
    sources: [path.join(projectRoot, ".photo-import", "2013-harpoon")],
  },
  {
    id: "2015-seth-farewell",
    sources: [path.join(projectRoot, ".photo-import", "2015-seth-farewell-all")],
    include: new Set([
      "IMG_4261.jpeg",
      "IMG_4262 (1).jpeg",
      "IMG_4263.jpeg",
      "IMG_4264 (1).jpeg",
      "IMG_4264 (3).jpeg",
      "IMG_4265 (1).jpeg",
      "IMG_4266 (1).jpeg",
      "IMG_4266 (3).jpeg",
      "IMG_4267.jpeg",
      "IMG_4268.jpeg",
      "IMG_4269 (1).jpeg",
      "IMG_4270 (1).jpeg",
      "IMG_4271.jpeg",
      "IMG_4272.jpeg",
    ]),
  },
  {
    id: "2019-blake-defense",
    sources: [
      path.join(projectRoot, ".photo-import", "2019-blake-defense"),
      path.join(websiteRoot, "media-export-5556600-from-0-to-358", "2019", "05"),
    ],
    include: new Set([
      "IMG_0087.jpeg",
      "IMG_0088.jpeg",
      "IMG_0089.jpeg",
      "0fee4-img_0044.jpg",
      "1ba97-bildvonios.jpg",
      "11060-rikuunwmtt2dqlrjhfjoeg.jpg",
      "12a05-qxcm25mrztnyi2bop4ez3zpw.jpg",
      "6abe2-30cf6aavrbqxfpov4f14kg.jpg",
      "7448c-img_8668.jpg",
      "d8127-imagefromios.jpg",
      "f616b-img_0041.jpg",
    ]),
  },
  {
    id: "2023-tommy-defense",
    sources: [path.join(projectRoot, ".photo-import", "2023-tommy-defense")],
  },
  {
    id: "2024-jake-defense",
    sources: [path.join(projectRoot, ".photo-import", "2024-jake-defense")],
    include: new Set([
      "IMG_0911 (1).jpeg",
      "IMG_0912 (1).jpeg",
      "IMG_0913 (1).jpeg",
      "IMG_0914.jpeg",
      "IMG_0915.jpeg",
      "IMG_0916.jpeg",
      "IMG_0917.jpeg",
      "IMG_0918 (1).jpeg",
      "IMG_0919 (1).jpeg",
      "IMG_0920 (1).jpeg",
      "IMG_0921 (1).jpeg",
      "IMG_0922.jpeg",
      "IMG_0923.jpeg",
    ]),
  },
  {
    id: "2025-candidate-dinner",
    sources: [path.join(projectRoot, ".photo-import", "2025-candidate-dinner")],
    include: new Set([
      "IMG_1583.jpeg",
      "IMG_1584.jpeg",
      "IMG_1585.jpeg",
      "IMG_1586.jpeg",
      "IMG_1587.jpeg",
      "IMG_1588.jpeg",
    ]),
  },
  {
    id: "2026-hope-defense",
    sources: [path.join(projectRoot, ".photo-import", "2026-hope-defense")],
    include: new Set(["IMG_2809.jpeg", "IMG_2810.jpeg", "IMG_2811.jpeg"]),
  },
  {
    id: "2011-first-year",
    files: [
      path.join(websiteRoot, "simple-organization-website-template", "img", "boxes.JPG"),
      path.join(websiteRoot, "simple-organization-website-template", "img", "ice_cream.jpg"),
      path.join(websiteRoot, "simple-organization-website-template", "img", "sushi.jpg"),
    ],
  },
  {
    id: "2012-lab-move-in",
    sources: [path.join(projectRoot, ".photo-import", "2012-lab-move-in")],
  },
  {
    id: "2015-retreat",
    sources: [path.join(projectRoot, ".photo-import", "2015-retreat")],
  },
  {
    id: "2016-retreat",
    sources: [path.join(websiteRoot, "media-export-5556600-from-0-to-358", "2016", "10")],
    startAt: 3,
    pad: 2,
  },
  {
    id: "2019-heather-defense",
    sources: [path.join(websiteRoot, "media-export-5556600-from-0-to-358", "2019", "05")],
    include: new Set([
      "201fc-imagefromios28229.jpg",
      "5a2a7-imagefromios28129.jpg",
      "88bcd-img_0039.jpg",
    ]),
  },
  {
    id: "2021-lab-party",
    sources: [path.join(websiteRoot, "photos")],
  },
  {
    id: "2022-katja-baby-shower",
    sources: [path.join(projectRoot, ".photo-import", "2022-katja-baby-shower-jpeg")],
  },
  {
    id: "2022-keystone",
    sources: [path.join(projectRoot, ".photo-import", "2022-keystone-jpeg")],
  },
  {
    id: "2022-charles-cruise",
    sources: [path.join(projectRoot, ".photo-import", "2022-cruise-jpeg")],
  },
];

const imageExtensions = new Set([".jpg", ".jpeg", ".png", ".webp", ".heic"]);

async function walk(directory, exclude = new Set(), include = null) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];

  for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }))) {
    if (exclude.has(entry.name)) continue;
    const itemPath = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...(await walk(itemPath, exclude, include)));
    if (
      entry.isFile() &&
      imageExtensions.has(path.extname(entry.name).toLowerCase()) &&
      (!include || include.has(entry.name))
    ) {
      files.push(itemPath);
    }
  }

  return files;
}

async function sharpInput(source, albumId) {
  if (path.extname(source).toLowerCase() !== ".heic") return source;

  const digest = createHash("sha256").update(await readFile(source)).digest("hex");
  const convertedDirectory = path.join(projectRoot, ".photo-import", ".converted", albumId);
  const converted = path.join(convertedDirectory, `${digest}.jpg`);
  await mkdir(convertedDirectory, { recursive: true });

  try {
    await stat(converted);
  } catch {
    await execFile("/usr/bin/sips", ["-s", "format", "jpeg", source, "--out", converted]);
  }

  return converted;
}

const requestedAlbums = new Set(process.argv.slice(2));
const selectedAlbums = requestedAlbums.size ? albums.filter((album) => requestedAlbums.has(album.id)) : albums;

if (requestedAlbums.size && selectedAlbums.length !== requestedAlbums.size) {
  const found = new Set(selectedAlbums.map((album) => album.id));
  const unknown = [...requestedAlbums].filter((id) => !found.has(id));
  throw new Error(`Unknown album id(s): ${unknown.join(", ")}`);
}

for (const album of selectedAlbums) {
  const candidates = [...(album.files || [])];
  for (const directory of album.sources || []) {
    candidates.push(...(await walk(directory, album.exclude, album.include)));
  }

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

  const albumRoot = path.join(projectRoot, "public", "images", "lab-life", album.id);
  const fullDirectory = path.join(albumRoot, "full");
  const thumbDirectory = path.join(albumRoot, "thumbs");
  await mkdir(fullDirectory, { recursive: true });
  await mkdir(thumbDirectory, { recursive: true });

  const startAt = album.startAt || 1;
  const pad = album.pad || 3;

  for (const [index, source] of unique.entries()) {
    const filename = `photo-${String(startAt + index).padStart(pad, "0")}.jpg`;
    const base = sharp(await sharpInput(source, album.id), { failOn: "none" }).rotate();

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

  console.log(`${album.id}: ${unique.length} unique photos from ${candidates.length} candidates`);
}
