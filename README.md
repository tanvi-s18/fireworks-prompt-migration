# Your first migration eval

A **desktop onboarding concept inside Fireworks Evaluations** for developers who have a working Claude or GPT prompt and a few examples, but no evaluation setup. This is a take-home prototype, not an official Fireworks feature.

[Open prototype](https://tanvi-s18.github.io/fireworks-prompt-migration/) · [One-page overview](https://tanvi-s18.github.io/fireworks-prompt-migration/overview.pdf)

## Product hypothesis

A guided first migration evaluation could reduce setup effort for developers without an existing eval suite. This is an unvalidated hypothesis. Developers who already use evals and prompt optimization should use their existing workflow.

Fireworks already provides datasets, evaluation jobs, custom evaluators, and [GEPA prompt optimization through Eval Protocol](https://fireworks.ai/blog/self-improving-agent). Production would create a reusable dataset and eval from the starter examples and use these existing capabilities. This prototype is not connected to those services and does not create a hosted eval.

## Critical path

1. **Set up comparison.** Choose from seven Claude/GPT baseline models and eight Fireworks candidates. Edit your prompt and the four starter examples with expected JSON.
2. **Inspect results.** Review one example at a time. Separate migration regressions (current model passes, candidate fails), shared failures, and candidate improvements.
3. **Choose prompt edits.** Check or uncheck each suggested addition. A live preview includes only selected changes. Test the selection to advance to the final review. This step shows the individual additions, not the full prompt.
4. **Review final prompt.** See the exact tested prompt first, compare all three stages, inspect remaining failures, and copy the updated prompt. Comparison export is intentionally omitted; the proposed production integration would save the dataset, prompt versions, and evaluation run within Fireworks.

The four steps move forward: setup, comparison, edit selection, final review. Reruns open step 4 rather than jumping back to step 2. Steps preserve inputs when navigating back. Editing setup invalidates comparisons. Changing the selected adaptations clears the adapted run until retested; untested changes are never shown as the tested prompt. With no additions selected, the original prompt stays unchanged and the rerun button is disabled.

The demo is explicitly limited to invoice extraction with four fixed JSON fields. Expected values define correctness. Current-model outputs are evaluated too. Equal aggregate scores do not establish parity; regressions are tracked per field. Parity does not establish correctness or production readiness. Cards show both field checks and complete examples passed: the fully adapted sample passes 15/16 fields but only 3/4 complete examples.

## Simulation boundary

Both model responses and prompt suggestions use a limited deterministic browser simulation. All current-model choices share one illustrative incumbent profile; all Fireworks candidates share one target profile. The selectors change comparison labels, not measured performance. Model labels follow the [Fireworks model guide](https://docs.fireworks.ai/guides/recommended-models), with Kimi K2.5 retained as the original sample choice. The simulation parses the sample invoice labels and recognizes three target prompt clarifications: preserve invoice IDs, use the issuing seller, and avoid substituting a subtotal for a missing final total. Arbitrary prompt behavior and document formats are outside its scope.

The default sample has 3 migration regressions and 1 shared failure, then 0 migration regressions and 1 shared failure after all three edits. Selecting just one edit fixes only its corresponding check and leaves two migration regressions. These are invented behaviors, not measured or predicted model results.

The incumbent simulation reads the document independently of expected values, using a fixed behavior profile that does not respond to edits to the prompt. Edits invalidate results, and rerunning regenerates both outputs. Expected values are never changed by suggestions; incumbent results stay fixed during the adaptation rerun. Data stays in the browser session unless the user copies the tested prompt; there is no storage or telemetry. No API keys, accounts, inference requests, or backend are used.

The four starter examples are not a representative or held-out evaluation. A production migration decision requires broader data and repeated runs.

## Run and publish

Serve `docs/` with a static web server, for example `python3 -m http.server 8080 --directory docs`.

Run `npm test` for core behavior checks. No dependency install or build is required. GitHub Pages serves `/docs` on `main`. The one-page overview is `docs/overview.pdf`.
