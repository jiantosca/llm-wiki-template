---
description: Ask a question answered from the wiki (grounded in your own documents)
argument-hint: "[your question]"
disable-model-invocation: true
---

**Guard:** if `wiki-config.md` does not exist, STOP — this wiki isn't initialized. Tell the human
to run `/wiki-init` first, and do nothing else.

Follow the QUERY workflow in `CLAUDE.md`.

Question: $ARGUMENTS

Read `wiki/index.md` first to find relevant pages, read those pages, then answer — citing the
pages you used with `[[wikilinks]]`. Prefer the distilled `wiki/` pages; only open a `raw/`
source if the wiki lacks the needed detail. If the answer is novel and worth keeping, offer to
save it as a new wiki page.
