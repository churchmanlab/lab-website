# Site images

Web-sized images the site actually serves. These are committed to the repo.

Raw camera originals live in `../../people/` (gitignored) — keep them there, and export
web versions into here. Roughly 1400px on the long edge, JPEG quality ~82, is plenty:
headshots display at ~500px on a 2× screen.

Everything else on the site still hotlinks to the Squarespace CDN. As those are migrated,
they should land here too, and the `img()` helper at the top of each page should point at
`/images/...` instead.
