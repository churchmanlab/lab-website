#!/usr/bin/env node
/**
 * Fails if British spellings appear in site prose.
 *
 * The lab is American and the published papers use American spelling, but the site was
 * drafted in a mix of both and "programme"/"localisation"/"neighbouring" kept reappearing.
 * A note in CONTRIBUTING.md is easy to miss; this is the part that actually holds.
 *
 * Deliberately NOT checked: src/data/publications.json. Paper titles and journal names are
 * quotations — "Nature Reviews Molecular Cell Biology" and a title that really does read
 * "colour" must stay exactly as published.
 */
import { readdir, readFile } from "node:fs/promises";
import { resolve, dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, "..");

const SEARCH = ["src/pages", "src/layouts", "src/components", "src/lib", "src/styles", "src/data"];
const ALSO = ["README.md"];

// publications.json: paper titles and journal names are quotations, see header comment.
// CONTRIBUTING.md / CLAUDE.md: these documents state the rule, so they necessarily spell out
// the British forms as counterexamples. Checking them would make the rule unstateable.
const SKIP_FILES = ["src/data/publications.json", "CONTRIBUTING.md", "CLAUDE.md"];

// british -> american. Order matters only for readability; each is matched whole-word,
// case-insensitively, and the replacement preserves the original's leading capital.
const PAIRS = [
  // -ise / -isation
  ["organisation", "organization"], ["organisations", "organizations"],
  ["organise", "organize"], ["organised", "organized"], ["organising", "organizing"],
  ["recognise", "recognize"], ["recognised", "recognized"], ["recognising", "recognizing"],
  ["localise", "localize"], ["localised", "localized"], ["localising", "localizing"],
  ["localisation", "localization"],
  ["polarise", "polarize"], ["polarised", "polarized"], ["polarisation", "polarization"],
  ["synchronise", "synchronize"], ["synchronised", "synchronized"],
  ["synchronisation", "synchronization"],
  ["normalise", "normalize"], ["normalised", "normalized"], ["normalisation", "normalization"],
  ["characterise", "characterize"], ["characterised", "characterized"],
  ["characterisation", "characterization"],
  ["summarise", "summarize"], ["summarised", "summarized"],
  ["emphasise", "emphasize"], ["emphasised", "emphasized"],
  ["minimise", "minimize"], ["minimised", "minimized"],
  ["maximise", "maximize"], ["maximised", "maximized"],
  ["optimise", "optimize"], ["optimised", "optimized"], ["optimisation", "optimization"],
  ["prioritise", "prioritize"], ["prioritised", "prioritized"],
  ["standardise", "standardize"], ["standardised", "standardized"],
  ["utilise", "utilize"], ["utilised", "utilized"],
  ["visualise", "visualize"], ["visualised", "visualized"], ["visualisation", "visualization"],
  ["specialise", "specialize"], ["specialised", "specialized"],
  ["generalise", "generalize"], ["generalised", "generalized"],
  ["hypothesise", "hypothesize"], ["hypothesised", "hypothesized"],
  ["stabilise", "stabilize"], ["stabilised", "stabilized"],
  ["sensitise", "sensitize"], ["sensitised", "sensitized"],

  // -yse (note: analysis / catalysis / paralysis are correct everywhere and are NOT listed)
  ["analyse", "analyze"], ["analysed", "analyzed"], ["analysing", "analyzing"],
  ["catalyse", "catalyze"], ["catalysed", "catalyzed"],
  ["hydrolyse", "hydrolyze"], ["hydrolysed", "hydrolyzed"],
  ["paralyse", "paralyze"], ["paralysed", "paralyzed"],

  // -our
  ["colour", "color"], ["colours", "colors"], ["coloured", "colored"],
  ["behaviour", "behavior"], ["behaviours", "behaviors"], ["behavioural", "behavioral"],
  ["neighbour", "neighbor"], ["neighbours", "neighbors"], ["neighbouring", "neighboring"],
  ["favour", "favor"], ["favoured", "favored"], ["favourable", "favorable"],
  ["labour", "labor"], ["honour", "honor"], ["humour", "humor"], ["rumour", "rumor"],
  ["endeavour", "endeavor"], ["harbour", "harbor"], ["vapour", "vapor"],
  ["flavour", "flavor"], ["odour", "odor"], ["tumour", "tumor"], ["tumours", "tumors"],

  // -re
  ["centre", "center"], ["centres", "centers"], ["centred", "centered"],
  ["fibre", "fiber"], ["fibres", "fibers"],
  ["metre", "meter"], ["metres", "meters"], ["litre", "liter"], ["litres", "liters"],
  ["theatre", "theater"], ["calibre", "caliber"], ["spectre", "specter"],

  // doubled consonants
  ["travelled", "traveled"], ["travelling", "traveling"], ["traveller", "traveler"],
  ["cancelled", "canceled"], ["cancelling", "canceling"],
  ["labelled", "labeled"], ["labelling", "labeling"],
  ["modelled", "modeled"], ["modelling", "modeling"],
  ["signalled", "signaled"], ["signalling", "signaling"],
  ["fuelled", "fueled"], ["totalled", "totaled"], ["marvelled", "marveled"],

  // medical / biological
  ["haemoglobin", "hemoglobin"], ["haem", "heme"], ["anaemia", "anemia"],
  ["anaemic", "anemic"], ["oedema", "edema"], ["oesophagus", "esophagus"],
  ["foetal", "fetal"], ["foetus", "fetus"], ["paediatric", "pediatric"],
  ["coeliac", "celiac"], ["leukaemia", "leukemia"], ["diarrhoea", "diarrhea"],
  ["sulphur", "sulfur"], ["sulphide", "sulfide"], ["aluminium", "aluminum"],

  // misc
  ["programme", "program"], ["programmes", "programs"],
  ["grey", "gray"], ["defence", "defense"], ["offence", "offense"],
  ["licence", "license"], ["practise", "practice"], ["storey", "story"],
  ["whilst", "while"], ["amongst", "among"],
  ["learnt", "learned"], ["spelt", "spelled"], ["dreamt", "dreamed"], ["burnt", "burned"],
  ["ageing", "aging"], ["judgement", "judgment"], ["acknowledgement", "acknowledgment"],
  ["enquiry", "inquiry"], ["enquiries", "inquiries"], ["sceptic", "skeptic"],
  ["sceptical", "skeptical"], ["draught", "draft"], ["plough", "plow"],
  ["mould", "mold"], ["moulding", "molding"], ["smoulder", "smolder"],
  ["cheque", "check"], ["kerb", "curb"], ["tyre", "tire"],
  ["manoeuvre", "maneuver"], ["catalogue", "catalog"], ["dialogue", "dialog"],
  ["analogue", "analog"], ["encyclopaedia", "encyclopedia"],
];

