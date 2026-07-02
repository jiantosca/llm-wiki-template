---
description: Initialize this wiki for a specific domain — interview, then scaffold config, folders, and standing-topic commands
argument-hint: "[optional: one-line description of the wiki's subject]"
disable-model-invocation: true
---

You are setting up a fresh LLM wiki from the template. Your job: interview the human, then write
`wiki-config.md`, create the `raw/` category folders, generate a standing-topic command per topic,
and seed the wiki. **Do NOT edit `CLAUDE.md`** — it is the generic engine and stays untouched. All
domain-specific facts go in `wiki-config.md` and the generated command only.

If `wiki-config.md` already exists, this wiki is already initialized — stop and ask the human
whether they really want to re-initialize before overwriting anything.

## Step 1 — Interview

Ask the human the following in a single message, as a short numbered list. If `$ARGUMENTS` is
non-empty, treat it as the answer to #1 and still ask 2–5. For #2 and #3, propose sensible
defaults based on the subject so they can just confirm.

1. **Subject** — what is this wiki about, in one line?
2. **`raw/` categories** — what top-level buckets should raw documents be organized into?
   (Suggest 4–6 based on the subject; let them edit.)
3. **Standing topics** — ask in plain language: *"Are there recurring things you'll want to
   check across all your documents — each gets its own page plus a quick command to pull it up?"*
   Explain briefly and give 2–3 examples drawn from THEIR subject, then offer the general menu:
   upcoming deadlines/renewals, a to-do or open-questions list, a running log of decisions, a
   glossary of terms, a tracked number over time, a timeline of events, or a comparison of
   options — or "none." They can pick as many as they want (or none). For each, let them answer
   however they like (their own name + a sentence on what it should do); **you** map each to a
   type using the catalog below. Don't make them learn the type names.
4. **Sensitivity** — is any source material sensitive? What must be redacted in wiki summaries
   (e.g. account numbers, SSNs, names, credentials), or "none"?
5. **Commit `raw/`?** — should the original documents in `raw/` be committed to git, or kept out
   of version control? Explain the trade-off briefly: **ignore** (default) keeps originals out of
   git — right when they're sensitive or you don't want them versioned; **commit** versions the
   source docs alongside the wiki — useful when `raw/` is a curated, non-secret document set (e.g.
   docs vendored from repos into an internal-only wiki) and you want reviewable diffs and full
   traceability. If they choose commit, note that actual secrets (`.env`, key/credential files,
   tokens) should still be ignored regardless.

**Wait for answers before doing anything else.**

## Standing-topic catalog

The type determines the topic page's shape AND the command you generate in Step 4. The human
picks a **name**; **you** pick the **type** from what they describe. Common mappings:

- to-dos / tasks / action-items / open-questions / risks → **status-list**
- deadlines / renewals / expirations / maturities → **temporal**
- decisions / changelog → **decision-log**
- terms / definitions / jargon → **glossary**
- balances / spend / weight / KPIs / any tracked number → **metrics**
- history / chronology / case log → **timeline**
- options / vendors / products / candidates → **comparison**

The types:

- **temporal** — dated, future-facing items. Command sorts by date, takes a window argument
  (default: next 90 days), and flags anything overdue relative to today.
- **status-list** — items with a state (this is what a to-do list is). Command groups by status
  (open / blocked / done), no date window.
- **decision-log** — past decisions with rationale. Command lists reverse-chronologically,
  showing what was decided and why.
- **glossary** — term → definition. Command looks up one term or lists all alphabetically.
- **metrics** — a value tracked over time. Command shows each metric's latest value and its change
  since the prior reading.
- **timeline** — events in the order they happened. Command lists forward-chronologically (oldest
  first) with dates.
- **comparison** — options judged across criteria. Command presents a table (options × criteria).
- **none** — the human wants no standing topics; leave `standing_topics` empty (`[]`) and
  generate no extra commands.

If a topic idea doesn't fit any of these cleanly, infer the closest command shape from its
description and note which pattern you based it on.

## Step 2 — Write `wiki-config.md`

Create it at the wiki root:

```
---
subject: <one line>
raw_categories: [<cat>, <cat>, ...]
standing_topics:                  # list of topics; use [] for none
  - name: <slug>                  # e.g. renewals, open-questions
    type: <temporal | status-list | decision-log | glossary | metrics | timeline | comparison>
  # …one entry per standing topic
sensitivity: <what to redact, or "none">
commit_raw: <true | false>        # whether raw/ is version-controlled (see Step 3)
updated: <today>
---

# Wiki Config

<2–3 sentences: the wiki's purpose, scope, and what kinds of things live in it.>
```

## Step 3 — Create the raw/ category folders and set its git treatment

For each category, create `raw/<category>/` with a `.gitkeep` inside. Leave
`wiki/{entities,topics,sources}/` as they ship.

Then apply the answer to question 5 by editing `.gitignore`:

