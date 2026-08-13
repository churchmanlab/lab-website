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

GitHub Pages deploys through `.github/workflows/deploy.yml`. Every push to `main` builds,
checks and publishes the preview at `https://churchmanlab.github.io/lab-website/`. Pull requests
run the build and checks but do not deploy.

```bash
npm run check
git push origin main
```

After pushing, verify that the `Deploy to GitHub Pages` workflow completes successfully and that
the public page serves the new content. Do not manually build or push `gh-pages`; the repository's
Pages source is GitHub Actions, so that branch does not control the deployment.
