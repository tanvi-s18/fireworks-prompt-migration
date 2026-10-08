# Your first migration eval

A **desktop onboarding concept inside Fireworks Evaluations** for developers who have a working Claude or GPT prompt and a few examples, but no evaluation setup. This is a take-home prototype, not an official Fireworks feature.

[Open prototype](https://tanvi-s18.github.io/fireworks-prompt-migration/) · [One-page overview](https://tanvi-s18.github.io/fireworks-prompt-migration/overview.pdf)

## Product hypothesis

A guided first migration evaluation could reduce setup effort for developers without an existing eval suite. This is an unvalidated hypothesis. Developers who already use evals and prompt optimization should use their existing workflow.

Fireworks already provides datasets, evaluation jobs, custom evaluators, and [GEPA prompt optimization through Eval Protocol](https://fireworks.ai/blog/self-improving-agent). Production would create a reusable dataset and eval from the starter examples and use these existing capabilities. This prototype is not connected to those services and does not create a hosted eval.

## Critical path

1. Choose the current provider: Claude or OpenAI (GPT).
2. Bring a working prompt and starter examples with expected JSON. Four synthetic invoice examples are ready to try.
3. Run the comparison. Current-provider results appear alongside Kimi results; no manual baseline-output form or credentials are required.
4. Inspect migration regressions (current model passes, Kimi fails), shared failures (both fail), and target improvements (current model fails, Kimi passes).
5. Review a proposed prompt adaptation and compare all three stages against unchanged requirements.
6. Export prompts, examples, outputs, checks, comparisons, and simulation provenance as JSON.

Expected values define correctness. Current-model outputs are evaluated too. Equal aggregate scores do not establish parity; regressions are tracked per field. Parity does not establish correctness or production readiness.

## Simulation boundary

Both model responses and prompt suggestions use a limited deterministic browser simulation. The Claude and OpenAI choices share the same illustrative incumbent behavior; the selector changes provider labels, not measured performance. The simulation parses the sample invoice labels and recognizes three target prompt clarifications: preserve invoice IDs, use the issuing seller, and avoid substituting a subtotal for a missing final total. Arbitrary prompt behavior and document formats are outside its scope.

The default sample has 3 migration regressions and 1 shared failure, then 0 migration regressions and 1 shared failure after adaptation. These are invented behaviors, not measured or predicted model results.

The incumbent simulation reads the document independently of expected values. Edits invalidate results, and rerunning regenerates both outputs. Expected values are never changed by suggestions; incumbent results stay fixed during the adaptation rerun. All data stays in the browser session until exported; there is no storage or telemetry. No API keys, accounts, inference requests, or backend are used.

The four starter examples are not a representative or held-out evaluation. A production migration decision requires broader data and repeated runs.

## Run and publish

Serve `docs/` with a static web server, for example `python3 -m http.server 8080 --directory docs`.

Run `npm test` for core behavior checks. No dependency install or build is required. GitHub Pages serves `/docs` on `main`. The one-page overview is `docs/overview.pdf`.
