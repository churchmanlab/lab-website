# Getting this onto GitHub

This folder is already a git repository with one commit in it. Nothing is staged or half-done —
you only need to create an empty repo on GitHub and push.

**Delete this file once you've pushed.** It's scaffolding, not documentation.

---

## Step 1 — create the empty repo

Go to https://github.com/organizations/churchmanlab/repositories/new

- **Name:** `lab-website`
- **Visibility:** Public
- **Do not** tick "Add a README", "Add .gitignore", or "Choose a license" — this repo already
  has all three, and adding them creates a conflict you'd have to untangle.

If `lab-website` isn't the name you want, use another — just change `/lab-website` to match in
two places afterwards: `SITE_BASE` in `.github/workflows/deploy.yml`, and the preview URL in
`README.md`.

## Step 2 — push

In Terminal, from inside this folder:

```bash
git remote add origin https://github.com/churchmanlab/lab-website.git
git push -u origin main
```

If it asks for a password, GitHub wants a personal access token rather than your account
password — https://github.com/settings/tokens, "Generate new token (classic)", tick `repo`.
Or install the GitHub CLI (`brew install gh`), run `gh auth login` once, and it handles this.

### Prefer not to use the command line?

Download [GitHub Desktop](https://desktop.github.com), then **File → Add Local Repository**,
point it at this folder, and click **Publish repository**. Same result.

## Step 3 — turn on the preview site

In the new repo: **Settings → Pages → Source → GitHub Actions**.

Then **Settings → Actions → General**, scroll to "Workflow permissions", and tick **Allow GitHub
Actions to create and approve pull requests**. That's what lets the monthly publication sync open
a PR instead of failing.

Within a couple of minutes the site will be at:

**https://churchmanlab.github.io/lab-website/**

Every push to `main` rebuilds it. Pull requests get built and link-checked but don't publish.

## Step 4 — fix the publication links

Once, from your machine:

```bash
npm install
npm run sync:pubs
git add src/data/publications.json
git commit -m "Fill in DOIs and PMIDs from PubMed"
git push
```

This replaces the "Find on PubMed" search links with real DOIs on all 62 papers, and tells you
about anything PubMed has that the site doesn't. It couldn't be run where this was built — no
NCBI access from that environment.

---

## Then what

Open an issue for anything you want changed, or edit files directly on github.com and open a
pull request. [CONTRIBUTING.md](CONTRIBUTING.md) covers the common edits — adding a lab member,
moving someone to alumni, adding a paper by hand.

The most valuable next change is answering the five `TO CONFIRM` markers on the Join Us page.
They're all recruitment questions candidates actually have, and no lab website answers them.
