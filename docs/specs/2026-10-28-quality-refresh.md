# Quality Tooling Refresh

## Scope

Update supported dependencies and existing quality tooling under the approved account-wide maintenance request.
Preserve application behavior, existing exclusions, and generated artifacts.

## Acceptance

- Enabled linters use verified current compatible releases.
- Pinact is locked to `4.1.1` with `lint` and `upgrade` enabled.
- The full no-fix Trunk scan and project-specific minimum gates pass.
- Manifest changes have a package-manager-generated lockfile.
- Vulnerability dispositions identify their advisory and supporting evidence.
- Affected documentation commands, paths, versions, and local links agree with the checkout.

## Compatibility

Use Prettier `3.9.10` for development and regenerate `pnpm-lock.yaml` with the pinned `pnpm@11.21.0`.
Preserve the public Prettier peer range `>=3.0.0 <4` and Node.js requirement `>=18`.
Use the existing Dart SDK for integration tests; do not replace it with a mock or install a global SDK for this maintenance task.

## Verification Commands

1. Manifest and lockfile consistency: `pnpm install --frozen-lockfile`.
2. Real Dart and Prettier behavior: `pnpm test`.
3. Markdown style: `pnpm exec prettier --check README.md docs/`.
4. Full configured quality scan: `trunk check --all --no-fix --jobs=2`.

## Publication

Keep changes local until the operator approves publication for this repository.
After approval, continue CI and hosted review through the gated merge and requested cleanup and memory record.
