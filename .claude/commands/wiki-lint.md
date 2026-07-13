---
description: Health-check the wiki — contradictions, stale facts, orphans, broken links, hash mismatches, category drift. Use for any request to check, audit, or lint the wiki.
---

**Guard:** if `wiki-config.md` does not exist, STOP — this wiki isn't initialized. Tell the human
to run `/wiki-init` first, and do nothing else.

This file is the single source of truth for the LINT operation. Sweep the wiki and write the
findings to `outputs/lint-<today>.md`:

- Contradictions between pages.
- **Stale claims** (older `updated` dates, superseded facts) — flag for refresh.
- Orphan pages (no incoming `[[wikilinks]]`).
- Broken `[[wikilinks]]` and concepts referenced but never created.
- Missing required frontmatter on content pages (`wiki/entities/`, `wiki/topics/`,
  `wiki/sources/`) — the bookkeeping pages (`index.md`, `log.md`, `overview.md`) are exempt.
- `wiki/sources/` pages whose `raw/` file no longer exists, or whose hash now differs.
- **Category drift** — only **top-level** folders under `raw/` are categories; deeper nesting
  is the human's filing structure and is never drift:
  - a top-level `raw/` subfolder not listed in `raw_categories` (unregistered category — if it
    has files, suggest `/wiki-ingest`, which registers it; if empty, note it as informational
    since it self-registers on first ingest);
  - a category in `raw_categories` whose `raw/` folder is missing;
  - a category in `raw_categories` with no heading in `wiki/index.md`.

Lint is **report-only**: it never edits the wiki or the config. Write the report, then give the
human a short summary of what needs attention — do not auto-fix without telling them first.
