# Harvesting: building a wiki over code repositories

> **Status: design note / proposed — NOT yet implemented.** This documents how to point an
> LLM wiki at a set of code repositories (SDKs, agents, APIs, shared components) and the
> `/wiki-harvest` operation we've designed to support it. Nothing here is wired into the template
> yet. Revisit this before implementing.

## The use case

A common scenario: a team (or several teams) builds a family of **shared components** — SDKs,
services, agents, APIs, libraries — each in its own git repo, plus a pile of loose documentation
(environment/deploy docs, technical design docs, and a `README` in every project). The knowledge
is real but **fragmented**: onboarding means reading a dozen READMEs across a dozen repos to learn
"which component do I use for X, and how do these pieces relate."

That connective tissue — the cross-cutting "how it all fits together" and the "why" — is exactly
what an LLM wiki is good at. It's the killer use case here: **onboarding + cross-team architecture
knowledge**, the stuff that's currently tribal and lives in no single repo.

### What the wiki is *for* (and not for)

- **Good fit:** the distilled, cross-linked map — which component does what, how cross-cutting
  concerns relate, environment/deploy knowledge, conventions, and the reasoning behind decisions.
- **Poor fit:** being a second, stale copy of the source code. Your IDE, code search, and the
  repos themselves are far better at "where is function X." **The wiki holds "how it fits together
  and why"; the repos hold "what the code is."**

## The core problem: don't clone whole repos into `raw/`

`raw/` is designed for **immutable documents you ingest once and re-ingest on change**. A git repo
is the opposite:

- It's mostly *not documents* — source files, lockfiles, build artifacts, vendored deps.
  Ingesting all of it is expensive and mostly noise, and the wiki would try to summarize source
  code it has no business mirroring.
- It **changes constantly**, so you'd be re-ingesting endlessly and the wiki would perpetually
  drift behind the code.
- The repo is *already the source of truth* for its code. The wiki shouldn't duplicate it.

So instead of cloning repos wholesale, **ingest the documentation surfaces**: READMEs, `docs/`,
ADRs/design docs, API specs (OpenAPI/AsyncAPI), the environment & technical docs, plus any
hand-written architecture notes. Let the *code* stay in the repos.

## The solution: a HARVEST pre-stage

Insert a curation gate between the repos and `raw/`:

```text
upstream repos ──▶ HARVEST ──▶ raw/<dest>/ ──▶ INGEST ──▶ wiki/
   (source of      (select &     (curated docs,    (distill)    (compiled
    truth, live)    copy)         document-only)                 knowledge)
```

`raw/` stays clean (only real documents), the repos stay the live source of truth, and harvest is
the filter between them. Harvest and ingest stay **fully separate**: harvest only *populates
`raw/`*; ingest's existing hash-check then picks up whatever changed. Neither depends on the
other's internals.

### Design principles

1. **Harvest *selects and copies* — it does not summarize.** Keep it to "which files are
   document-worthy, copy them verbatim." Distillation is *ingest's* job; doing it twice loses
   traceability (you want the real README in `raw/`, not a summary that ingest then re-summarizes).
   One distillation, at ingest.

2. **Do the mechanical 90% with a script; reserve the LLM for judgment.** "Find the docs and copy
   them to `raw/<dest>/`" is a deterministic glob/copy — no tokens, reproducible, same result every
   run. A pure-LLM harvest is expensive *and* non-deterministic (it may pick different files each
   run). Let the LLM in only for genuinely fuzzy calls (relevance, ambiguous "is this a doc?").

3. **"Verify accuracy" must *flag*, not *fix*.** Judging whether a doc is still accurate means
   comparing it against code, which an LLM does unreliably and can hallucinate. Safer contract:
   harvest copies the doc and, if it *suspects* staleness, adds it to a review list — it never
   silently drops or edits a doc. Humans decide. Otherwise you get silent knowledge loss.

4. **Change detection is layered and complementary.** Harvest compares upstream files to what's
   already in `raw/` (skip unchanged copies); ingest compares `raw/` files to their
   `wiki/sources/` hash (skip unchanged distillation). Even a dumb "copy everything" harvest
   wouldn't cause needless re-ingestion — so harvest-level change detection is an *optimization*,
   not a correctness requirement.

5. **Record provenance.** Since `raw/` docs now come *from* repos, capture where each came from:
   **repo + upstream path + commit SHA**. The commit SHA is better than a content hash for
   staleness ("upstream moved N commits since we harvested this") and gives real point-in-time
   traceability.

## The `/wiki-harvest` command (proposed spec)

### 1. The manifest — `harvest-manifest.yaml` (repo root)

The single declarative source of what feeds `raw/`. Editable, reviewable, reproducible.

