import pubs from "../data/publications.json";
import site from "../data/site.json";

// Machine-readable bibliography. Anything that wants the lab's papers as data —
// an AI assistant, a departmental page, a CV generator — can read this instead of
// scraping formatted HTML.
export function GET() {
  const strip = (s) => s.replace(/\*\*/g, "");

  const items = pubs.sections.flatMap((s) =>
    s.items.map((p) => ({
      title: p.title,
      authors: strip(p.authors),
      labAuthors: [...p.authors.matchAll(/\*\*(.+?)\*\*/g)].map((m) => m[1].replace(/[*#]/g, "")),
      journal: p.journal,
      year: p.year,
      volume: p.volume ?? null,
      pages: p.pages ?? null,
      type: p.type,
      section: s.id,
      doi: p.doi,
      pmid: p.pmid,
      url: p.doi
        ? `https://doi.org/${p.doi}`
        : p.pmid
          ? `https://pubmed.ncbi.nlm.nih.gov/${p.pmid}/`
          : null,
    })),
  );

  return new Response(
    JSON.stringify(
      {
        lab: site.name,
        institution: site.institution,
        source: `${site.url}/publications`,
        fullList: pubs.fullListUrl,
        lastSynced: pubs.lastSynced,
        legend: pubs.legend,
        count: items.length,
        publications: items,
      },
      null,
      2,
    ),
    { headers: { "Content-Type": "application/json; charset=utf-8" } },
  );
}
