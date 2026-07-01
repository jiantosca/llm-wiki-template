---
description: Health-check the wiki for contradictions, stale facts, orphans, and broken links
disable-model-invocation: true
---

**Guard:** if `wiki-config.md` does not exist, STOP — this wiki isn't initialized. Tell the human
to run `/wiki-init` first, and do nothing else.

Follow the LINT workflow in `CLAUDE.md`.

Scan all `wiki/` pages for: contradictions, stale claims (old `updated` dates / superseded
facts), orphan pages (no incoming `[[wikilinks]]`), broken wikilinks, concepts referenced but
never created, and `wiki/sources/` pages whose `raw/` file is missing or whose hash now differs.

Write the results to `outputs/lint-<today>.md` and give me a short summary of what needs
attention. Do not auto-fix without telling me first.
