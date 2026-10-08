import {SCHEMA,migrationSummary,transitions} from './core.js';
export function createComparisonExport(state) {
  return {
    tool:'Fireworks first migration eval prototype',version:4,
    provenance:'Limited local rule-based simulation. All current-model choices share one illustrative baseline profile; all Fireworks model choices share one target profile. No model calls were made. Results do not measure or predict any model.',
    created_at:state.runAt,
    source_model:state.snapshot.sourceModel,target_model:state.snapshot.targetModel,
    schema:SCHEMA,original_prompt:state.snapshot.prompt,
    revised_prompt:state.after?state.testedPrompt:null,
    proposed_additions:state.additions||[],
    applied_additions:state.after?state.appliedAdditions:[],
    examples:state.snapshot.cases,incumbent_results:state.incumbent,
    original_results:state.before,revised_results:state.after,
    migration_before:migrationSummary(state.incumbent,state.before),
    migration_after:state.after?migrationSummary(state.incumbent,state.after):null,
    revision_changes:state.after?transitions(state.before,state.after):null,
    production_design:'A first-eval onboarding flow using existing Fireworks datasets, Eval Protocol and GEPA. These services are not connected in this prototype.',
    limitations:'Four synthetic invoice examples, not a representative or held-out dataset. Model choices label the workflow, not measured performance. Baseline parity does not establish correctness or production readiness.',
  };
}
