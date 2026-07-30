/**
 * Render the guides in `docs/guides/` into pages on the website.
 *
 *   npm run gen:docs
 *
 * **Run it by hand and commit the output.** There is no build step on the
 * server and none in CI: `website/` is a folder of static files that gets
 * tarred up and unpacked on an nginx container, and that stays true. The
 * markdown is the source; these pages are a rendering of it.
 *
 * Deliberately small. The Yggdrasil panel has a real generator — sections,
 * search index, lightbox — and its author's advice was not to build one until
 * the maintenance hurts, because the source (plain markdown, no frontmatter)
 * is identical before and after. Two guides is not that day.
 *
 * `website/docs/` is generated. Do not edit it by hand; the next run overwrites
 * whatever is there.
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { marked } from "marked";

const ROOT = process.cwd();
const OUT = join(ROOT, "website", "docs");
const REPO = "https://github.com/kristianwind/uruz/blob/main";

/** The pages that go on the site, in the order they appear in the nav. */
const PAGES = [
  {
    src: "docs/guides/using-uruz.md",
    out: "using-uruz.html",
    nav: "Using Uruz",
    title: "Using Uruz — for the person training",
    description:
      "How to sign in, install Uruz on your phone, log a workout, correct a set, use the archive, build your own workouts, and get your data out.",
  },
  {
    src: "docs/guides/self-hosting.md",
    out: "self-hosting.html",
    nav: "Hosting it yourself",
    title: "Hosting Uruz yourself — the operator's guide",
    description:
      "Three ways to run Uruz, being reachable over HTTPS, email, the AI coach, notifications, backup, updating, and the traps that are easy to fall into.",
  },
] as const;

/**
 * Links that mean something in the repository but nothing on the site.
 *
 * A guide is read in both places, so a relative path to a file that only
 * exists in the repository has to become a link *to* the repository. Anything
 * not listed here and not ending in `.md` is left alone.
 */
const LINK_MAP: Record<string, string> = {
  "using-uruz.md": "using-uruz.html",
  "self-hosting.md": "self-hosting.html",
  "../../LICENSE": `${REPO}/LICENSE`,
  "../../yggdrasil/uruz.yaml": `${REPO}/yggdrasil/uruz.yaml`,
  "../ARCHITECTURE.md": `${REPO}/ARCHITECTURE.md`,
  "../DECISIONS.md": `${REPO}/DECISIONS.md`,
  "../HANDOFF.md": `${REPO}/HANDOFF.md`,
  "COMMERCIAL.md": `${REPO}/docs/COMMERCIAL.md`,
  "../yggdrasil/README.md": `${REPO}/yggdrasil/README.md`,
  "../website/README.md": `${REPO}/website/README.md`,
};

/**
 * GitHub's heading slugs, not the markdown library's.
 *
 * The same file renders here and on GitHub, so one `#anchor` has to land in
 * both places. GitHub lowercases, drops punctuation entirely, and turns each
 * space into a hyphen — note that those are different rules: `Copy & paste`
 * becomes `copy--paste`, with two hyphens, because the ampersand vanishes and
 * both spaces survive.
 */
function githubSlug(text: string): string {
  return text
    .trim()
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s/g, "-");
}

const escapeHtml = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

interface Heading {
  text: string;
  slug: string;
}

function render(markdown: string): { html: string; headings: Heading[] } {
  const headings: Heading[] = [];

  const renderer = new marked.Renderer();
  renderer.heading = ({ tokens, depth }) => {
    // The heading's own text, without the markup inside it.
    const text = tokens.map((t) => ("text" in t ? String(t.text) : "")).join("");
    const slug = githubSlug(text);
    if (depth === 2) headings.push({ text, slug });
    const inner = marked.parseInline(
      tokens.map((t) => ("raw" in t ? String(t.raw) : "")).join(""),
    );
    return `<h${depth} id="${slug}">${inner}</h${depth}>\n`;
  };

  const original = renderer.link.bind(renderer);
  renderer.link = (token) => {
    const mapped = LINK_MAP[token.href];
    if (mapped) token.href = mapped;
    return original(token);
  };

  const html = marked.parse(markdown, { renderer, async: false }) as string;
  return { html, headings };
}