```yaml
# What upstream repos feed raw/, and how. Harvest READS these clones; never writes to them.
defaults:                              # applied to every repo unless overridden
  include: ["README*", "docs/**/*.md", "**/*.adoc"]
  exclude: ["node_modules/**", ".git/**", "**/dist/**", "**/CHANGELOG.md"]

repos:
  - name: example-sdk
    path: ../repos/example-sdk         # local clone (relative to wiki root, or absolute)
    dest: sdk/example-sdk              # lands under raw/<dest>/
    include: ["README*", "docs/**/*.md", "openapi.{yaml,json}"]   # overrides defaults
    accuracy_check: true               # optional LLM staleness pass — FLAGS only, never edits

  - name: example-service
    path: ../repos/example-service
    dest: services/example-service
    # no include/exclude → uses defaults
```

### 2. The lock — `raw/.harvest-lock.yaml` (harvest-written)

Records where every `raw/` file came from. This is the payoff of the design.

```yaml
files:
  raw/sdk/example-sdk/README.md:
    repo: example-sdk
    upstream_path: README.md
    commit: 4a9f1c2          # repo HEAD at harvest time
    sha256: <content hash>
    harvested: 2026-06-30
```

Two things fall out of it:

- **Harvest-level change detection** — compare the current upstream file's sha to the lock; only
  copy the diffs (cheap, no tokens).
- **Traceability** — ingest reads the lock and stamps each `wiki/sources/` page with
  `upstream: example-sdk@4a9f1c2:README.md`. Every distilled fact then traces back to a
  point-in-time commit, and staleness becomes detectable.

### 3. The HARVEST operation (mechanical-first)

1. Read the manifest. For each repo: check the clone exists; get `git -C <path> rev-parse HEAD`.
2. Resolve include/exclude globs → candidate files (shell glob / `find`).
3. For each candidate: `shasum` it, compare to the lock. New/changed → copy into `raw/<dest>/`,
   update the lock. Unchanged → skip.
4. **Deletions:** files in the lock no longer present upstream (or now excluded) → **flag** for
   removal; do not auto-delete (start conservative).
5. **Only if `accuracy_check: true`:** a light LLM pass adds suspect-stale docs to a review list —
   flag, never fix, never drop.
6. Write `outputs/harvest-<date>.md`: copied / changed / skipped / removal-candidates / flagged.
7. Tell the human: "Harvested N new, M changed — run `/wiki-ingest` to compile."

Steps 1–4 are deterministic and free; the model only reasons in step 5, and only advisorily.

### 4. Engine (`CLAUDE.md`) additions

- A new **Operation: HARVEST** section describing the above.
- Mental-model line gains a stage: `repos → harvest → raw/ → ingest → wiki/`.
- Ingest step 3 gains: "if `raw/.harvest-lock.yaml` exists, add the file's `upstream:` provenance
  to the source-summary frontmatter."

### 5. How `/wiki-init` gates it (harvest is optional, domain-specific)

Harvesting only makes sense for code/repo-oriented wikis, not personal-records ones. So init adds
one interview branch:

> "Do this wiki's sources include code repositories (not just loose documents)?"

- **Yes** → init scaffolds `harvest-manifest.yaml` (pre-filled with any repos named), generates the
  `/wiki-harvest` command into `.claude/commands/`, and notes the harvest→ingest flow.
- **No** → none of it appears.

Consistent with the template's "file existence = state" pattern: **presence of
`harvest-manifest.yaml` is the flag** that this wiki uses harvesting. The enforcement guard extends
naturally — `/wiki-harvest` requires both `wiki-config.md` (initialized) and `harvest-manifest.yaml`
(configured), else it points the user at the fix.

## Cross-cutting caveats to plan for

- **Drift.** Multi-team, fast-moving code means a compiled snapshot goes stale. Survivable via the
  hash-based re-ingest + `/wiki-lint` stale-claim detection, but budget for a periodic
  "re-harvest + re-ingest + lint" cadence, and lean the wiki toward *relatively stable* knowledge
  (architecture, conventions, environment, cross-cutting concerns) over volatile API minutiae.

- **Governance / data egress.** Ingest sends whatever you ingest to the model API. Internal docs
  may contain secrets, internal URLs, and IP. Settle two questions before starting: (a) is sending
  internal code/docs to the model API approved, or should this point at an in-house/approved model?
  (b) the `sensitivity` field + a disciplined harvest (never ingest `.env`/secrets) become
  load-bearing, not optional.

- **Team artifact, not personal.** Decide who owns/maintains the `wiki/` layer and commit it to a
  shared repo — the `wiki/` pages are the versioned, reviewable knowledge; `raw/` stays local/
  git-ignored (it's a vendored mirror of upstream docs).

## Open decisions (revisit before implementing)

1. **Manifest format** — dedicated YAML (`harvest-manifest.yaml`, as above) vs. the template's
   `.md`-with-frontmatter convention. Leaning YAML: it's pure data, nested lists read cleaner, and
   nobody needs to read it as prose.
2. **Deletions** — flag-only (safe default) vs. letting harvest prune `raw/` files whose upstream
   vanished (defensible since `raw/` is a vendored mirror here, not hand-authored). Leaning
   flag-only to start.
