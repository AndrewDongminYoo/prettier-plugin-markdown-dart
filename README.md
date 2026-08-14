# prettier-plugin-markdown-dart

Format fenced `dart` code blocks in Markdown with the local `dart format` command.

## Installation

Install Prettier and this plugin in the project that owns the Markdown files.

```shell
pnpm add -D prettier prettier-plugin-markdown-dart
```

The plugin requires Prettier 3 and Node.js 18 or newer.

It also requires a Dart SDK or Flutter SDK whose `dart` executable is available on `PATH`.

```shell
dart --version
```

## Prettier configuration

Add the plugin to an ESM Prettier configuration.

```js
export default {
  plugins: ["prettier-plugin-markdown-dart"],
};
```

Then format Markdown normally.

```shell
pnpm exec prettier --write README.md
```

Only fenced blocks tagged `dart` are sent to the Dart formatter.

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

Other fenced languages and inline code spans are outside this plugin's scope.

## Dart formatter configuration

The plugin gives `dart format` a virtual `.dart` path beside the Markdown file.

That lets Dart find the nearest ancestor `analysis_options.yaml` as it would for an ordinary Dart source file.

For example:

```yaml
formatter:
  page_width: 100
  trailing_commas: preserve
```

`formatter.trailing_commas: preserve` requires Dart 3.8 or newer.

When formatting Markdown without a `filepath`, the virtual path is placed in the current working directory.

## Error behavior

If Dart cannot format a fenced block, such as while an example has incomplete syntax, the plugin leaves that block unchanged.

Set Prettier's `embeddedLanguageFormatting` option to `"off"` to leave all embedded code blocks unchanged.

## License

[MIT](LICENSE)
