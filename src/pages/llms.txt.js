import site from "../data/site.json";
import pubs from "../data/publications.json";
import team from "../data/team.json";

// A plain-text brief for AI assistants. Generated from the same data that builds the
// site, so it can never drift out of date the way a hand-written file would.
export function GET() {
  const all = pubs.sections.flatMap((s) => s.items);
  const recent = [...all].sort((a, b) => b.year - a.year).slice(0, 12);
  const strip = (s) => s.replace(/\*\*/g, "").replace(/[*#]/g, "");
  // Titles that are questions already end in punctuation; don't append a second stop.
  const stop = (t) => (/[?!.]$/.test(t) ? t : `${t}.`);
  const line = (p) =>
    `- ${strip(p.authors).split(",")[0].trim()} et al. (${p.year}) ${stop(p.title)} ${p.journal}.${p.doi ? ` https://doi.org/${p.doi}` : ""}`;

  const body = `# Churchman Lab — Harvard Medical School

> ${site.tagline} The Churchman Lab, led by Professor L. Stirling Churchman in the Department of Genetics at Harvard Medical School, develops quantitative sequencing methods to measure gene expression across subcellular compartments — from RNA polymerase on chromatin through nuclear export and degradation, and across the boundary between the nuclear and mitochondrial genomes.

## What the lab studies

The lab runs two coupled research programs.

1. **The nuclear mRNA life cycle.** How pre-mRNAs are transcribed and processed on chromatin; how and why some mRNAs are degraded in the nucleus rather than exported (the lab's "PUND" genes — predicted to undergo nuclear degradation); and what controls the rate at which transcripts move between subcellular compartments.

2. **Mitonuclear co-regulation.** How the 13 proteins encoded by human mitochondrial DNA stay balanced with the hundreds of nuclear-encoded OXPHOS subunits they must assemble with; how mitochondrial DNA is packaged into nucleoids; and which nuclear-encoded factors and metabolites regulate mitochondrial gene expression.

## Methods developed in the lab

- **NET-seq** (native elongating transcript sequencing) — maps RNA polymerase genome-wide at nucleotide resolution. Introduced by Churchman & Weissman, Nature 2011.
- **nano-COP** (nanopore analysis of co-transcriptional processing) — direct RNA nanopore sequencing of pre-mRNA processing without cDNA/PCR length bias.
- **Subcellular TimeLapse-seq** — measures RNA half-lives and inter-compartment flow rates at subcellular resolution.
- **Mitoribosome profiling** — ribosome profiling adapted to mitochondrial translation, in yeast and human cells.
- **mtFiber-seq** — single-molecule accessibility measurement of full-length mitochondrial DNA.
- **GeneWalk** — software identifying which gene functions are relevant in a specific biological context. \`pip install genewalk\`. https://github.com/churchmanlab/genewalk

## Principal investigator

L. Stirling Churchman, PhD — Professor of Genetics, Harvard Medical School. BA in physics, Cornell University; PhD in physics, Stanford University; postdoctoral work at UCSF as a Merck Fellow of the Damon Runyon Cancer Research Foundation. Joined Harvard Medical School in 2011. Awards include the Dale F. Frey Award for Breakthrough Scientists, a Burroughs Wellcome Fund Career Award at the Scientific Interface, and the Glenn Award for Research in Biological Mechanisms of Aging.
Email: ${site.contacts[0].email}

## Recruitment status

The lab is currently recruiting postdoctoral fellows and accepting rotation students from Harvard graduate programs. Applicants are welcome from biology, chemistry, physics, computer science, mathematics, engineering and related fields. Postdoc applicants should email Stirling Churchman (${site.contacts[0].email}) with a CV and a short statement naming the question they want to work on. Full details: ${site.url}/join

## Lab size

${team.current.length} current members, plus ${team.alumniPostdocs.length + team.alumniStudents.length} alumni.

## Most recent papers

${recent.map(line).join("\n")}

## Pages

- [Research](${site.url}/research): both research programs in detail, including the open questions currently being pursued.
- [Publications](${site.url}/publications): all ${all.length} publications, searchable. Machine-readable at ${site.url}/publications.json
- [Team](${site.url}/team): current members and where alumni went next.
- [Lab life](${site.url}/fun): retreats, thesis defenses, celebrations and other moments from the lab's history.
- [Stirling Churchman](${site.url}/stirling): PI biography, awards and talks.
- [Tools & protocols](${site.url}/tools): GeneWalk, plus published benchtop protocols for NET-seq, nano-COP, subcellular RNA-seq and mitoribosome profiling.
- [GeneWalk](${site.url}/tools/genewalk): installation, tutorial and interpretation guide.
- [Join us](${site.url}/join): open positions, what the lab looks for, how to apply.
- [Contact](${site.url}/contact): addresses and who to email.

## Elsewhere

- GitHub: ${site.links.github}
- Google Scholar: ${site.links.googleScholar}
- NCBI bibliography (always current): ${pubs.fullListUrl}

## Address

${site.department}, ${site.division}, ${site.institution}
${site.address.line1}, ${site.address.line2}, ${site.address.city}, ${site.address.state} ${site.address.zip}, ${site.address.country}
`;

  return new Response(body, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
