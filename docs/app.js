import {MODEL,SCHEMA,ORIGINAL_PROMPT,SAMPLE_CASES,SAVED_INCUMBENT,clone,makeResults,summarize,transitions,revise,format,validateExpected,simulateExtraction,suggestAdditions,classifyCheck,migrationSummary,migrationFailures} from './core.js';
const $=id=>document.getElementById(id);
const esc=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const freshCases=()=>clone(SAMPLE_CASES).map((c,i)=>({...c,rawExpected:JSON.stringify(c.expected,null,2),rawIncumbent:JSON.stringify(SAVED_INCUMBENT[i],null,2)}));
let state={prompt:ORIGINAL_PROMPT,cases:freshCases(),selected:0,incumbent:null,before:null,after:null,additions:null,revised:null,snapshot:null,runAt:null};
function status(message,error=false){$('status').textContent=message;$('status').classList.toggle('error',error);$('status').hidden=!message;}
function progress(step){for(let n=1;n<=3;n++){$('step-'+n).classList.toggle('current',n===step);$('step-'+n).classList.toggle('done',n<step);}}
function invalidate(message=''){
 state.incumbent=null;state.before=null;state.after=null;state.additions=null;state.revised=null;state.snapshot=null;
 $('results-empty').hidden=false;$('results-content').hidden=true;$('revision-panel').hidden=true;$('results-limit').hidden=true;$('export').disabled=true;$('result-badge').textContent='Ready to compare';progress(1);status(message);
}
function renderCase(){
 const c=state.cases[state.selected];
 $('case-tabs').innerHTML=state.cases.map((x,i)=>`<button class="case-tab ${i===state.selected?'selected':''}" role="tab" aria-selected="${i===state.selected}" aria-controls="case-editor" aria-label="Example ${i+1}: ${esc(x.name)}" data-case="${i}">0${i+1}</button>`).join('');
 $('case-name').textContent=c.name;$('case-position').textContent=(state.selected+1)+' / 4';$('case-note').textContent=c.note;
 $('case-input').value=c.input;$('case-expected').value=c.rawExpected;$('case-incumbent').value=c.rawIncumbent;$('input-error').hidden=true;
 document.querySelectorAll('.case-tab').forEach(b=>b.onclick=()=>{state.selected=Number(b.dataset.case);renderCase();});
}
function snapshot(){
 if(!state.prompt.trim())throw new Error('Add an extraction prompt before comparing.');
 return {prompt:state.prompt.trim(),cases:state.cases.map((c,i)=>{
  if(!c.input.trim())throw new Error('Example '+(i+1)+' needs document text.');
  let expected,incumbent;let field='expected output';
  try{expected=JSON.parse(c.rawExpected);validateExpected(expected);field='saved Claude output';incumbent=JSON.parse(c.rawIncumbent);}
  catch(e){state.selected=i;renderCase();$('input-error').textContent=e instanceof SyntaxError?'Provide valid JSON for the '+field+'.':e.message;$('input-error').hidden=false;throw new Error('Check the '+field+' in example '+(i+1)+'.');}
  return {id:c.id,name:c.name,input:c.input.trim(),expected,incumbent};
 })};
}
const modelCell=(check)=>`<td class="${check.pass?'check-pass':'check-fail'}"><span class="field-state" aria-label="${check.pass?'Pass':'Fail'}">${check.pass?'✓':'×'}</span>${esc(format(check.actual))}</td>`;
function renderResults(){
 const before=state.before,after=state.after,incumbent=state.incumbent;if(!before)return;
 const target=after||before;const gap=migrationSummary(incumbent,target),oldGap=migrationSummary(incumbent,before),delta=after?transitions(before,after):null;
 const firstFail=target.findIndex(r=>r.checks.some(c=>classifyCheck(incumbent.find(x=>x.id===r.id).checks.find(x=>x.field===c.field),c)==='regression'));
 const firstOpen=firstFail>=0?firstFail:Math.max(0,target.findIndex(r=>!r.pass));
 $('results-empty').hidden=true;$('results-content').hidden=false;$('results-limit').hidden=false;$('export').disabled=false;$('result-badge').textContent='SIMULATED';
 const stage=(title,subtitle,results,selected=false)=>{const s=results?summarize(results):null;return `<div class="stage-card ${selected?'active':''}"><span>${title}</span><strong>${s?s.fields:'—'}<small>${s?' / 16':''}</small></strong><p>${subtitle}</p></div>`;};
 const stages=`<div class="stage-cards">${stage('Claude · saved baseline','Authored sample outputs',incumbent)}${stage('Kimi · original prompt','Same dataset & checks',before,!after)}${stage('Kimi · adapted prompt',after?'Same dataset & checks':'Review a revision below',after,!!after)}</div><div class="score-caption">Field checks passed against expected values. Claude is also checked for correctness.</div>`;
 const summary=`<div class="migration-summary"><div><strong class="${gap.regressions?'negative':'positive'}">${gap.regressions}</strong><span>Migration regressions<small>Claude passes · Kimi fails</small></span></div><div><strong>${gap.sharedFailures}</strong><span>Shared failures<small>Both fail the requirement</small></span></div><div><strong>${gap.improvements}</strong><span>Target improvements<small>Claude fails · Kimi passes</small></span></div></div>`;
 let message=gap.regressions?`${gap.regressions} field check${gap.regressions===1?'':'s'} passed by Claude ${gap.regressions===1?'fails':'fail'} on Kimi. Inspect these migration regressions first.`:'No migration regressions in these four examples.';
 if(!gap.regressions && gap.sharedFailures)message+=' Shared failures still need attention; matching the baseline does not mean every requirement passes.';
 const note=`<div class="comparison-note ${gap.regressions?'has-gap':''}">${message}${after?`<small>After adaptation: ${oldGap.regressions} → ${gap.regressions} migration regressions. ${delta.regressed} checks newly failing versus Kimi’s original prompt.</small>`:''}</div>`;
 const labels={regression:'Migration regression',shared:'Shared failure',improvement:'Target improvement',pass:'Passes'};
 const casesHtml=target.map((r,i)=>{
  const baseline=incumbent.find(x=>x.id===r.id),original=before.find(x=>x.id===r.id),counts=migrationSummary([baseline],[r]);
  const badge=counts.regressions?`${counts.regressions} regression${counts.regressions===1?'':'s'}`:counts.sharedFailures?'Shared failure':r.pass?'Passes':'Check output';
  return `<details data-case="${i}" class="case-result" ${i===firstOpen?'open':''}><summary><span class="state-icon ${r.pass?'':'fail'}">${r.pass?'✓':'×'}</span><span>${esc(r.name)}</span><span class="summary-score">${badge}</span></summary><table class="check-table migration-table"><thead><tr><th>Requirement</th><th>Expected</th><th>Claude<br><span>Saved</span></th><th>Kimi<br><span>Original</span></th><th>Kimi<br><span>Adapted</span></th></tr></thead><tbody>${r.checks.map(c=>{
    const saved=baseline.checks.find(x=>x.field===c.field),old=original.checks.find(x=>x.field===c.field),kind=classifyCheck(saved,c);
    const resolved=after && kind==='pass' && classifyCheck(saved,old)==='regression';
    return `<tr><td>${esc(c.field)}<small class="check-kind ${resolved?'improvement':kind}">${resolved?'Resolved regression':labels[kind]}</small></td><td>${esc(format(c.expected))}</td>${modelCell(saved)}${modelCell(old)}${after?modelCell(c):'<td class="not-run">Not run</td>'}</tr>`;
  }).join('')}</tbody></table>${[baseline,original,after?r:null].some(x=>x?.extra.length)?'<p class="extra-warning">Unexpected JSON keys also fail the example. See the full outputs in the export.</p>':''}</details>`;
 }).join('');
 let action='';
 if(!state.additions){action=gap.regressions?'<div class="result-actions"><button id="suggest" class="button secondary wide">Review adaptation for migration regressions <span aria-hidden="true">→</span></button><p>Illustrates a review step using existing prompt optimization capabilities.</p></div>':'<div class="result-actions"><div class="all-pass">No migration-specific revision is needed for these checks.</div></div>';}
 $('results-content').innerHTML=stages+summary+note+`<div class="result-meta"><span>All three stages use the same expected values</span><span>${after?'Latest: adapted prompt':'Latest: original prompt'}</span></div>`+casesHtml+action;
 state.selected=firstOpen;renderCase();
 document.querySelectorAll('.case-result>summary').forEach(summary=>summary.onclick=()=>{state.selected=Number(summary.parentElement.dataset.case);renderCase();});
 if($('suggest'))$('suggest').onclick=suggest;
}
function run(){
 try{const snap=snapshot();state.snapshot=snap;state.incumbent=makeResults(snap.cases,snap.cases.map(c=>c.incumbent));state.before=makeResults(snap.cases,snap.cases.map(c=>simulateExtraction(c.input,snap.prompt)));state.after=null;state.additions=null;state.revised=null;state.runAt=new Date().toISOString();$('revision-panel').hidden=true;status('');renderResults();progress(2);}catch(e){status(e.message,true);}
}
function suggest(){
 if(!state.before)return;
 const additions=suggestAdditions(migrationFailures(state.incumbent,state.before),state.snapshot.prompt);
 if(!additions.length){status('No supported sample adaptation was found. This demo only suggests clarifications for invoice IDs, seller selection, and missing totals.');return;}
 state.additions=additions;state.revised=revise(state.snapshot.prompt,additions);status('');renderResults();
 $('revision-rules').innerHTML=additions.map((a,i)=>`<div class="revision-rule"><span class="added-label">+ ADDITION 0${i+1}</span><p>${esc(a.instruction)}</p><div class="reason">${esc(a.reason)} This check passes in the saved Claude baseline.</div></div>`).join('');
 $('revised-prompt').textContent=state.revised;$('revision-panel').hidden=false;progress(2);$('revision-panel').scrollIntoView({behavior:'smooth',block:'start'});
}
function rerun(){
 if(!state.revised)return;
 state.after=makeResults(state.snapshot.cases,state.snapshot.cases.map(c=>simulateExtraction(c.input,state.revised)));status('');renderResults();progress(3);$('results-content').scrollIntoView({behavior:'smooth',block:'start'});
}
function exportSession(){
 if(!state.before)return;
 const payload={tool:'Fireworks migration check prototype',version:2,provenance:'Authored Claude baseline fixtures and local rule-based Kimi simulation. No model calls were made. Results do not measure or predict either model.',created_at:state.runAt,incumbent_label:'Claude (synthetic saved baseline; no version claim)',target_model_label:MODEL,schema:SCHEMA,original_prompt:state.snapshot.prompt,revised_prompt:state.revised,proposed_additions:state.additions,examples:state.snapshot.cases,incumbent_results:state.incumbent,original_results:state.before,revised_results:state.after,migration_before:migrationSummary(state.incumbent,state.before),migration_after:state.after?migrationSummary(state.incumbent,state.after):null,revision_changes:state.after?transitions(state.before,state.after):null,production_design:'Reuse existing Fireworks datasets, Eval Protocol evaluators and GEPA prompt optimization. These services are not connected in this prototype.',limitations:'Four illustrative invoice examples, not a representative or held-out test set. Baseline parity does not establish correctness or production readiness.'};
 const url=URL.createObjectURL(new Blob([JSON.stringify(payload,null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download='fireworks-migration-comparison.json';document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);status('Comparison exported as JSON, including all three stages and simulation provenance.');
}
$('run').onclick=run;$('rerun').onclick=rerun;$('export').onclick=exportSession;
$('reset').onclick=()=>{state.prompt=ORIGINAL_PROMPT;state.cases=freshCases();state.selected=0;$('prompt').value=state.prompt;invalidate();renderCase();};
$('prompt').oninput=()=>{state.prompt=$('prompt').value;invalidate('Target prompt changed. Compare again; the saved incumbent baseline stays fixed.');};
$('case-input').oninput=()=>{const c=state.cases[state.selected];c.input=$('case-input').value;c.rawIncumbent='';$('case-incumbent').value='';invalidate('Document changed. Add the corresponding saved Claude output before comparing, or reset the sample.');};
$('case-expected').oninput=()=>{state.cases[state.selected].rawExpected=$('case-expected').value;$('input-error').hidden=true;invalidate('Requirement changed. Compare again to rescore both models.');};
$('case-incumbent').oninput=()=>{state.cases[state.selected].rawIncumbent=$('case-incumbent').value;$('input-error').hidden=true;invalidate('Saved baseline changed. Compare again to refresh migration regressions.');};
$('prompt').value=state.prompt;renderCase();
