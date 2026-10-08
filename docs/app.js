import {MODEL,SCHEMA,FIELDS,ORIGINAL_PROMPT,SAMPLE_CASES,clone,makeResults,summarize,transitions,revise,format,validateExpected,simulateExtraction,suggestAdditions} from './core.js';
const $=id=>document.getElementById(id);
const esc=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const freshCases=()=>clone(SAMPLE_CASES).map(c=>({...c,rawExpected:JSON.stringify(c.expected,null,2)}));
let state={prompt:ORIGINAL_PROMPT,cases:freshCases(),selected:0,before:null,after:null,additions:null,revised:null,snapshot:null,view:'before',runAt:null};
function status(message,error=false){$('status').textContent=message;$('status').classList.toggle('error',error);$('status').hidden=!message;}
function progress(step){for(let n=1;n<=3;n++){$('step-'+n).classList.toggle('current',n===step);$('step-'+n).classList.toggle('done',n<step);}}
function invalidate(message=''){
 state.before=null;state.after=null;state.additions=null;state.revised=null;state.snapshot=null;state.view='before';
 $('results-empty').hidden=false;$('results-content').hidden=true;$('revision-panel').hidden=true;$('results-limit').hidden=true;$('export').disabled=true;$('result-badge').textContent='Not run';progress(1);status(message);
}
function renderCase(){
 const c=state.cases[state.selected];
 $('case-tabs').innerHTML=state.cases.map((x,i)=>`<button class="case-tab ${i===state.selected?'selected':''}" role="tab" aria-selected="${i===state.selected}" aria-controls="case-editor" aria-label="Example ${i+1}: ${esc(x.name)}" data-case="${i}">0${i+1}</button>`).join('');
 $('case-name').textContent=c.name;$('case-position').textContent=(state.selected+1)+' / 4';$('case-note').textContent=c.note;
 $('case-input').value=c.input;$('case-expected').value=c.rawExpected;$('input-error').hidden=true;
 document.querySelectorAll('.case-tab').forEach(b=>b.onclick=()=>{state.selected=Number(b.dataset.case);renderCase();});
}
function snapshot(){
 if(!state.prompt.trim())throw new Error('Add an extraction prompt before running.');
 return {prompt:state.prompt.trim(),cases:state.cases.map((c,i)=>{
  if(!c.input.trim())throw new Error('Example '+(i+1)+' needs document text.');
  let expected;try{expected=JSON.parse(c.rawExpected);validateExpected(expected);}catch(e){state.selected=i;renderCase();$('input-error').textContent=e instanceof SyntaxError?'Expected output must be valid JSON.':e.message;$('input-error').hidden=false;throw new Error('Check the expected output in example '+(i+1)+'.');}
  return {id:c.id,name:c.name,input:c.input.trim(),expected};
 })};
}
function renderResults(){
 const before=state.before,after=state.after;if(!before)return;
 const shown=state.view==='after'&&after?after:before;const stats=summarize(shown),old=summarize(before),delta=after?transitions(before,after):null;
 const failed=shown.reduce((n,r)=>n+r.checks.filter(c=>!c.pass).length+r.extra.length,0);
 const firstFail=shown.findIndex(r=>!r.pass);const revised=state.view==='after'&&after;
 $('results-empty').hidden=true;$('results-content').hidden=false;$('results-limit').hidden=false;$('export').disabled=false;$('result-badge').textContent='SIMULATED';
 const statHtml=`<div class="stats"><div><div class="stat-label">Examples passed</div><div class="stat-value">${stats.cases}<span> / 4</span></div><div class="stat-caption">${revised?'Original: '+old.cases+' / 4':'All four fields match'}</div></div><div><div class="stat-label">Field checks passed</div><div class="stat-value">${stats.fields}<span> / 16</span></div><div class="stat-caption">${revised?'Original: '+old.fields+' / 16':'Exact values, fixed rules'}</div></div><div><div class="stat-label">${revised?'Checks improved':'Failed checks'}</div><div class="stat-value ${revised?'positive':failed?'negative':''}">${revised?'+'+delta.fixed:failed}</div><div class="stat-caption">${revised?delta.regressed+' newly failing':'Inspect the differences'}</div></div></div>`;
 const note=revised?`<div class="comparison-note">${delta.fixed} improved · ${delta.regressed} regressed · ${failed} still failing. Simulated results.</div>`:'';
 const casesHtml=shown.map((r,i)=>`<details class="case-result" ${i===firstFail?'open':''}><summary><span class="state-icon ${r.pass?'':'fail'}">${r.pass?'✓':'×'}</span><span>${esc(r.name)}</span><span class="summary-score">${r.checks.filter(c=>c.pass).length} / 4</span></summary><table class="check-table"><thead><tr><th>Field</th><th>Expected</th><th>Returned</th></tr></thead><tbody>${r.checks.map(c=>`<tr class="${c.pass?'':'mismatch'}"><td><span class="field-state ${c.pass?'positive':'negative'}">${c.pass?'✓':'×'}</span>${esc(c.field)}</td><td>${esc(format(c.expected))}</td><td>${esc(format(c.actual))}</td></tr>`).join('')}</tbody></table></details>`).join('');
 let action='';
 if(!state.additions){action=failed?'<div class="result-actions"><button id="suggest" class="button secondary wide">Suggest a revision <span aria-hidden="true">✦</span></button><p>Review a proposed clarification for the sample failures.</p></div>':'<div class="result-actions"><div class="all-pass">All examples passed. No revision needed.</div></div>';}
 $('results-content').innerHTML=statHtml+`<div class="result-meta"><span>Sample responses · Local simulation</span>${after?`<div class="switch-results" aria-label="Result version"><button id="view-before" class="${state.view==='before'?'selected':''}" aria-pressed="${state.view==='before'}">Original</button><button id="view-after" class="${state.view==='after'?'selected':''}" aria-pressed="${state.view==='after'}">Revised</button></div>`:'<span>v1 · original prompt</span>'}</div>`+note+casesHtml+action;
 if($('suggest'))$('suggest').onclick=suggest;
 if(after){$('view-before').onclick=()=>{state.view='before';renderResults();};$('view-after').onclick=()=>{state.view='after';renderResults();};}
}
function run(){
 try{const snap=snapshot();state.snapshot=snap;state.before=makeResults(snap.cases,snap.cases.map(c=>simulateExtraction(c.input,snap.prompt)));state.after=null;state.additions=null;state.revised=null;state.view='before';state.runAt=new Date().toISOString();$('revision-panel').hidden=true;status('');renderResults();progress(2);}catch(e){status(e.message,true);}
}
function suggest(){
 if(!state.before)return;
 const additions=suggestAdditions(state.before,state.snapshot.prompt);
 if(!additions.length){status('No supported sample revision was found. Inspect the inputs and expected values. This prototype only suggests clarifications for invoice IDs, seller selection, and missing totals.');return;}
 state.additions=additions;state.revised=revise(state.snapshot.prompt,additions);status('');renderResults();
 $('revision-rules').innerHTML=additions.map((a,i)=>`<div class="revision-rule"><span class="added-label">+ ADDITION 0${i+1}</span><p>${esc(a.instruction)}</p><div class="reason">${esc(a.reason)}</div></div>`).join('');
 $('revised-prompt').textContent=state.revised;$('revision-panel').hidden=false;progress(2);$('revision-panel').scrollIntoView({behavior:'smooth',block:'start'});
}
function rerun(){
 if(!state.revised)return;
 state.after=makeResults(state.snapshot.cases,state.snapshot.cases.map(c=>simulateExtraction(c.input,state.revised)));state.view='after';status('');renderResults();progress(3);$('results-content').scrollIntoView({behavior:'smooth',block:'start'});
}
function exportSession(){
 if(!state.before)return;
 const payload={tool:'Fireworks prompt migration prototype',version:1,provenance:'Local rule-based simulation for the supplied invoice examples. No model calls were made. Results do not measure or predict Kimi performance.',created_at:state.runAt,target_model_label:MODEL,schema:SCHEMA,original_prompt:state.snapshot.prompt,revised_prompt:state.revised,proposed_additions:state.additions,examples:state.snapshot.cases,original_results:state.before,revised_results:state.after,limitations:'Prototype supports the sample document labels and three explicit clarification rules. No incumbent baseline, held-out evaluation, or production readiness claim.'};
 const url=URL.createObjectURL(new Blob([JSON.stringify(payload,null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download='fireworks-prompt-migration.json';document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);status('Session exported as JSON. It includes the prototype provenance and both sets of results.');
}
$('run').onclick=run;$('rerun').onclick=rerun;$('export').onclick=exportSession;
$('reset').onclick=()=>{state.prompt=ORIGINAL_PROMPT;state.cases=freshCases();state.selected=0;$('prompt').value=state.prompt;invalidate();renderCase();};
$('prompt').oninput=()=>{state.prompt=$('prompt').value;invalidate('Prompt changed. Run again to refresh the simulated results.');};
$('case-input').oninput=()=>{state.cases[state.selected].input=$('case-input').value;invalidate('Document changed. Run again to refresh the simulated results.');};
$('case-expected').oninput=()=>{state.cases[state.selected].rawExpected=$('case-expected').value;$('input-error').hidden=true;invalidate('Expected output changed. Run again to check against these requirements.');};
$('prompt').value=state.prompt;renderCase();
