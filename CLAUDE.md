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
- **`wiki/sources/` is flat** — never mirror `raw/`'s folder tree; traceability lives in the
  `source:` frontmatter. Since it's flat, each source page needs a unique, descriptive name:
  when raw basenames collide (`w2.pdf` across tax years, `statement.pdf` across accounts), fold
  the distinguishing context into the name — `w2-2024.md`, `chase-statement-2026-03.md` — rather
  than mechanically concatenating the full path.
- **Cross-links:** use `[[wikilinks]]` for every internal reference.
- **Source traceability:** every `wiki/sources/` page links back to its `raw/` path.
- **Absolute dates only.** Never "last year" — write the full `YYYY-MM-DD`.
- **Page-creation threshold:** create a dedicated page when something appears in 2+ sources OR
  is central to one source. Otherwise fold it into an existing page. Do NOT create pages for
  passing mentions. This prevents page sprawl.

### Required frontmatter on every wiki page

Applies to content pages — everything under `wiki/entities/`, `wiki/topics/`, and
`wiki/sources/`. The bookkeeping pages (`wiki/index.md`, `wiki/log.md`, `wiki/overview.md`)
are exempt; lint must never flag them for missing frontmatter fields.

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

The full ingest workflow lives in **`.claude/commands/wiki-ingest.md`** — that file is the
single source of truth; do not improvise ingestion from memory. When the human asks in plain
language ("ingest my files", "process the new statements"), invoke `/wiki-ingest` — with the
file's path as the argument for a specific file, or no argument to sweep for anything new or
changed.

## Operation: QUERY

1. Read `wiki/index.md` first to find relevant pages (do NOT scan all of `raw/`).
2. Read those wiki pages; synthesize an answer; cite pages with `[[wikilinks]]`.
3. If the answer is novel and reusable, offer to save it as a new `wiki/` page.
4. Prefer `wiki/` (compact, already-distilled) over re-reading `raw/` unless the wiki lacks the
   detail, in which case read the specific `raw/` source.

## Operation: LINT

The full lint checklist lives in **`.claude/commands/wiki-lint.md`** — that file is the single
source of truth; do not improvise the checks from memory. When the human asks for a health
check in plain language ("anything stale in here?", "check the wiki"), invoke `/wiki-lint`.

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