function page(
  meta: (typeof PAGES)[number],
  body: string,
  headings: Heading[],
  others: typeof PAGES,
): string {
  const nav = others
    .map((p) =>
      p.out === meta.out
        ? `<b aria-current="page">${p.nav}</b>`
        : `<a href="${p.out}">${p.nav}</a>`,
    )
    .join("\n        ");

  const toc = headings
    .map((h) => `<li><a href="#${h.slug}">${escapeHtml(h.text)}</a></li>`)
    .join("\n          ");

  return `<!doctype html>
<html lang="en" class="no-js">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(meta.title)} · Uruz ᚢ</title>
<meta name="description" content="${escapeHtml(meta.description)}">
<meta name="theme-color" content="#0b1016">
<meta property="og:title" content="${escapeHtml(meta.title)}">
<meta property="og:description" content="${escapeHtml(meta.description)}">
<meta property="og:type" content="article">
<meta property="og:url" content="https://uruz-training.com/docs/${meta.out}">
<link rel="icon" href="../img/favicon-32.png">
<link rel="canonical" href="https://uruz-training.com/docs/${meta.out}">
<link rel="stylesheet" href="../styles.css?v=20260728b">
<link rel="stylesheet" href="docs.css?v=20260730">
<script>document.documentElement.classList.remove("no-js")</script>
</head>
<body>
<a class="skip" href="#doc">Skip to content</a>

<header class="nav">
  <div class="wrap nav-inner">
    <a class="brand" href="../"><span class="rune">ᚢ</span> Uruz</a>
    <nav class="nav-links doc-nav">
        ${nav}
    </nav>
    <div class="nav-end">
      <a class="btn ghost" href="https://github.com/kristianwind/uruz">GitHub</a>
    </div>
  </div>
</header>

<main class="wrap doc-wrap" id="doc">
  <nav class="doc-toc" aria-label="On this page">
    <p class="doc-toc-title">On this page</p>
    <ul>
          ${toc}
    </ul>
  </nav>
  <article class="doc">
${body}
    <hr>
    <p class="doc-foot">
      This page is generated from
      <a href="${REPO}/${meta.src}"><code>${meta.src}</code></a>.
      Corrections are welcome as a pull request.
    </p>
  </article>
</main>

<footer>
  <div class="wrap foot-grid">
    <div>
      <div class="brand" style="margin-bottom:6px"><span class="rune">ᚢ</span> Uruz</div>
      <div>Build strength, one rune at a time.</div>
    </div>
    <div style="text-align:right">
      <a href="https://github.com/kristianwind/uruz">GitHub</a> ·
      <a href="https://yggdrasilpanel.com">Yggdrasil Panel</a> ·
      <a href="../">Home</a>
    </div>
  </div>
  <div class="wrap">
    <p class="foot-note">
      ⚠️ Early development &amp; built with Claude Code. Provided as-is, with no warranty and no liability whatsoever — you use it entirely at your own risk. Free software under <a href="${REPO}/LICENSE">AGPL-3.0</a>.
    </p>
  </div>
</footer>
</body>
</html>
`;
}

mkdirSync(OUT, { recursive: true });
for (const meta of PAGES) {
  const markdown = readFileSync(join(ROOT, meta.src), "utf8");
  const { html, headings } = render(markdown);
  writeFileSync(join(OUT, meta.out), page(meta, html, headings, PAGES));
  console.log(`  ✓ website/docs/${meta.out}  (${headings.length} sections)`);
}
console.log("\n✔ Generated. Commit the result — the site has no build step.");
