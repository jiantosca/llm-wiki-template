# Plugin migration: shipping the engine as a Claude Code plugin

> **Status: design note / proposed — NOT yet implemented.** Today this template is distributed by
> **copying the repo** (`cp -R`). This note captures what changes if we instead ship the engine as
> a Claude Code plugin. Revisit before implementing.

## Why consider it

Copy-the-repo works, but every wiki carries its own frozen copy of the engine — so improvements to
`CLAUDE.md`, the commands, or the hook don't propagate to wikis already created. A **plugin** lets
the engine live in one installable place and update independently, while each wiki is just a
data-only folder that consumes it.

This is exactly the payoff of the seam we already built: **engine vs. `wiki-config.md` (config)
vs. derived**. Because no domain facts live in the engine, the engine is cleanly extractable into a
plugin. (See the same reasoning in `harvesting.md`.)

## What a plugin changes

### 1. Distribution model
- **Copy mode (today):** engine + empty skeleton are copied together; a new wiki *is* the copied
  folder.
- **Plugin mode:** the engine (commands, hook, rulebook) installs as a plugin. A new wiki is a
  fresh, empty data folder that the plugin operates on.

### 2. The git-reset step (Step 6 of `/wiki-init`) goes away
The inherited-`.git/` problem is purely an artifact of `cp -R`. A plugin isn't copied into the
wiki, so there's no template history to inherit. Step 6 either disappears or shrinks to a trivial
"offer to `git init` a fresh repo."

### 3. `/wiki-init` must scaffold the whole base tree (new responsibility)
Right now the folder skeleton ships *in the copy*: `wiki/{entities,topics,sources}/`, the seed
`index.md` / `log.md` / `overview.md`, and the `.gitkeep`s. A plugin install does **not** create a
data folder — so init grows the job of building that base tree itself, not just the category
subfolders. Net: simpler distribution, but init does more.

### 4. Where does the rulebook (`CLAUDE.md`) live? (open question)
Today `CLAUDE.md` auto-loads as project memory and every command says "follow the … workflow in
`CLAUDE.md`." A plugin provides commands, hooks, subagents, and skills — so the operating manual
needs a home. Options to evaluate:
- **(a)** `/wiki-init` writes a `CLAUDE.md` into the new wiki folder from a plugin-bundled template
  (keeps the "rules are right there in the folder" property; but it's copied again, so engine
  updates to the rulebook wouldn't propagate — partial regression).
- **(b)** Move the operating manual into a **skill** the commands invoke (updates propagate; but
  the rules are less visible in the folder).
- **(c)** Inline the full workflow into each command file (self-contained; some duplication).
  Leaning (b) or a hybrid — verify how plugin-provided context/skills load before deciding.

### 5. The hook and `settings.json`
The `require-init` hook + `.claude/settings.json` currently ship per-wiki. A plugin can provide
hooks centrally, so the enforcement layer would come from the plugin rather than a settings file in
every wiki. Confirm plugin hook registration semantics before relying on this.

## What stays the same
- `wiki-config.md` remains the per-wiki, user-owned domain config (written by init).
- The derived standing-topic commands are still generated per-wiki by init.
- The compiler mental model and the ingest/query/lint/harvest operations are unchanged.

## Open decisions (revisit before implementing)
1. Rulebook hosting — option (a) / (b) / (c) above.
2. Whether to keep supporting copy-mode alongside the plugin (dual distribution) or migrate fully.
3. How init detects plugin-mode vs. copy-mode (e.g. presence of the skeleton) to know whether to
   scaffold the base tree and whether to run the git-reset step.
