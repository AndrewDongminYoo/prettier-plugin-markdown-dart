# Markdown Dart Formatting Plugin Design

## Goal

Publish `prettier-plugin-markdown-dart`, a Prettier plugin that formats only fenced Markdown code blocks tagged `dart` by invoking the locally installed Dart formatter.
The user should be able to run one normal Prettier command instead of copying code through DartPad and back.

## Constraints

- The package supports Dart only.
- A local Dart SDK or Flutter SDK must provide a `dart` executable on `PATH`.
- The package uses Dart's formatter rather than implementing Dart parsing or formatting rules.
- The package relies on Prettier's existing Markdown embedded-language formatting instead of replacing the Markdown parser or printer.
- The initial release is prepared for public npm publication, but publication does not imply a Git commit, tag, or push.

## Non-goals

- A standalone formatting CLI.
- A VS Code extension.
- Swift, Kotlin, or other fenced-code languages.
- A custom YAML parser for `analysis_options.yaml`.
- Formatting inline Markdown code spans.

## Architecture

The package is an ESM Prettier language plugin.
It declares the `dart` language and a corresponding parser and printer.
When Prettier formats a Markdown fenced block whose info string resolves to `dart`, Prettier passes the block text to this plugin through its existing embedded-language mechanism.

The parser invokes `dart format` with standard input and `--output=show`.
It uses a process API that passes arguments directly rather than composing a shell command.
The printer returns the successful formatter output as a Prettier document.

No physical temporary Dart file is created.

## Dart Project Configuration

For a Markdown file with a known `filepath`, the plugin gives `dart format --stdin-name` a virtual `.dart` path in the Markdown file's directory.
For a formatting API call without a filepath, the virtual path is placed in the process working directory.

This lets Dart discover project configuration through its normal file-path lookup instead of making the plugin interpret YAML.
Consequently, nearby or ancestor `analysis_options.yaml` files control `formatter.page_width` and `formatter.trailing_commas` exactly as they do for ordinary Dart files.

`trailing_commas: preserve` is honored by Dart SDK versions that support it.
Dart documents this option as requiring Dart 3.8 or newer.

## Error Behavior

If `dart format` rejects a fenced block, the plugin preserves that block's original contents.
This keeps an incomplete example from preventing the surrounding Markdown document from formatting while it is being edited.

The plugin does not modify non-Dart fenced blocks.
It also respects Prettier's `embeddedLanguageFormatting: "off"` option because Prettier will skip embedded-language formatting before it reaches the plugin.

The README will make the `dart` executable prerequisite explicit.

## Package Boundary

The package contains only its source, tests, README, an MIT license for Dongmin Yu dated 2026, and package metadata needed for installation.
It has no runtime dependency beyond Node's standard library and a compatible Prettier peer dependency.

The supported Prettier and Node ranges will be stated explicitly in `package.json` and exercised by the test matrix.
The first implementation targets Prettier 3 rather than attempting compatibility with its obsolete plugin API variants.

## Verification

The automated tests will cover the following behaviors.

- A valid `dart` fenced block is formatted by the Dart SDK.
- Markdown prose and non-Dart fenced blocks are unchanged apart from Prettier's ordinary Markdown formatting.
- A nearby `analysis_options.yaml` changes page width.
- `formatter.trailing_commas: preserve` is honored when the installed Dart SDK supports it.
- Invalid Dart source leaves the original fenced block intact.
- Reformatting already formatted input produces identical output.
- Disabling Prettier embedded-language formatting leaves Dart blocks untouched.
- The packed npm tarball can be installed and loaded by a clean consumer project.

## Release Procedure

Before public publication, verify that `prettier-plugin-markdown-dart` is available in the npm registry.
If the name is unavailable, stop and ask for a new name rather than choosing one automatically.

Run the repository test suite, inspect the package contents with the package manager's pack command, and perform a publication dry run.
After npm authentication and the dry run succeed, publish with public access.
