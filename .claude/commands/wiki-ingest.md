---
description: Ingest raw documents into the wiki — a specific file, or everything new/changed under raw/. Use for any request to process, ingest, or absorb documents.
argument-hint: "[optional path under raw/; omit to ingest all new or changed files]"
---

**Guard:** if `wiki-config.md` does not exist, STOP — this wiki isn't initialized. Tell the human
to run `/wiki-init` first, and do nothing else.

This file is the single source of truth for the INGEST operation. Read `wiki-config.md` first
for this wiki's categories, standing topics, and redaction rules; follow the layer rules and
page conventions in `CLAUDE.md` throughout. Redact whatever `wiki-config.md`'s `sensitivity`
field lists in everything you write.

Two modes. If an argument is given, ingest that specific file: $ARGUMENTS — otherwise run
**bulk mode** (B).

**A. Specific file:**

1. Read the source. (Claude Code can read PDFs directly.)
2. Briefly tell the human the key takeaways.
3. Write/update `wiki/sources/<doc>.md` (summary + frontmatter incl. `hash` + `source`; flat —
   pick a unique, descriptive name per the page conventions).
4. Create/update the relevant `wiki/entities/` and/or `wiki/topics/` pages.
5. For each standing topic listed in `wiki-config.md` (the `standing_topics` list), extract the
   items it tracks into `wiki/topics/<name>.md`, in the form its `type` implies — e.g.
   **temporal**: dates that matter (deadlines, expirations, maturities); **status-list**: open
   items/tasks/risks; **decision-log**: decisions + rationale; **glossary**: terms + definitions;
   **metrics**: a dated reading of each tracked value; **timeline**: dated events;
   **comparison**: an option with its criteria.
6. Update `wiki/index.md`.
7. Append one line to `wiki/log.md`.

**B. Bulk — any new or changed raw files:**

1. List everything under `raw/` (recurse all subfolders).
2. For each file, compute its sha256 and compare against the `hash` in its existing
   `wiki/sources/` page (if any).
   - No source page → **new** → ingest.
   - Hash differs → **changed** → re-ingest and bump `updated`.
   - Hash matches → skip (no token cost beyond the hash).
3. Run steps 3–7 above for each new/changed file.
4. Summarize to the human what was ingested, changed, or skipped.

Only new/changed files are read into context. Never re-read unchanged files.

**Category reconciliation (both modes).** A file's category is its **first path segment under
`raw/`** — never anything deeper. Nested folders (e.g. `raw/finance/taxes/2024/`) are the
human's own filing structure: fully supported, preserved verbatim in `source:` paths, but NEVER
registered as categories — `raw/finance/taxes/2024/w2.pdf` is category `finance`. If an
ingested file's top-level folder is not listed in `raw_categories` in `wiki-config.md`, the
human created a new category by hand — this is supported, not an error. Register it: append the
folder name to `raw_categories` (bump `updated`), add the category heading to `wiki/index.md`,
and mention the new category in your report. The plain-language route works too: if the human
asks you to "add a category", create `raw/<name>/` with a `.gitkeep` inside and make the same
config + index updates.
