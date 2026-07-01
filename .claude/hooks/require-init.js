#!/usr/bin/env node
// UserPromptSubmit hook: hard-block the wiki commands (except /wiki-init) until this wiki has
// been initialized. "Initialized" == wiki-config.md exists at the project root.
//
// Cross-platform (macOS / Linux / Windows) — depends only on Node.js, which Claude Code itself
// requires, so it is always on PATH wherever Claude Code runs.
//
// Reads the hook payload (JSON) on stdin. If the submitted prompt is /wiki-ingest, /wiki-query,
// or /wiki-lint and wiki-config.md is absent, exit 2 to block the prompt and surface a message.
// All other prompts (including /wiki-init and plain questions) pass through untouched.

const fs = require("fs");
const path = require("path");

let raw = "";
try {
  raw = fs.readFileSync(0, "utf8"); // fd 0 = stdin
} catch {
  process.exit(0); // no input → don't block
}

let prompt = "";
try {
  prompt = (JSON.parse(raw).prompt || "").trim();
} catch {
  prompt = raw; // if payload isn't JSON, fall back to matching the raw text
}

// Only guard the exact slash-command spellings; /wiki-init and plain questions pass through.
if (/^\/wiki-(ingest|query|lint)\b/.test(prompt)) {
  const projectDir = process.env.CLAUDE_PROJECT_DIR || process.cwd();
  const config = path.join(projectDir, "wiki-config.md");
  if (!fs.existsSync(config)) {
    process.stderr.write(
      "This wiki isn't initialized yet. Run /wiki-init before /wiki-ingest, /wiki-query, or /wiki-lint.\n"
    );
    process.exit(2); // block the prompt
  }
}

process.exit(0);
