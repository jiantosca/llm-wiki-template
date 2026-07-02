---
description: Ingest raw documents into the wiki (a specific file, or everything new/changed)
argument-hint: "[optional path under raw/; omit to ingest all new or changed files]"
disable-model-invocation: true
---

**Guard:** if `wiki-config.md` does not exist, STOP — this wiki isn't initialized. Tell the human
to run `/wiki-init` first, and do nothing else.

Follow the INGEST workflow in `CLAUDE.md`. Read `wiki-config.md` first for this wiki's categories,
standing topics, and redaction rules.

If an argument is given, ingest that specific file: `$ARGUMENTS`

If no argument is given, run **bulk mode**: list everything under `raw/`, compute each file's
sha256, compare to the `hash` recorded in its `wiki/sources/` page, and ingest only files that
are new (no source page) or changed (hash differs). Skip unchanged files. Then report what was
ingested, changed, or skipped.

For every ingested file: write/update the `wiki/sources/` summary (with `hash` + `source`
frontmatter), update relevant `wiki/entities/` and `wiki/topics/` pages, extract items into each
standing-topic page named in `wiki-config.md` (if any), update `wiki/index.md`, and append to
`wiki/log.md`. Redact whatever `wiki-config.md`'s `sensitivity` field lists.
