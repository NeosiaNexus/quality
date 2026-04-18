## 1.0.0-beta.12 — 2026-04-18

### Breaking

- **Nursery rules moved behind the opt-in `@neosianexus/quality/strict` preset.**

  Biome maintainers explicitly state that nursery rules are not covered by
  semantic versioning and can be promoted, renamed, or removed between minor
  versions. Shipping them inside the default preset meant every consumer
  inherited the churn (`Unknown rule nursery/xyz` errors whenever the
  consumer's Biome version drifted from the one the package was built
  against).

  The default preset now only contains rules from stable Biome groups and is
  forward-compatible with any `@biomejs/biome` `>=2.4.0`.

  **Migration.** To keep the previous behavior (all nursery rules enforced),
  layer the strict preset on top of the default one:

  ```diff
  {
  -  "extends": ["@neosianexus/quality"]
  +  "extends": ["@neosianexus/quality", "@neosianexus/quality/strict"]
  }
  ```

  Adding the strict preset couples your project to the `@biomejs/biome`
  version this package was built against — that's the trade-off you opt into.

### Added

- `@neosianexus/quality/strict` export — opt-in nursery layer (39 rules + the
  matching file-pattern overrides).
- `quality init --strict` / `-s` flag and an interactive prompt to enable the
  strict preset at setup time.
- CI matrix that validates the default preset against `@biomejs/biome`
  `^2.4.0`, `^2.5.0`, `^2.6.0`, and `latest` so Biome bumps can't silently
  break consumers on the supported range.
- Vitest smoke test that invokes the real Biome CLI on both presets via
  fixtures under `.github/fixtures/`.