// Sort longest-first so "organisations" is reported before "organisation".
const SORTED = [...PAIRS].sort((a, b) => b[0].length - a[0].length);

async function walk(dir) {
  const out = [];
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return out; // directory is optional
  }
  for (const e of entries) {
    const p = join(dir, e.name);
    if (e.isDirectory()) out.push(...(await walk(p)));
    else if (/\.(astro|js|mjs|ts|json|md|css)$/.test(e.name)) out.push(p);
  }
  return out;
}

const files = [];
for (const d of SEARCH) files.push(...(await walk(resolve(ROOT, d))));
for (const f of ALSO) files.push(resolve(ROOT, f));

const skip = new Set(SKIP_FILES.map((f) => resolve(ROOT, f)));
const hits = [];

for (const file of files) {
  if (skip.has(file)) continue;
  let text;
  try {
    text = await readFile(file, "utf8");
  } catch {
    continue;
  }
  const lines = text.split("\n");
  lines.forEach((line, i) => {
    for (const [brit, amer] of SORTED) {
      const re = new RegExp(`\\b${brit}\\b`, "gi");
      let m;
      while ((m = re.exec(line)) !== null) {
        hits.push({
          file: relative(ROOT, file),
          line: i + 1,
          found: m[0],
          want: amer,
          context: line.trim().slice(0, 100),
        });
      }
    }
  });
}

console.log(`Checked ${files.length - skip.size} file(s) for British spellings.`);

if (hits.length) {
  console.error(`\n${hits.length} British spelling(s) found:\n`);
  for (const h of hits) {
    console.error(`  ${h.file}:${h.line}  "${h.found}" → "${h.want}"`);
    console.error(`    ${h.context}`);
  }
  console.error(`\nThe site uses American spelling throughout. See CONTRIBUTING.md.`);
  process.exit(1);
}
console.log("\nNo British spellings found.");
