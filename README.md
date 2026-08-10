# Churchman Lab website

Source for the website of the [Churchman Lab](https://churchman.med.harvard.edu), Department of
Genetics, Blavatnik Institute, Harvard Medical School. Built with [Astro](https://astro.build)
as a static site.

**Preview:** https://churchmanlab.github.io/lab-website/ *(live once the repo is pushed and Pages is enabled)*

This is a rebuild of the Squarespace site, not yet the live site. The domain still points at
Squarespace.

## Quick start

```bash
npm install
npm run dev          # http://localhost:4321
```

Want to edit content without running anything? Open the repository in
[Pages CMS](https://app.pagescms.org/). It provides labeled forms, rich-text editing, image
selection, team records, publication records and Lab Life album metadata; saving writes the
change to GitHub, where the existing deployment workflow rebuilds the site. The one-time GitHub
authorization and the complete editing guide are in [CONTRIBUTING.md](CONTRIBUTING.md).

## What's here

```
src/
  data/            the content that changes most — edit these first
    pages/               page copy used by the Pages CMS rich-text forms
    publications.json    publication bibliography; kept current by scripts/sync-publications.mjs
    team.json            current members and alumni
    site.json            address, emails, nav, external links
  pages/           one file per page
  layouts/Base.astro     shared shell, meta tags, structured data
  lib/path.js            base-aware URL helper (see "Base paths" below)
  styles/global.css      all styling; design tokens are the variables at the top
scripts/
  sync-publications.mjs  pulls DOIs/PMIDs from PubMed, finds papers not yet listed
  check-links.mjs        fails CI if any internal link is broken
  make-preview.mjs       bundles the built site into one shareable HTML file
.github/workflows/
  deploy.yml             builds and publishes to GitHub Pages on push to main
  sync-publications.yml  monthly PubMed sync, opens a PR
.pages.yml               Pages CMS fields, media folders and editor navigation
```

## Commands

| Command | What it does |
| --- | --- |
| `npm run dev` | Local dev server with live reload |
| `npm run build` | Static build into `dist/` |
| `npm run check` | Type-checks pages and verifies links and spelling |
| `npm run check:links` | Verifies every internal link resolves |
| `npm run preview:file` | Build, then bundle everything into one shareable `dist/preview.html` |
| `npm run sync:pubs` | Fill in DOIs and PMIDs from PubMed |
| `npm run sync:pubs -- --add` | ...and append papers PubMed has that the site doesn't |
| `npm run pubs:images` | Fetch or render publication thumbnails |

## Publications maintain themselves

All papers live in `src/data/publications.json` rather than as hand-formatted text. That single
change buys quite a lot: the page is searchable and filterable, every entry links out, the
bibliography is served as machine-readable JSON at `/publications.json`, and each paper is
emitted as schema.org `ScholarlyArticle` markup.

`npm run sync:pubs` queries PubMed for `Churchman LS[Author]`, fills in DOIs and PMIDs, corrects
volume and page numbers, and reports papers PubMed knows about that the site doesn't. A GitHub
Action runs it on the 1st of each month and opens a pull request. New entries still need a human
to bold the lab members — that's the one thing the script can't infer.

## Built to be read by machines as well as people

Every page carries schema.org structured data: `ResearchOrganization` for the lab, a canonical
`Person` record for Stirling referenced by `@id` from everywhere else, `ScholarlyArticle` per
paper, `FAQPage` on Join Us, and `SoftwareApplication` + `HowTo` for GeneWalk. There's a
generated [`/llms.txt`](src/pages/llms.txt.js), a sitemap, and a `robots.txt` that explicitly
welcomes assistant crawlers.

All of it is generated from the same data that renders the site, so it can't drift out of date —
which is the usual failure mode for hand-written structured data.

## Base paths

The site has to work at a domain root (`/`) and at a GitHub Pages subpath (`/lab-website/`).
Astro rewrites asset URLs for you but not hrefs you write by hand, so **every internal link goes
through the `u()` helper** in `src/lib/path.js`:

```astro
<a href={u("/research")}>Research</a>     <!-- yes -->
<a href="/research">Research</a>          <!-- no: 404s on the Pages preview -->
```

`u()` leaves external URLs, `mailto:` and `#anchors` untouched, so it's safe to wrap everything.
`npm run check:links` catches any that were missed, and CI runs it on every pull request.

Build targets:

```bash
npm run build                                            # root-relative, local
SITE=https://churchmanlab.github.io SITE_BASE=/lab-website npm run build   # Pages
SITE=https://churchman.med.harvard.edu npm run build     # the real domain, eventually
```

## Deploying

The GitHub Actions workflow is ready, but hosted runners are not currently picking up jobs for
this repository. Until that is fixed, build the Pages version locally and publish `dist/` to the
`gh-pages` branch as described in `CLAUDE.md`.

Going live on `churchman.med.harvard.edu` is a separate decision: the domain is Harvard's, so
HMS IT would need to repoint DNS. Worth asking them before committing either way.

## Known gaps

- **Fonts are system fonts**, chosen so the preview renders without network access. A licensed
  serif would look better.
- **No dark mode** yet.

## License

Code is [MIT](LICENSE). Site content — research text, photographs, and the paintings by Leidy
Churchman — is not covered and remains the property of its owners.
