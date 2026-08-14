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

test("formats a Dart fenced block", async () => {
  const source = "```dart\nvoid main(){print('hello');}\n```\n";

  assert.equal(
    await formatMarkdown(source, "/project/README.md"),
    "```dart\nvoid main() {\n  print('hello');\n}\n```\n",
  );
});

test("uses trailing comma preservation from analysis_options.yaml", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "prettier-markdown-dart-"));
  const docs = path.join(root, "docs");
  const markdownPath = path.join(docs, "example.md");
  await mkdir(docs);
  await writeFile(
    path.join(root, "analysis_options.yaml"),
    "formatter:\n  page_width: 20\n  trailing_commas: preserve\n",
  );

  const formatted = await formatMarkdown(
    "```dart\nvoid main() { call(one, two,); }\n```\n",
    markdownPath,
  );

  assert.match(formatted, /call\(\n    one,\n    two,\n  \);/);
});

test("uses page width from analysis_options.yaml", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "prettier-markdown-dart-"));
  const docs = path.join(root, "docs");
  const markdownPath = path.join(docs, "example.md");
  await mkdir(docs);
  await writeFile(
    path.join(root, "analysis_options.yaml"),
    "formatter:\n  page_width: 20\n",
  );

  const formatted = await formatMarkdown(
    "```dart\nfinal values = [one, two, three, four];\n```\n",
    markdownPath,
  );

  assert.match(formatted, /final values = \[\n  one,/);
});

test("preserves invalid Dart and non-Dart fenced blocks", async () => {
  const invalidDart = "```dart\nvoid main( {\n```\n";
  const plainText = "```text\nkeep   these spaces\n```\n";

  assert.match(
    await formatMarkdown(invalidDart, "/project/README.md"),
    /void main\( \{/,
  );
  assert.match(
    await formatMarkdown(plainText, "/project/README.md"),
    /keep   these spaces/,
  );
});

test("is idempotent and honors embedded language formatting off", async () => {
  const source = "```dart\nvoid main(){print('hello');}\n```\n";
  const once = await formatMarkdown(source, "/project/README.md");

  assert.equal(await formatMarkdown(once, "/project/README.md"), once);
  assert.match(
    await formatMarkdown(source, "/project/README.md", {
      embeddedLanguageFormatting: "off",
    }),
    /void main\(\){print\('hello'\);\}/,
  );
});
