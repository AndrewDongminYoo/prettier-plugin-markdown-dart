# Markdown Dart Formatting Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Publish a Prettier 3 plugin that formats fenced Markdown `dart` blocks with the local Dart SDK and honors the surrounding Dart project's formatter configuration.

**Architecture:** The ESM plugin declares a Dart language parser that receives the fenced block through Prettier's existing embedded-language mechanism. Its async parser invokes `dart format --output=show` with standard input and a virtual sibling `.dart` path supplied through `--stdin-name`, then its printer returns either the formatter output or the unchanged input.

**Tech Stack:** Node.js 18+, ESM, Node built-in test runner, Prettier 3, Dart SDK or Flutter SDK, pnpm, npm registry.

## Global Constraints

- Support only fenced code blocks tagged `dart`.
- Require a `dart` executable on `PATH`.
- Do not implement a Dart parser, a Dart formatter, a Markdown parser, or a YAML parser.
- Let Dart resolve `analysis_options.yaml` using a virtual `.dart` path beside the Markdown file.
- Preserve a fenced block's original contents when `dart format` fails.
- Respect Prettier's `embeddedLanguageFormatting: "off"` behavior.
- Publish under the MIT License with `Copyright (c) 2026 Dongmin Yu`.
- Do not stage, commit, tag, push, or bypass Git checks without separate user authorization.

---

## File Structure

| Path                         | Responsibility                                                                        |
| ---------------------------- | ------------------------------------------------------------------------------------- |
| `package.json`               | Package metadata, ESM export, peer dependency, scripts, and npm publication contents. |
| `pnpm-lock.yaml`             | Resolved development dependency graph produced by pnpm.                               |
| `.gitignore`                 | Excludes dependency and package build artifacts.                                      |
| `src/index.js`               | Prettier language export and safe Dart subprocess adapter.                            |
| `test/markdown-dart.test.js` | Exercises the plugin through Prettier's Markdown parser.                              |
| `README.md`                  | Installation, configuration, Dart prerequisite, and `analysis_options.yaml` usage.    |
| `LICENSE`                    | MIT license text already approved by the user.                                        |

## Task 1: Establish Publishable Package Metadata and Test Harness

**Files:**

- Modify: `package.json`
- Verify: `LICENSE`
- Create: `.gitignore`
- Create: `pnpm-lock.yaml`

**Interfaces:**

- Produces: package root ESM export at `./src/index.js`.
- Produces: `pnpm test` as the full Node test suite command once Task 2 adds the behavioral tests.
- Consumes: pnpm 11.21.0 pinned by the package manifest.

- [ ] **Step 1: Update the manifest and ignore rules with the smallest publishable baseline.**

```json
{
  "description": "Format Dart fenced code blocks in Markdown with Prettier and dart format.",
  "author": "Dongmin Yu",
  "license": "MIT",
  "exports": "./src/index.js",
  "files": ["src", "README.md", "LICENSE"],
  "engines": { "node": ">=18" },
  "peerDependencies": { "prettier": ">=3.0.0 <4" },
  "devDependencies": { "prettier": "3.9.6" },
  "scripts": { "test": "node --test" }
}
```

```plaintext
node_modules
*.tgz
coverage
.DS_Store
```

Keep the pinned `packageManager` field at `pnpm@11.21.0`.
Keep the approved MIT license text and copyright line unchanged.

- [ ] **Step 2: Install the declared development dependency with the manifest's package manager.**

```shell
pnpm install
```

Expected: `pnpm-lock.yaml` is generated and the resolved Prettier version satisfies the manifest.

- [ ] **Step 3: Verify that the local Prettier executable resolves from the installed dependency.**

```shell
pnpm exec prettier --version
```

Expected: the installed Prettier reports a version satisfying `>=3.0.0 <4`.

## Task 2: Implement and Prove the Dart Fenced-Block Bridge

**Files:**

- Create: `src/index.js`
- Create: `test/markdown-dart.test.js`

**Interfaces:**

- Produces: `formatDart(source, filepath): Promise<string | undefined>` as an internal helper where `undefined` means preserve source.
- Produces: `languages`, `parsers`, and `printers` named ESM exports for Prettier.
- Consumes: `dart` from `PATH`, a Markdown `options.filepath` when supplied, and Prettier's `parser: "markdown"` entry point.

- [ ] **Step 1: Write integration tests that load the not-yet-created plugin through Prettier.**

````js
import assert from "node:assert/strict";
import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import * as prettier from "prettier";
import * as plugin from "../src/index.js";

async function formatMarkdown(source, filepath, options = {}) {
  return prettier.format(source, {
    ...options,
    filepath,
    parser: "markdown",
    plugins: [plugin],
  });
}

test("formats a dart fenced block", async () => {
  const source = "```dart\\nvoid main(){print('hello');}\\n```\\n";
  const formatted = await formatMarkdown(source, "/project/README.md");
  assert.equal(formatted, "```dart\\nvoid main() {\\n  print('hello');\\n}\\n```\\n");
});

