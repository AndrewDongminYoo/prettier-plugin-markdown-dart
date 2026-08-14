# prettier-plugin-markdown-dart

Format fenced `dart` code blocks in Markdown with the local `dart format` command.

````markdown
```dart
void main(){print('Hello, world!');}
```
````

becomes:

````markdown
```dart
void main() {
  print('Hello, world!');
}
```
````

Everything else in the document is formatted by Prettier exactly as it always was.

## Requirements

| Requirement | Version                                                   |
| ----------- | --------------------------------------------------------- |
| Prettier    | 3.x (`>=3.0.0 <4`)                                        |
| Node.js     | 18 or newer                                               |
| Dart        | any SDK with `dart` on `PATH`; 3.8+ for `trailing_commas` |

The Dart SDK bundled with Flutter counts.
Confirm the executable is reachable before installing:

```shell
dart --version
```

## Installation

Install Prettier and this plugin in the project that owns the Markdown files.

```shell
npm install --save-dev prettier prettier-plugin-markdown-dart
```

```shell
pnpm add -D prettier prettier-plugin-markdown-dart
```

```shell
yarn add --dev prettier prettier-plugin-markdown-dart
```

```shell
bun add --dev prettier prettier-plugin-markdown-dart
```

Install it as a project dependency rather than globally.
Editor integrations and CI resolve Prettier plugins from the project directory, so a global install is invisible to them.

## Configuration

Add the plugin to your Prettier configuration file.
Any of Prettier's config formats work — pick whichever the project already uses.

```json
{
  "plugins": ["prettier-plugin-markdown-dart"]
}
```

```js
export default {
  plugins: ["prettier-plugin-markdown-dart"],
};
```

```yaml
plugins:
  - prettier-plugin-markdown-dart
```

Then format Markdown normally.

```shell
npx prettier --write README.md
```

The plugin has no options of its own.

## New to Prettier plugins?

Skip this section if you have used one before.

**Why a plugin is needed at all.**
Prettier ships formatters for JavaScript, CSS, Markdown, YAML, and a handful of others, but not for Dart.
When Prettier formats Markdown it already reformats the _inside_ of fenced code blocks whose language it recognizes — a ` ```json ` block gets formatted as JSON.
A ` ```dart ` block is left alone because Prettier has never heard of Dart.
This plugin registers Dart as a language Prettier knows, so the existing fenced-block machinery starts routing those blocks somewhere.
It does not implement a Dart formatter; it hands the block to the `dart format` you already have installed and puts the result back.

**Where the configuration goes.**
Prettier looks for its config file by walking up from the file being formatted, so it belongs at your repository root, next to `package.json`:

```log
your-project/
├── package.json
├── .prettierrc          ← the plugins entry goes here
├── analysis_options.yaml
├── README.md
└── docs/
    └── guide.md
```

The `plugins` entry takes the package name as a string, and Prettier resolves it the same way `import` would.
That is why the plugin must be installed in the project — a name Node cannot resolve produces a "Cannot find package" error at startup.

**Confirming it works.**
Put an intentionally unformatted Dart block in a Markdown file and run the check command:

```shell
npx prettier --check example.md
```

An exit code of `1` with a `[warn]` line means Prettier is reading the block and wants to change it, which is what you want to see.

Exit code `0` on a badly formatted block has two possible causes, and they look identical:

1. The plugin is not loaded — recheck the `plugins` entry and confirm the fence is tagged exactly `dart`.
2. `dart` is not on `PATH` for the process running Prettier, so every block passes through untouched.

Rule out the second first with `dart --version` in the same shell.
Editors and CI runners often have a different `PATH` than your interactive terminal.

**Editors.**
The official Prettier extensions for VS Code, JetBrains, and Neovim run your project's own Prettier, so once the plugin is in `package.json` and the config, format-on-save picks it up.
Reload the editor window after installing — plugins are loaded once when Prettier starts.

**Continuous integration.**
CI needs the Dart SDK too, not just Node.
On GitHub Actions, add `dart-lang/setup-dart@v1` before the formatting step.
Without it, every Dart block silently stays unformatted and the check still passes.

## Dart formatter configuration

The plugin gives `dart format` a virtual `.dart` path beside the Markdown file.

That lets Dart find the nearest ancestor `analysis_options.yaml` as it would for an ordinary Dart source file, so your code blocks follow the same rules as your real source.

```yaml
formatter:
  page_width: 100
  trailing_commas: preserve
```

`formatter.trailing_commas: preserve` requires Dart 3.8 or newer.

No file is written to disk — the path exists only as a hint that tells Dart where to start looking.
When formatting Markdown through the API without a `filepath`, the virtual path is placed in the current working directory.

## Scope and error behavior

Only fenced blocks tagged `dart` are sent to the Dart formatter.
Other fenced languages and inline code spans are outside this plugin's scope.

If Dart cannot format a fenced block — while an example has incomplete syntax, for instance — the plugin leaves that block unchanged and the rest of the document still formats.
The same applies if `dart` is missing from `PATH` entirely: nothing fails loudly, Dart blocks simply pass through untouched.

Set Prettier's `embeddedLanguageFormatting` option to `"off"` to leave all embedded code blocks unchanged.

## Performance

Each Dart fence costs one `dart format` process, roughly a quarter of a second on a warm machine.
A document with many Dart blocks is correspondingly slower, which is normally invisible on save and noticeable when formatting a large docs tree in one command.

## License

[MIT](LICENSE)
