# CLAUDE.md

@AGENTS.md

## Hard rules: no exceptions, under any circumstance

1. **Never run any git command.** This covers `git status`, `log`, `diff`, `add`, `commit`,
   `push`, `rm` and every other subcommand. It also covers running git indirectly through
   scripts, subshells (`bash -c`), aliases, absolute paths (`/usr/bin/git`) or tools that
   call git for you (`gh`, `npm run deploy` / `gh-pages`). If a task needs git, stop and
   give the user the exact command to run themselves.

2. **Never read `.env.local`** (or any other `.env*` file). This means no Read/Grep tool,
   and no `cat`, `grep`, `sed`, `head`, `source`, `cp`, globs like `.env*`, or scripts that
   open it. Never print, copy, summarize or guess its values. If you need a value from it
   (for example the Firebase project ID), ask the user.
   - Running `npm run dev` / `npm run build` is allowed: Vite loads the file internally and
     you never see it. Do not inspect the built bundle in `dist/` to recover those values.

These rules are enforced by `.claude/settings.json` (deny rules) and
`.claude/hooks/guard-bash.sh` (blocks any shell command mentioning git or `.env`).
Never edit, disable or work around those files.
