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
  "photo": "/1234567890-ABCDEFG/photo.JPG"
}
```

`photo` is the path after the CDN prefix. Until the images are migrated off Squarespace, get it
by right-clicking a photo on the current site, copying the image address, and taking everything
after `.../5ec5b23719ae3633499776a3`.

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
`npm run sync:pubs` fills them in. Add `"highlight": true` to give it a "Key paper" tag and
include it in `llms.txt`. `*` marks equal authorship and `#` co-corresponding, exactly as on the
old site; put them immediately after the closing asterisks, like `**Ietswaart R**#*`.

### Wording on a page

Each page is one file in `src/pages/`. The words are plain HTML — you can safely edit anything
between the tags without knowing Astro. Don't touch the block between the `---` markers at the
top unless you mean to.

### Recruitment status

`src/pages/join.astro`. Anything still marked `TO CONFIRM` in a yellow highlight needs a real
answer; search the file for that phrase. The `faqs` array near the top of that file feeds both
the visible questions at the bottom of the page **and** the structured data that AI assistants
read, so keep the answers accurate — an assistant will repeat them verbatim.

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
