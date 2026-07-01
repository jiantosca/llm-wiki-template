# LLM Wiki — Template

A reusable starting point for a self-maintaining, Karpathy-style LLM wiki. You drop documents
into `raw/`, and Claude Code reads them and maintains a distilled, cross-linked set of markdown
pages in `wiki/`. Then you ask questions and get answers grounded in **your own documents**.

This repo is the **template**: a generic engine with no domain baked in. You spin up a real wiki
from it in one step — `/wiki-init` — which interviews you and configures everything for your
subject (personal records, a research area, a project, a product — anything).

---

## Spin up a new wiki

```bash
cp -R llm-wiki-template ~/my-new-wiki    # copy the template
cd ~/my-new-wiki && claude               # open Claude here
```

Then, in Claude:

```
/wiki-init
```

It asks five things — **subject**, **`raw/` categories**, a **standing topic** (the one recurring
thing worth its own page + command, e.g. renewals / open-questions / decisions / none),
**sensitivity** (what to redact), and whether to **commit `raw/`** to git or keep it ignored —
then writes `wiki-config.md`, creates your `raw/` folders,
generates a standing-topic command tailored to your choice, and seeds the wiki. It also offers to
**reset git history** (a `cp -R` copy inherits the template's `.git/`) so your wiki starts its own
clean history — it asks first, since that's destructive. Done.

From then on:

- Drop files anywhere under `raw/`, then `/wiki-ingest` — process everything new or changed.
- **Just type your question** — it's answered from your wiki, with citations. No command needed.
- `/wiki-<your-standing-topic>` — the command init generated for you (e.g. `/wiki-renewals`).
- `/wiki-lint` — periodic health check (contradictions, stale facts, broken links).

---

## The three layers (why this template is structured the way it is)

| Layer                                   | Files                                                                                          | Who owns it                                |
| --------------------------------------- | ---------------------------------------------------------------------------------------------- | ------------------------------------------ |
| **Engine** (generic, reusable)          | `CLAUDE.md`, `.claude/commands/wiki-{init,ingest,query,lint}.md`                               | the template — never contains domain facts |
| **Config** (your domain, written once)  | `wiki-config.md`                                                                               | `/wiki-init` writes it                     |
| **Derived** (generated for your domain) | `.claude/commands/wiki-<standing-topic>.md`, `raw/<category>/` folders, seeded `wiki/index.md` | `/wiki-init` generates it                  |

Keeping domain out of `CLAUDE.md` and in `wiki-config.md` is deliberate: the engine stays
identical across every wiki, so it can be improved (or one day shipped as a Claude Code plugin)
without disturbing anyone's domain setup. `/wiki-init` only ever touches the Config and Derived
layers — never the engine.

---

## Folder structure

```
llm-wiki-template/
├── CLAUDE.md                ← agent rulebook / engine (auto-loads when you run Claude here)
├── README.md                ← this file (for you)
├── wiki-config.md           ← created by /wiki-init (your domain lives here)
├── .gitignore               ← excludes raw/ & outputs/ from git
│
├── raw/                     ← YOUR ORIGINAL DOCS. Claude reads, never edits.
│                              (category subfolders are created by /wiki-init)
├── wiki/                    ← Claude-GENERATED summaries (what you query)
│   ├── index.md   log.md   overview.md
│   ├── entities/            ← one page per concrete thing
│   ├── topics/              ← cross-cutting pages, incl. your standing topic
│   └── sources/             ← one summary per ingested raw document
│
├── outputs/                 ← generated reports & lint results (disposable)
└── .claude/commands/        ← the /wiki-* slash commands
```

**Mental model — a compiler:** `raw/` = source code, Claude = compiler, `wiki/` = compiled
output. Operations: **init**, **ingest**, **query**, **lint**.

---

## Conventions (enforced by CLAUDE.md)

- **Filenames:** kebab-case. **Cross-links:** `[[wikilinks]]`. **Absolute dates** always.
- **Page-creation threshold:** a page is created only when something shows up in 2+ sources or is
  central to one — prevents page sprawl.
- **Frontmatter** on every page (`title, type, sources, related, updated, confidence`).
- **Change detection via content hash:** each `wiki/sources/` page stores the sha256 of its raw
  file, so `/wiki-ingest` reliably re-processes edited files — at zero token cost for unchanged
  ones (hashing runs in the shell, not the model).

## Privacy

Ingest sends a document to the model API once (to summarize it); after that, queries only touch
the redacted `wiki/` summaries. `/wiki-init` records what to redact in `wiki-config.md`'s
`sensitivity` field, and the engine honors it. `raw/` and `outputs/` are git-ignored, so
originals and reports can't be committed. Back up your wiki — it's important personal data.

---

## Enforcement & first run

The wiki refuses `/wiki-ingest`, `/wiki-query`, and `/wiki-lint` until you've run `/wiki-init`
(so you can't accidentally ingest into an un-configured wiki). This is enforced two ways:

- **Command guards** (works everywhere): each command checks for `wiki-config.md` and stops if
  it's missing. This also catches plain-English requests like "ingest my files."
- **A hook** (`.claude/hooks/require-init.js`, wired in `.claude/settings.json`): the harness
  hard-blocks the slash commands if `wiki-config.md` is absent. **The first time you open a new
  wiki, Claude Code asks you to approve the project hook — that's expected and one-time.**

`wiki-config.md`'s existence is the "is this initialized?" flag — no separate state.

> **Cross-platform:** both layers run on macOS, Linux, and Windows. The hook is written in
> Node.js — the runtime Claude Code already requires — so it needs no bash, shell, or extra
> install. (If you ever hit an issue on native Windows, confirm `node` is on PATH and that the
> `$CLAUDE_PROJECT_DIR` reference in `.claude/settings.json` expands in your shell.)

---

## Sources

- [Karpathy's original gist (llm-wiki)](https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f)
- [Claude Code — slash commands docs](https://code.claude.com/docs/en/slash-commands)
