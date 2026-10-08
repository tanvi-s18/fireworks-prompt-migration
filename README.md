# Fireworks migration check

A desktop console concept for checking which requirements stop passing when moving from an incumbent to a Fireworks model. This is a take-home prototype, not an official Fireworks feature.

[Open prototype](https://tanvi-s18.github.io/fireworks-prompt-migration/) · [One-page overview](https://tanvi-s18.github.io/fireworks-prompt-migration/overview.pdf)

## Product hypothesis

Fireworks already provides datasets, evaluation jobs, custom evaluators, and [GEPA prompt optimization through Eval Protocol](https://fireworks.ai/blog/self-improving-agent). This concept proposes a guided migration workflow on those capabilities. It is not a new eval or optimizer engine. The assumption that this packaging reduces migration effort is unvalidated.

## Workflow

- Start with a sample dataset snapshot: document inputs, expected JSON, and saved incumbent outputs.
- Compare the saved Claude baseline with Kimi using the prompt to migrate.
- Separate migration regressions (Claude passes, Kimi fails), shared failures (both fail), and target improvements (Claude fails, Kimi passes).
- Review a prompt adaptation aimed at migration regressions, then compare all three stages on unchanged requirements.
- Export the prompts, dataset snapshot, outputs, checks, migration comparisons, and simulation provenance as JSON.

Expected values define correctness. Claude's saved outputs are evaluated too. Equal scores do not establish baseline parity: regressions are tracked per field. Baseline parity does not establish correctness or production readiness.

## Simulation boundary

No API keys, accounts, inference requests, or backend are required. Claude baseline outputs are authored fixtures, not model responses. Kimi outputs and revisions use a limited deterministic browser simulation. The examples are synthetic. The simulation recognizes the sample invoice labels and three prompt clarification rules: preserve invoice IDs, use the issuing seller, and avoid substituting a subtotal for a missing final total. Arbitrary prompt behavior and document formats are outside its scope.

The sample has 3 migration regressions and 1 shared failure before adaptation, then 0 migration regressions and 1 shared failure afterward. These numbers do not measure or predict either model's performance. They illustrate a product interaction.

JSON field comparison and reporting are real application logic. Expected values are user-defined and never changed by a suggestion. Edits invalidate comparisons. Changing a document clears its saved incumbent output to prevent comparing mismatched inputs. Prompt changes affect the target while the saved incumbent baseline stays fixed. All data stays in the browser session until exported; there is no storage or telemetry.

A production implementation would reuse existing Fireworks datasets, Eval Protocol and GEPA. They are not connected here. The small sample is not a held-out evaluation or a launch decision.

## Run and publish

Serve `docs/` with any static web server, for example `python3 -m http.server 8080 --directory docs`.

Run `npm test` for the core behavior checks. No dependency install or build is required. GitHub Pages serves `/docs` on `main`. The one-page overview is `docs/overview.pdf`.
