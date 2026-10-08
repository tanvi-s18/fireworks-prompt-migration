# Fireworks prompt migration

An interactive **desktop console concept** for adapting extraction prompts during a move to Fireworks. This is a take-home prototype, not an official Fireworks feature.

## Scope

- Edit an existing extraction prompt and four invoice examples with expected JSON.
- Run a local simulation and inspect field-level mismatches.
- Review a proposed prompt clarification, then compare original and revised results.
- Export the prompts, examples, checks, and prototype provenance as JSON.

## Simulation boundary

No API keys, accounts, inference requests, or server are required. All responses and revisions are produced by a limited, deterministic browser simulation. It recognizes the invoice labels used by the examples and three clarification rules: preserve invoice IDs, use the issuing seller, and avoid substituting a subtotal for a missing final total. Ambiguous currency deliberately remains unresolved in the supplied example. These results do not measure or predict Kimi behavior. Arbitrary prompt changes and arbitrary document formats are outside the simulation's scope.

The JSON field comparison and before/after reporting are real application logic. Expected values are user-defined and never changed by a suggestion. Input edits invalidate old results. All data stays in the current browser session until exported; there is no storage or telemetry.

## Run and publish

Serve `docs/` with any static web server, for example `python3 -m http.server 8080 --directory docs`.

Run `npm test` for the core behavior checks. No dependency install or build is required. GitHub Pages serves the `/docs` directory on `main`. The one-page overview is `docs/overview.pdf`.