- **Ignore `raw/` (default):** leave `.gitignore` as shipped — it already ignores `raw/`.
- **Commit `raw/`:** remove the `raw/` line from `.gitignore` so it's version-controlled, but add
  patterns that still keep secrets out, e.g.:

  ```
  # raw/ is committed, but never these:
  **/.env
  **/.env.*
  **/*.key
  **/*.pem
  **/id_rsa*
  **/credentials*
  ```

  (Keep `outputs/` ignored either way.)

## Step 4 — Generate the standing-topic commands

Skip entirely if `standing_topics` is empty. Otherwise, for **each** topic in the list, write
`.claude/commands/wiki-topic-<name>.md`, choosing the body by that topic's `type`. The templates
below show one example per type; generate one command file per topic.

The `wiki-topic-` prefix is required: it namespaces the generated commands away from the engine
commands (`wiki-init/ingest/query/lint`) so a topic named e.g. "query" can never overwrite one,
and it makes clear in a directory listing which commands are derived and regenerable.

**temporal** (example name `renewals`):
```
---
description: Show upcoming <name> from the wiki
argument-hint: "[optional window, e.g. '90 days' or a year]"
disable-model-invocation: true
---
Read `wiki/topics/<name>.md` and report upcoming items. If a window is given, filter to it:
$ARGUMENTS — otherwise show the next 90 days, sorted by date. Note today's date and flag
anything already overdue.
```

**status-list** (example name `open-questions`):
```
---
description: Show <name> from the wiki, grouped by status
argument-hint: "[optional status filter, e.g. 'open' or 'blocked']"
disable-model-invocation: true
---
Read `wiki/topics/<name>.md` and report items grouped by status (open / blocked / resolved).
If a status filter is given, show only that group: $ARGUMENTS.
```

**decision-log** (example name `decisions`):
```
---
description: Show recent <name> from the wiki
argument-hint: "[optional: how many, or a date range]"
disable-model-invocation: true
---
Read `wiki/topics/<name>.md` and list entries reverse-chronologically with their rationale.
If a count or range is given, limit to it: $ARGUMENTS.
```

**glossary** (example name `glossary`):
```
---
description: Look up or list terms from the <name>
argument-hint: "[optional term to look up; omit to list all]"
disable-model-invocation: true
---
Read `wiki/topics/<name>.md`. If a term is given, return its definition and any related terms:
$ARGUMENTS — otherwise list all terms alphabetically with a one-line definition each.
```

**metrics** (example name `metrics`):
```
---
description: Show the latest <name> and how they've changed
argument-hint: "[optional: a specific metric to focus on]"
disable-model-invocation: true
---
Read `wiki/topics/<name>.md` and report each tracked metric's most recent value, the date of that
reading, and the change since the prior reading. If a metric is named, focus on it and show its
history: $ARGUMENTS.
```

**timeline** (example name `timeline`):
```
---
description: Show the <name> as a chronological timeline
argument-hint: "[optional date range or filter]"
disable-model-invocation: true
---
Read `wiki/topics/<name>.md` and list events in forward-chronological order (oldest first) with
their dates. If a range or filter is given, limit to it: $ARGUMENTS.
```

**comparison** (example name `comparison`):
```
---
description: Compare the options tracked in the <name>
argument-hint: "[optional: an option to focus on, or a criterion to sort by]"
disable-model-invocation: true
---
Read `wiki/topics/<name>.md` and present the options as a comparison table (options × criteria).
If an option or criterion is given, focus or sort by it: $ARGUMENTS.
```

## Step 5 — Seed the wiki

- `wiki/index.md`: a heading per `raw_category`, plus a "Topics" section listing the standing
  topics (if any). No entries yet — just the skeleton.
- `wiki/topics/<name>.md`: for each standing topic, create an empty page with proper frontmatter
  (`type: topic`) and a one-line description of what it tracks. Skip if the list is empty.
- `wiki/overview.md`: a one-paragraph stub restating the subject.
- `wiki/log.md`: append `## [<today>] init | initialized wiki for <subject>`.

## Step 6 — Give the wiki its own git history

A wiki copied from the template (`cp -R`) inherits the template's `.git/` and its commit history,
which a new wiki should not carry.

- If a `.git/` directory exists here: tell the human you'd like to reset it so this wiki starts a
  clean history of its own, and **wait for confirmation** — this is destructive (`rm -rf .git`).
  Only if they confirm, run `rm -rf .git && git init`. If they decline (e.g. they intentionally
  set up a clone with a remote), leave it untouched.
- If there is no `.git/`: offer to `git init` a fresh repo.

Either way, leave making the first commit to the human — or, if they ask, stage `wiki/`,
`wiki-config.md`, `.claude/`, `.vscode/`, `.gitignore`, and the docs and make an initial commit.
`.vscode/` is part of the template (it disables format-on-save so the editor doesn't rewrite
LLM-authored markdown) — include it even though editor config is normally personal. Never commit
`outputs/` (always git-ignored); commit `raw/` only if the human chose `commit_raw: true` in
question 5 — otherwise it stays git-ignored too.

## Step 7 — Report

Tell the human what you created (config, categories, standing-topic command names), whether git was
reset, and the next step: drop files into `raw/<category>/`, then run `/wiki-ingest`.