test("uses formatter settings near the Markdown file", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "prettier-markdown-dart-"));
  const docs = path.join(root, "docs");
  const markdownPath = path.join(docs, "example.md");
  await mkdir(docs);
  await writeFile(path.join(root, "analysis_options.yaml"), "formatter:\\n  page_width: 20\\n  trailing_commas: preserve\\n");
  const source = "```dart\\nvoid main() { call(one, two,); }\\n```\\n";
  const formatted = await formatMarkdown(source, markdownPath);
  assert.match(formatted, /call\\(\\n    one,\\n    two,\\n  \\);/);
});

test("uses page_width from analysis_options.yaml", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "prettier-markdown-dart-"));
  const docs = path.join(root, "docs");
  const markdownPath = path.join(docs, "example.md");
  await mkdir(docs);
  await writeFile(path.join(root, "analysis_options.yaml"), "formatter:\\n  page_width: 20\\n");
  const source = "```dart\\nfinal values = [one, two, three, four];\\n```\\n";
  const formatted = await formatMarkdown(source, markdownPath);
  assert.match(formatted, /final values = \\[\\n  one,/);
});

test("preserves invalid Dart and non-Dart blocks", async () => {
  const invalidDart = "```dart\\nvoid main( {\\n```\\n";
  const plainText = "```text\\nkeep   these spaces\\n```\\n";
  assert.match(await formatMarkdown(invalidDart, "/project/README.md"), /void main\\( \{/);
  assert.match(await formatMarkdown(plainText, "/project/README.md"), /keep   these spaces/);
});

test("is idempotent and honors embeddedLanguageFormatting off", async () => {
  const source = "```dart\\nvoid main(){print('hello');}\\n```\\n";
  const once = await formatMarkdown(source, "/project/README.md");
  assert.equal(await formatMarkdown(once, "/project/README.md"), once);
  const skipped = await formatMarkdown(source, "/project/README.md", { embeddedLanguageFormatting: "off" });
  assert.match(skipped, /void main\\(\){print\('hello'\);\}/);
});
````

- [ ] **Step 2: Run the integration tests and verify that they fail because `src/index.js` does not exist.**

```shell
pnpm test -- test/markdown-dart.test.js
```

Expected: FAIL with `ERR_MODULE_NOT_FOUND` for `src/index.js`.

- [ ] **Step 3: Implement the smallest async Prettier plugin in `src/index.js`.**

```js
import path from "node:path";
import { spawn } from "node:child_process";

const maximumOutputLength = 10 * 1024 * 1024;

function virtualDartPath(filepath) {
  const markdownPath = filepath
    ? path.resolve(filepath)
    : path.join(process.cwd(), "stdin.md");
  return path.join(
    path.dirname(markdownPath),
    `${path.basename(markdownPath)}.dart`,
  );
}

function formatDart(source, filepath) {
  return new Promise((resolve) => {
    const child = spawn(
      "dart",
      ["format", "--output=show", "--stdin-name", virtualDartPath(filepath)],
      {
        stdio: ["pipe", "pipe", "pipe"],
      },
    );
    let stdout = "";
    let outputExceededLimit = false;
    child.stdout.setEncoding("utf8");
    child.stdout.on("data", (chunk) => {
      if (stdout.length + chunk.length > maximumOutputLength) {
        outputExceededLimit = true;
        return;
      }
      stdout += chunk;
    });
    child.stderr.resume();
    child.stdin.on("error", () => {});
    child.on("error", () => resolve(undefined));
    child.on("close", (exitCode) =>
      resolve(exitCode === 0 && !outputExceededLimit ? stdout : undefined),
    );
    child.stdin.end(source);
  });
}

export const languages = [
  { name: "Dart", aliases: ["dart"], parsers: ["dart"] },
];

export const parsers = {
  dart: {
    async parse(text, options) {
      return {
        type: "dart",
        value: (await formatDart(text, options.filepath)) ?? text,
      };
    },
    astFormat: "dart-ast",
    locStart: () => 0,
    locEnd: (node) => node.value.length,
  },
};

export const printers = {
  "dart-ast": {
    print(path) {
      return path.node.value;
    },
  },
};
```

The collected standard error is intentionally drained but not exposed by the v1 API.
Keep the fallback behavior unchanged: any spawn or nonzero-exit failure returns the original block text.

- [ ] **Step 4: Run the complete integration suite with a real Dart SDK.**

```shell
pnpm test -- test/markdown-dart.test.js
```

Expected: PASS with `dart` on `PATH` and a Dart SDK new enough to honor `trailing_commas: preserve`.

- [ ] **Step 5: Run the full test suite.**

```shell
pnpm test
```

Expected: PASS.

## Task 3: Document Consumer Setup and Validate the Packed Artifact

**Files:**

- Create: `README.md`
- Verify: `package.json`
- Verify: `pnpm-lock.yaml`

**Interfaces:**

- Produces: a documented plugin name, installation command, ESM Prettier config, and Dart formatter configuration example.
- Consumes: the public package export from Task 2.

- [ ] **Step 1: Write the README before testing the packed package.**

````markdown
# prettier-plugin-markdown-dart

Format fenced `dart` code blocks in Markdown using your local `dart format` command.

## Installation

```shell
pnpm add -D prettier prettier-plugin-markdown-dart
```

## Prettier configuration

```js
export default {
  plugins: ["prettier-plugin-markdown-dart"],
};
```

## Dart formatter configuration

```yaml
formatter:
  page_width: 100
  trailing_commas: preserve
```
````

State that the plugin requires `dart` on `PATH`, formats only `dart` fences, uses the Markdown file's project context, and preserves invalid Dart source.

- [ ] **Step 2: Inspect exactly what the package will contain.**

```shell
mkdir -p /private/tmp/prettier-plugin-markdown-dart-pack
pnpm pack --pack-destination /private/tmp/prettier-plugin-markdown-dart-pack
```

Expected: the tarball contains `src/index.js`, `README.md`, `LICENSE`, and `package.json`, but not `test/`, `docs/`, or `node_modules/`.

- [ ] **Step 3: Install the exact tarball into a clean temporary consumer and run Prettier through its public entry point.**

```shell
consumer_dir=$(mktemp -d /private/tmp/prettier-plugin-markdown-dart-consumer.XXXXXX)
tarball_path=$(find /private/tmp/prettier-plugin-markdown-dart-pack -maxdepth 1 -name 'prettier-plugin-markdown-dart-*.tgz' -print -quit)
test -n "$tarball_path"
pnpm --dir "$consumer_dir" add -D "$tarball_path" prettier@3.9.6
```

Create `example.md` and `prettier.config.mjs` inside `consumer_dir`, then run the consumer's locally installed Prettier.

```shell
pnpm --dir "$consumer_dir" exec prettier --write example.md
```

Expected: a `dart` fence is formatted without importing `src/index.js` by relative path.

- [ ] **Step 4: Run the full declared test suite and the non-mutating formatting check.**

```shell
pnpm test
pnpm exec prettier --check README.md docs/specs/2026-08-14-markdown-dart-formatting.md docs/plans/2026-08-14-markdown-dart-formatting.md
```

Expected: both commands pass.

## Task 4: Verify Registry State and Publish the Approved Public Package

**Files:**

- Verify: `package.json`

**Interfaces:**

- Consumes: the packed artifact and passing checks from Tasks 1 through 3.
- Produces: one public npm release of `prettier-plugin-markdown-dart` at the version declared in `package.json`.

- [ ] **Step 1: Check the exact package name and authenticated npm account without inferring either result from an error message.**

```shell
pnpm view prettier-plugin-markdown-dart version --json
pnpm whoami
```

Expected: `pnpm whoami` prints the account that will publish the package.
Treat a registry lookup failure as a transport or authentication problem until its exit status and diagnostic explicitly establish that the name is available.

- [ ] **Step 2: Run the publication dry run.**

```shell
pnpm publish --access public --dry-run
```

Expected: the command lists only intended package files and reports no package validation failures.
Do not add a bypass flag for Git checks.

- [ ] **Step 3: Re-run the final local gates immediately before publication.**

```shell
pnpm test
pnpm exec prettier --check README.md docs/specs/2026-08-14-markdown-dart-formatting.md docs/plans/2026-08-14-markdown-dart-formatting.md
git status --short
```

Expected: tests and formatting checks pass.
If the package manager requires a clean committed Git state, stop and request explicit Git commit authorization instead of bypassing that check.
Do not change package metadata in response to a release diagnostic without a separate scoped decision.

- [ ] **Step 4: Publish public access after the name, account, dry run, and final gates are all confirmed.**

```shell
pnpm publish --access public
```

Expected: npm returns the published package name and version.

- [ ] **Step 5: Verify the exact published version from the registry.**

```shell
pnpm view prettier-plugin-markdown-dart version --json
```

Expected: the registry version exactly matches `package.json`.

## Plan Self-Review

### Spec Coverage

- Dart-only fenced-block scope is implemented and tested in Task 2.
- Local `dart` executable use is implemented and documented in Tasks 2 and 3.
- `analysis_options.yaml` configuration discovery is implemented and tested in Task 2.
- Invalid-code preservation and embedded-formatting opt-out are implemented and tested in Task 2.
- ESM packaging, MIT license, documentation, tarball validation, and public publication are covered by Tasks 1, 3, and 4.

### Placeholder and Consistency Check

The plan contains no deferred implementation markers.
`formatDart(source, filepath)` is defined in Task 2 before any consumer task refers to it.
The public package export remains `./src/index.js` throughout all tasks.
