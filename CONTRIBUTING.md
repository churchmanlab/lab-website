# Editing the lab website

Most changes don't need you to run anything. Edit a file on github.com, describe what you
changed, and open a pull request — GitHub Actions builds it, checks every internal link, and
Stirling gets a preview to look at before it goes live.

## The things people change most

### Someone joined the lab

Edit `src/data/team.json`. Copy an existing entry in `"current"` and fill it in:

```json
{
  "name": "Your Name",
  "degree": "PhD",
  "role": "Postdoctoral Fellow",
  "detail": "PhD in Something, Some University",
  "award": "Optional fellowship name",
  "email": "your_name@hms.harvard.edu",
  "photo": "/images/team/your-name.jpg"
}
```

Export the photo at roughly 1200px on its longest edge and place it in `public/images/team/`.
The `photo` value is its site path, beginning with `/images/team/`.

Leave `degree`, `detail`, `award` and `email` out entirely if they don't apply — don't put empty
strings.

### Someone left the lab

Move their entry from `"current"` to `"alumniPostdocs"` or `"alumniStudents"`, and shorten it:

```json
{ "name": "Your Name, PhD", "now": "Assistant Professor, Somewhere", "href": "https://their-lab.org/" }
```

`href` is optional. Please do this — the alumni list is one of the most-read parts of the site
for people deciding whether to join.

### A paper came out

Usually you don't have to. A GitHub Action queries PubMed on the 1st of each month and opens a
pull request with anything new. That pull request needs one human pass: wrapping Churchman lab
members in `**double asterisks**` so they render bold, and moving the entry to the right section
if it's a review or protocol rather than a research article.

To add one by hand, edit `src/data/publications.json`:

```json
{
  "authors": "**Lab Member A**, Outside Collaborator B, **Churchman LS**",
  "title": "Title in sentence case, no trailing full stop",
  "journal": "Full journal name",
  "year": 2026,
  "volume": "84",
  "pages": "1234–1245",
  "type": "research",
  "doi": null,
  "pmid": null
}
```

`type` is `research`, `review`, `protocol` or `preprint`. Leave `doi` and `pmid` as `null` —
`npm run sync:pubs` fills them in. `*` marks equal authorship and `#` co-corresponding, exactly
as on the old site; put them immediately after the closing asterisks, like `**Ietswaart R**#*`.

### Publication images

Entries can carry a thumbnail, shown at the right of the row. Rows without one are just text —
there is no placeholder, so images can accumulate over time.

```bash
npm run pubs:images -- --dry-run  # report what is fetchable
npm run pubs:images               # fetch, render and record
```

Images come from three places, in priority order:

1. **A journal cover.** Set `"image": "/images/pubs/cover-….jpg"` and `"imageKind": "cover"` by
   hand. A cover the lab earned beats a page of text, so it always wins.
2. **A PDF you stage yourself** at `pdfs/<slug>.pdf` — the dry run prints the exact filename to
   use. This is the route for bioRxiv preprints: bioRxiv sits behind Cloudflare and answers
   scripted requests with 429, so save the PDF from your browser and drop it in.
3. **Europe PMC**, automatically, for anything with a free publisher PDF.

NIH/HHS Public Access author manuscripts are detected and skipped — their first page is a PMC
cover sheet rather than the published article. Those entries get `"noImage"` with the reason,
which also stops the script retrying them. Set `"noImage": true` by hand on anything else whose
thumbnail you don't want.

### Wording on a page

Each page is one file in `src/pages/`. The words are plain HTML — you can safely edit anything
between the tags without knowing Astro. Don't touch the block between the `---` markers at the
top unless you mean to.

### Recruitment status

Recruitment details live in `src/pages/join.astro` and the summary in `src/pages/llms.txt.js`.
Review both whenever hiring status, rotation availability, funding or the application process
changes so visitors and AI assistants receive the same answer.

### Address, emails, navigation

`src/data/site.json`. Changing `nav` changes the header everywhere.

## Running it locally, if you want to

```bash
nvm use            # or install Node 20+
npm install
npm run dev        # http://localhost:4321
```

Other commands:

```bash
npm run build              # static build into dist/
npm run check              # astro check + links + spelling, all three
npm run check:links        # verify no internal link is broken
npm run check:spelling     # verify no British spellings crept in
npm run preview:file       # build + bundle everything into one shareable HTML file
npm run sync:pubs          # pull DOIs and PMIDs from PubMed
npm run sync:pubs -- --add # ...and append papers PubMed has that the site doesn't
npm run pubs:images        # render publication thumbnails (needs `brew install poppler`)
```

## American spelling, everywhere

The site uses American spelling: `program`, not `programme`. `localization`, `organization`,
`analyze`, `visualize`, `synchronized`, `neighboring`, `color`, `fiber`, `center`, `modeled`,
`signaling`, `license`. This matches the lab's published papers, and mixing the two conventions
in one page looks careless.

This is enforced, not just requested — `npm run check:spelling` fails the build on any British
spelling it recognizes, and the deploy workflow runs it on every push and pull request. The word
list lives in `scripts/check-spelling.mjs`; add to it if you hit one it doesn't know.

Two deliberate exemptions:

- **`src/data/publications.json` is never checked.** Paper titles and journal names are
  quotations. If a paper was published with "colour" in the title, it stays "colour".
- **Words that only look British.** `analysis`, `catalysis`, `paralysis` and `organism` are
  correct American English and the checker knows to leave them alone. Same for proper nouns —
  if an institution spells itself "Centre", don't let a find-and-replace rename it.

## House rules

- One change per pull request. It makes review fast and reverting painless.
- Don't commit `dist/` or `node_modules/` — `.gitignore` covers both.
- If CI fails on `check:links`, you almost certainly wrote `href="/team"` instead of
  `href={u("/team")}`. Internal links go through the `u()` helper so they survive being served
  from a subpath. See `src/lib/path.js`.
- If CI fails on `check:spelling`, the error names the file, line and the American form to use.
- Photographs of people: ask them first.
