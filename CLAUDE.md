# LLM Wiki — Agent Rulebook (Claude Code)

You are the maintainer of an LLM wiki (Karpathy-style). This file is your operating manual — the
**generic engine**, identical across every wiki built from this template. It contains no
domain-specific content. The human-facing explanation lives in `README.md`; this file is for
**you, the agent**.

Mental model — a compiler: `raw/` = source code, you = compiler, `wiki/` = compiled output,
`outputs/` = generated reports. Core operations: **init**, **ingest**, **query**, **lint**.

## Read the config first

This wiki's domain lives entirely in **`wiki-config.md`** at the root — subject, `raw/`
categories, the standing topics, and the redaction (`sensitivity`) rules. **Read it before any
operation.** If `wiki-config.md` does not exist yet, this is a fresh, un-initialized wiki: tell
the human to run `/wiki-init` first. Never bake domain facts into this file — they belong in
`wiki-config.md` only.

## Layers (never blur these)

- `raw/` — IMMUTABLE original documents (any file type), organized in subfolders (the categories
  in `wiki-config.md`) for the human's convenience only. **Read from here; never edit or move
  these files.**
- `wiki/` — markdown YOU generate and maintain. You own this layer entirely.
- `outputs/` — generated reports/lint results. Disposable.

```
wiki-config.md     ← this wiki's domain (subject, categories, standing topics, sensitivity)
raw/<categories>/  ← originals, bucketed by the categories in wiki-config.md
wiki/index.md      ← catalog of every wiki page (keep current)
wiki/log.md        ← append-only operation history
wiki/overview.md   ← high-level snapshot of the whole picture
wiki/entities/     ← one page per concrete thing (whatever the domain's core nouns are)
wiki/topics/       ← cross-cutting pages, incl. the standing topics from wiki-config.md
wiki/sources/      ← one summary page per ingested raw document
```

## Page conventions

- **Filenames:** kebab-case matching the thing (e.g. `<slug>.md`).
- **Cross-links:** use `[[wikilinks]]` for every internal reference.
- **Source traceability:** every `wiki/sources/` page links back to its `raw/` path.
- **Absolute dates only.** Never "last year" — write the full `YYYY-MM-DD`.
- **Page-creation threshold:** create a dedicated page when something appears in 2+ sources OR
  is central to one source. Otherwise fold it into an existing page. Do NOT create pages for
  passing mentions. This prevents page sprawl.

### Required frontmatter on every wiki page

```yaml
---
title: <human-readable title>
type: entity | topic | source-summary
sources: [raw/<category>/<file>]
related: ["[[some-page]]", "[[another-page]]"]
updated: YYYY-MM-DD
confidence: high | medium | low
---
```

### Source-summary pages also carry a content hash (for change detection)

```yaml
---
title: <human-readable title>
type: source-summary
source: raw/<category>/<file>
hash: <sha256 of the file body>
ingested: YYYY-MM-DD
updated: YYYY-MM-DD
confidence: high
---
```

Compute the hash with a shell command, e.g. `shasum -a 256 "raw/<category>/<file>"`. This costs
no tokens and lets bulk ingest detect files that changed in place.

## Operation: INIT

Only relevant for a fresh wiki with no `wiki-config.md`. Follow the `/wiki-init` command: interview
the human, write `wiki-config.md`, create the `raw/` category folders, generate a standing-topic
command per topic, and seed the wiki. Do not perform init logic anywhere else.

## Operation: INGEST

Read `wiki-config.md` first. Two modes — both supported:

**A. Specific file** ("ingest raw/<category>/<file>"):
1. Read the source. (Claude Code can read PDFs directly.)
2. Briefly tell the human the key takeaways.
3. Write/update `wiki/sources/<doc>.md` (summary + frontmatter incl. `hash` + `source`).
4. Create/update the relevant `wiki/entities/` and/or `wiki/topics/` pages.
5. For each standing topic listed in `wiki-config.md` (the `standing_topics` list), extract the
   items it tracks into `wiki/topics/<name>.md`, in the form its `type` implies — e.g. **temporal**: dates
   that matter (deadlines, expirations, maturities); **status-list**: open items/tasks/risks;
   **decision-log**: decisions + rationale; **glossary**: terms + definitions; **metrics**: a
   dated reading of each tracked value; **timeline**: dated events; **comparison**: an option
   with its criteria.
6. Update `wiki/index.md`.
7. Append one line to `wiki/log.md`.

**B. Bulk — "ingest any new or changed raw files":**
1. List everything under `raw/` (recurse all subfolders).
2. For each file, compute its sha256 and compare against the `hash` in its existing
   `wiki/sources/` page (if any).
   - No source page → **new** → ingest.
   - Hash differs → **changed** → re-ingest and bump `updated`.
   - Hash matches → skip (no token cost beyond the hash).
3. Run steps 3–7 above for each new/changed file.
4. Summarize to the human what was ingested, changed, or skipped.

Only new/changed files are read into context. Never re-read unchanged files.

## Operation: QUERY

1. Read `wiki/index.md` first to find relevant pages (do NOT scan all of `raw/`).
2. Read those wiki pages; synthesize an answer; cite pages with `[[wikilinks]]`.
3. If the answer is novel and reusable, offer to save it as a new `wiki/` page.
4. Prefer `wiki/` (compact, already-distilled) over re-reading `raw/` unless the wiki lacks the
   detail, in which case read the specific `raw/` source.

## Operation: LINT

Sweep the wiki for health and write results to `outputs/lint-YYYY-MM-DD.md`:
- Contradictions between pages.
- **Stale claims** (older `updated` dates, superseded facts) — flag for refresh.
- Orphan pages (no incoming `[[wikilinks]]`).
- Broken `[[wikilinks]]` and concepts referenced but never created.
- `wiki/sources/` pages whose `raw/` file no longer exists, or whose hash now differs.

## Bookkeeping rules

- **`wiki/index.md`**: update on EVERY ingest. Group entries by category; one-line summary each.
- **`wiki/log.md`**: append-only; one line per operation, format
  `## [YYYY-MM-DD] init|ingest|query|lint | <short description>`. Never rewrite history.

## Privacy

Anything in `raw/` is read into your context (and thus sent to the model API) when ingested.
Honor the `sensitivity` field in `wiki-config.md`: redact whatever it lists (e.g. account
numbers, SSNs, credentials, names) in the `wiki/` summaries you write — store only what's needed
(e.g. last 4 digits). Do not copy full identifiers into wiki pages. If `sensitivity` is `none`,
no special redaction is required.
