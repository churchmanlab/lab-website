import { readdir } from "node:fs/promises";
import path from "node:path";

import sharp from "sharp";

const projectRoot = path.resolve(import.meta.dirname, "..");
const albumIds = process.argv.slice(2);

for (const albumId of albumIds) {
  const directory = path.join(projectRoot, "public", "images", "lab-life", albumId, "thumbs");
  const files = (await readdir(directory)).filter((file) => file.endsWith(".jpg")).sort();
  const columns = 8;
  const cellWidth = 240;
  const cellHeight = 190;
  const rows = Math.ceil(files.length / columns);
  const composites = [];

  for (const [index, file] of files.entries()) {
    const thumbnail = await sharp(path.join(directory, file))
      .resize({ width: cellWidth, height: cellHeight, fit: "cover" })
      .composite([
        {
          input: Buffer.from(
            `<svg width="${cellWidth}" height="${cellHeight}"><rect x="0" y="158" width="92" height="32" fill="rgba(0,0,0,.65)"/><text x="10" y="181" fill="white" font-family="Arial" font-size="21">${String(index + 1).padStart(3, "0")}</text></svg>`,
          ),
        },
      ])
      .jpeg({ quality: 78 })
      .toBuffer();

    composites.push({
      input: thumbnail,
      left: (index % columns) * cellWidth,
      top: Math.floor(index / columns) * cellHeight,
    });
  }

  await sharp({
    create: {
      width: columns * cellWidth,
      height: rows * cellHeight,
      channels: 3,
      background: "#eeeae2",
    },
  })
    .composite(composites)
    .jpeg({ quality: 85 })
    .toFile(`/tmp/${albumId}-contact-sheet.jpg`);

  console.log(`/tmp/${albumId}-contact-sheet.jpg`);
}
