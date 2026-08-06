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

Want to edit content without running anything? See [CONTRIBUTING.md](CONTRIBUTING.md) — most
changes are one field in a JSON file and can be made entirely on github.com.

## What's here

```
src/
  data/            the content that changes most — edit these first
    publications.json    62 papers; kept current by scripts/sync-publications.mjs
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
```

## Commands

| Command | What it does |
| --- | --- |
| `npm run dev` | Local dev server with live reload |
| `npm run build` | Static build into `dist/` |
| `npm run check:links` | Verifies every internal link resolves |
| `npm run preview:file` | Build, then bundle everything into one shareable `dist/preview.html` |
| `npm run sync:pubs` | Fill in DOIs and PMIDs from PubMed |
| `npm run sync:pubs -- --add` | ...and append papers PubMed has that the site doesn't |

## Publications maintain themselves

All papers live in `src/data/publications.json` rather than as hand-formatted text. That single
change buys quite a lot: the page is searchable and filterable, every entry links out, the
bibliography is served as machine-readable JSON at `/publications.json`, and each paper is
emitted as schema.org `ScholarlyArticle` markup.

`npm run sync:pubs` queries PubMed for `Churchman LS[Author]`, fills in DOIs and PMIDs, corrects
volume and page numbers, and reports papers PubMed knows about that the site doesn't. A GitHub
Action runs it on the 1st of each month and opens a pull request. New entries still need a human
to bold the lab members — that's the one thing the script can't infer.

> Most entries currently link to a PubMed title search rather than a canonical DOI, because the
> environment this was built in had no access to NCBI. One `npm run sync:pubs` fixes all of them.

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

Pushing to `main` builds and publishes to GitHub Pages automatically. One-time setup in repo
**Settings → Pages → Source: GitHub Actions**. Pull requests build and link-check but don't
publish.

For the monthly publication sync to open pull requests, also enable **Settings → Actions →
General → Allow GitHub Actions to create and approve pull requests**.

Going live on `churchman.med.harvard.edu` is a separate decision: the domain is Harvard's, so
HMS IT would need to repoint DNS. Worth asking them before committing either way.

## Known gaps

- **Images and PDFs are still hotlinked to Squarespace.** Fine while that subscription is
  active; they vanish the day it lapses. Before going live, download them into `public/images/`
  and update the `img()` helper at the top of each page. Same for the protocol PDFs and code
  files under `churchman.med.harvard.edu/s/`.
- **`TO CONFIRM` markers on the Join Us page** need real answers — number of positions, whether
  you take undergraduates, funding for postdocs without a fellowship, visa sponsorship, and your
  actual review timeline. Search `src/pages/join.astro` for the phrase.
- **Lab manager mismatch.** The team page says Mike Kourkoulakos; the old contact page said
  Maddie Flanagan. This repo uses the former.
- **Fonts are system fonts**, chosen so the preview renders without network access. A licensed
  serif would look better.
- **No dark mode** yet.

## License

Code is [MIT](LICENSE). Site content — research text, photographs, and the paintings by Leidy
Churchman — is not covered and remains the property of its owners.
