---
description: Ask a question answered from the wiki (grounded in your own documents)
argument-hint: "[your question]"
disable-model-invocation: true
---

**Guard:** if `wiki-config.md` does not exist, STOP — this wiki isn't initialized. Tell the human
to run `/wiki-init` first, and do nothing else.

Follow the QUERY workflow in `CLAUDE.md` — it is the single source of truth (it also handles
plain questions asked without this command, so the two paths must behave identically).

Question: $ARGUMENTS
