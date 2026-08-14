# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```shell
pnpm install                                  # pnpm@11.21.0 is pinned in packageManager
pnpm test                                     # node --test over test/
pnpm test -- test/markdown-dart.test.js       # one file
node --test --test-name-pattern="idempotent"  # one test by name
pnpm exec prettier --check README.md docs/    # format check, always with explicit paths
pnpm pack --pack-destination /private/tmp     # inspect the publishable tarball
```

There is no lint script, no trunk config, and no build step.
The published artifact is `src/index.js` verbatim.

Verified on 2026-08-14: Dart 3.13.0, Node 24.19.0, prettier 3.9.6, 5/5 tests pass.

## Architecture

The plugin never parses, prints, or otherwise touches Markdown.
It registers a `dart` language, parser, and printer, and lets Prettier's own embedded-language mechanism route fenced-block bodies to it.
Everything lives in `src/index.js` (~78 lines).

The flow for one fenced block:

1. Prettier's Markdown printer sees an info string of `dart` and resolves it against the `languages` export.
2. `parsers.dart.parse` shells out to `dart format --output=show` over stdin and returns a single synthetic node, `{ type, value }`, whose `value` is the **already-formatted text**.
3. `printers["dart-ast"].print` is the identity function — it returns `path.node.value`.

So the "AST" is a one-node wrapper around a string, and all real work happens in `formatDart` before the printer runs.

Two design decisions explain most of the file, and both are load-bearing:

**Failure is silent and lossless.**
`formatDart` resolves `undefined` for every failure mode — spawn error, non-zero exit, 30s timeout — and `parse` applies `?? text`, leaving the block exactly as written.
The 30s timeout is the only bound on a runaway `dart`; an output-length cap was removed deliberately, so do not reintroduce one without a measured reason.
An in-progress example with broken syntax must never block formatting of the surrounding document.
stderr is drained and discarded on purpose (`docs/specs/...md:252`); do not surface it without a decision to change the v1 API.

The one exception is a missing `dart` executable, which warns once per process.
Without it, a machine with no Dart SDK is indistinguishable from a fully formatted document: `--check` exits 0 having formatted nothing.

**Settling waits on `exit`, not only `close`, when the child was killed.**
A killed process can leave a descendant holding stdout open, which delays `close` long past the timeout — measured 30s vs 60s against a shim that forks.
Signal termination discards stdout anyway, so the `exit` listener resolves `undefined` whenever `signal !== null`, and `close` still owns the success path where stdout must be complete.
Do not collapse the two listeners back into one.

**Dart configuration is discovered by Dart, not by this plugin.**
`virtualDartPath` builds a `.dart` path that does not exist on disk, sitting beside the Markdown file (`docs/example.md` → `docs/example.dart`), and passes it via `--stdin-name`.
Dart then resolves the nearest ancestor `analysis_options.yaml` through its normal lookup.
This is why there is no YAML parsing anywhere and no temp file is ever written — keep it that way when touching `virtualDartPath`.

## Tests

`test/markdown-dart.test.js` is integration-only: no mocks, no unit tests, every case drives real Prettier and spawns a real `dart`.

- Without a Dart SDK on `PATH` the suite **fails** rather than skipping.
- The `trailing_commas: preserve` case needs Dart 3.8 or newer.
- The `analysis_options.yaml` cases build a real temp tree with `mkdtemp`, because the config lookup being tested is Dart's filesystem walk.

A change to `formatDart` or `virtualDartPath` is only proven by running the suite against an SDK — there is no faster substitute.

## Release

`.github/workflows/publish.yml` fires on GitHub release `published` and hard-fails unless the release tag equals `v$(node -p 'require("./package.json").version')`.
Bump `package.json` and move the tag together, or the job aborts before publishing.
The workflow installs a Dart SDK because `pnpm test` cannot run without one.

## Design record

`docs/specs/2026-08-14-markdown-dart-formatting.md` holds the goals, constraints, and explicit non-goals (no CLI, no VS Code extension, no other fenced languages, no custom YAML parser).
`docs/plans/2026-08-14-markdown-dart-formatting.md` is the completed implementation plan.
Check the non-goals list before adding scope.
