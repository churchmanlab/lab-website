# Working on this repo

## American spelling, always

Every word of site prose uses American spelling. `program` not `programme`; `localization`,
`organization`, `analyze`, `visualize`, `synchronized`, `neighboring`, `color`, `fiber`,
`center`, `modeled`, `signaling`, `license`.

Run `npm run check:spelling` before committing prose. It fails on any British spelling in its
word list and prints the file, line and American form. The list is in
`scripts/check-spelling.mjs` — extend it rather than working around it.

Never "correct" spelling inside `src/data/publications.json`. Paper titles and journal names are
quotations and must match what was published. The checker skips that file for this reason.

`analysis`, `catalysis`, `paralysis` and `organism` are correct American English — not British.

## Tone

Dry and declarative. This is a lab website read by scientists, prospective students and
journalists. State findings plainly; skip editorial asides ("Textbooks say…", "you simply cannot
see this in bulk data", "not much of a method"). Where the lab has already written about a topic
— the live site at churchman.med.harvard.edu, grants, papers — follow that wording closely
rather than inventing a fresh voice.

## Internal links

Always `href={u("/team")}`, never `href="/team"`. The `u()` helper in `src/lib/path.js` makes
links survive being served from a subpath. `npm run check:links` catches violations.

## Deploying

GitHub Actions currently does not run on this repo — pushes do not trigger workflows and the
deploy job never acquires a hosted runner. Until that is fixed, Pages serves the `gh-pages`
branch, which is built and pushed manually:

```bash
SITE=https://churchmanlab.github.io SITE_BASE=/lab-website npm run build
npm run check          # links + spelling, before publishing
```

then copy `dist/` onto the `gh-pages` branch (keeping `.nojekyll`, which stops Jekyll stripping
Astro's `_astro/` directory) and push. `.github/workflows/deploy.yml` is correct and ready to
take over whenever Actions works again.
