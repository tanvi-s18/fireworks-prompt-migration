import {ORIGINAL_PROMPT,SAMPLE_CASES,simulateIncumbent,clone,makeResults,summarize,transitions,revise,format,validateExpected,simulateExtraction,suggestAdditions,classifyCheck,migrationSummary,migrationFailures} from './core.js';
import {SOURCE_MODELS,TARGET_MODELS} from './models.js';
import {createComparisonExport} from './export.js';
const $=id=>document.getElementById(id);
const esc=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const freshCases=()=>clone(SAMPLE_CASES).map(c=>({...c,rawExpected:JSON.stringify(c.expected,null,2)}));
const state={screen:'setup',sourceId:SOURCE_MODELS[0].id,targetId:TARGET_MODELS[0].id,prompt:ORIGINAL_PROMPT,cases:freshCases(),selected:0,resultSelected:1,incumbent:null,before:null,after:null,additions:null,selectedEdits:new Set(),appliedAdditions:[],testedPrompt:null,snapshot:null,runAt:null};
const sourceModel=()=>SOURCE_MODELS.find(m=>m.id===state.sourceId);
const targetModel=()=>TARGET_MODELS.find(m=>m.id===state.targetId);
const pickedAdditions=()=>state.additions?.filter(a=>state.selectedEdits.has(a.id))||[];
function status(message='',error=false){$('status').textContent=message;$('status').classList.toggle('error',error);$('status').hidden=!message;}
function updateSteps(){
 for(const [i,name] of ['setup','results','adapt'].entries()){
  const button=$('step-'+name),current=state.screen===name;
  button.classList.toggle('current',current);button.classList.toggle('done',name==='setup'&&!!state.before || name==='results'&&!!state.additions);
  if(current)button.setAttribute('aria-current','step');else button.removeAttribute('aria-current');
  button.disabled=name==='results'?!state.before:name==='adapt'?!state.additions:false;
 }
}
function showScreen(name){
 if(name!=='setup'&&!state.before || name==='adapt'&&!state.additions)return;
 state.screen=name;
 for(const screen of ['setup','results','adapt'])$('screen-'+screen).hidden=screen!==name;
 updateSteps();
 $(name==='setup'?'setup-heading':name==='results'?'results-heading':'adapt-heading').focus({preventScroll:true});
 window.scrollTo({top:0,behavior:'instant'});
}
function clearAdapted(){state.after=null;state.testedPrompt=null;state.appliedAdditions=[];}
function invalidate(){
 const hadResults=!!state.before;
 state.incumbent=null;state.before=null;state.additions=null;state.selectedEdits=new Set();state.snapshot=null;clearAdapted();updateSteps();
 status(hadResults?'Setup changed. Run the comparison again to refresh both results.':'');
}
function renderCase(){
 const c=state.cases[state.selected];
 $('case-tabs').innerHTML=state.cases.map((x,i)=>`<button class="case-tab ${i===state.selected?'selected':''}" role="tab" aria-selected="${i===state.selected}" aria-controls="case-editor" aria-label="${esc(x.name)}" data-case="${i}">Example ${i+1}</button>`).join('');
 $('case-input').value=c.input;$('case-expected').value=c.rawExpected;$('input-error').hidden=true;
 document.querySelectorAll('.case-tab').forEach(b=>b.onclick=()=>{state.selected=Number(b.dataset.case);renderCase();});
}
function snapshot(){
 if(!state.prompt.trim()){ $('prompt').focus();throw new Error('Add an extraction prompt before comparing.'); }
 return {sourceModel:clone(sourceModel()),targetModel:clone(targetModel()),prompt:state.prompt.trim(),cases:state.cases.map((c,i)=>{
  const fail=message=>{state.selected=i;renderCase();$('input-error').textContent=message;$('input-error').hidden=false;};
  if(!c.input.trim()){fail('Add document text for this example.');$('case-input').focus();throw new Error('Example '+(i+1)+' needs document text.');}
  let expected;
  try{expected=JSON.parse(c.rawExpected);validateExpected(expected);}
  catch(e){fail(e instanceof SyntaxError?'Provide valid JSON for the expected output.':e.message);$('case-expected').focus();throw new Error('Check the expected output in example '+(i+1)+'.');}
  return {id:c.id,name:c.name,input:c.input.trim(),expected,incumbent:simulateIncumbent(c.input.trim())};
 })};
}
function selectFirstFailure(){
 const results=state.after||state.before;
 const regression=results.findIndex(r=>migrationSummary([state.incumbent.find(x=>x.id===r.id)],[r]).regressions);
 state.resultSelected=regression>=0?regression:Math.max(0,results.findIndex(r=>!r.pass));
}
function run(){
 try{
  state.snapshot=snapshot();const s=state.snapshot;
  state.incumbent=makeResults(s.cases,s.cases.map(c=>c.incumbent));
  state.before=makeResults(s.cases,s.cases.map(c=>simulateExtraction(c.input,s.prompt)));
  state.additions=null;state.selectedEdits=new Set();clearAdapted();state.runAt=new Date().toISOString();
  status();selectFirstFailure();renderResults();showScreen('results');
 }catch(e){status(e.message,true);}
}
const modelCell=check=>`<td class="${check.pass?'check-pass':'check-fail'}"><span class="field-state" aria-label="${check.pass?'Pass':'Fail'}">${check.pass?'✓':'×'}</span>${esc(format(check.actual))}</td>`;
function renderResults(){
 if(!state.before)return;
 const {incumbent,before,after}=state,target=after||before;
 const source=state.snapshot.sourceModel.name,candidate=state.snapshot.targetModel.name;
 const gap=migrationSummary(incumbent,target),oldGap=migrationSummary(incumbent,before),delta=after?transitions(before,after):null;
 $('results-subtitle').textContent=source+' → '+candidate+' · 4 examples · 16 field checks';
 const stage=(name,label,results,active=false)=>{const s=summarize(results);return `<div class="panel stage-card ${active?'active':''}"><div><h3>${esc(name)}</h3><p>${label}</p></div><strong>${s.fields}<small> / ${s.total}</small></strong></div>`;};
 const stages=`<div class="stage-cards ${after?'three':''}">${stage(source,'Current model · original prompt',incumbent)}${stage(candidate,'Candidate · original prompt',before,!after)}${after?stage(candidate,`Adapted · ${state.appliedAdditions.length} edit${state.appliedAdditions.length===1?'':'s'} applied`,after,true):''}</div><p class="score-caption">Field checks passed against expected values. All results are simulated.</p>`;
 const summary=`<div class="migration-summary"><div><strong class="${gap.regressions?'negative':'positive'}">${gap.regressions}</strong><span>Migration regressions<small>Current passes · candidate fails</small></span></div><div><strong>${gap.sharedFailures}</strong><span>Shared failures<small>Both fail the requirement</small></span></div><div><strong>${gap.improvements}</strong><span>Candidate improvements<small>Current fails · candidate passes</small></span></div></div>`;
 let message=gap.regressions?'Inspect the checks that passed on your current model and failed on the candidate.':'No migration regressions in these four examples.';
 if(after)message=`<strong>${oldGap.regressions} → ${gap.regressions} migration regressions.</strong> ${delta.fixed} check${delta.fixed===1?'':'s'} fixed; ${delta.regressed} newly failing after your ${state.appliedAdditions.length} selected edit${state.appliedAdditions.length===1?'':'s'}.`;
 if(!gap.regressions&&gap.sharedFailures)message+=' The shared failure still needs attention.';
 const cases=target.map((r,i)=>{
  const counts=migrationSummary([incumbent.find(x=>x.id===r.id)],[r]);
  const badge=counts.regressions?`${counts.regressions} migration regression${counts.regressions===1?'':'s'}`:counts.sharedFailures?'Shared failure':'All checks pass';
  return `<button class="result-case ${i===state.resultSelected?'selected':''}" data-result="${i}" aria-pressed="${i===state.resultSelected}"><span class="case-number">0${i+1}</span><span>${esc(r.name)}<small>${badge}</small></span></button>`;
 }).join('');
 $('results-content').innerHTML=stages+summary+`<div class="comparison-note ${gap.regressions?'has-gap':''}">${message}</div><div class="result-layout"><div class="result-cases"><div class="section-label">EXAMPLES</div>${cases}</div><div id="result-detail" class="result-detail panel"></div></div>`;
 document.querySelectorAll('.result-case').forEach(b=>b.onclick=()=>{state.resultSelected=Number(b.dataset.result);renderResults();});
 renderResultDetail();
 const supported=suggestAdditions(migrationFailures(incumbent,before),state.snapshot.prompt).length;
 $('choose-edits').hidden=!supported;
 $('choose-edits').textContent=after?'Change selected edits':'Choose prompt edits →';
 $('choose-edits').className='button '+(after?'secondary':'primary');
 $('export').className='button '+(after||!supported?'primary':'secondary');
}
function renderResultDetail(){
 const {incumbent,before,after}=state,target=after||before,index=state.resultSelected;
 const r=target[index],baseline=incumbent.find(x=>x.id===r.id),original=before.find(x=>x.id===r.id);
 const labels={regression:'Migration regression',shared:'Shared failure',improvement:'Candidate improvement',pass:'Passes'};
 $('result-detail').innerHTML=`<div class="panel-header"><h3>${esc(r.name)}</h3><span class="case-badge ${r.pass?'pass':''}">${r.checks.filter(c=>c.pass).length} / 4 checks pass</span></div><table class="check-table"><thead><tr><th>Requirement</th><th>Expected</th><th>Current model<br><span>Original prompt</span></th><th>Candidate<br><span>Original prompt</span></th>${after?'<th>Candidate<br><span>Selected edits</span></th>':''}</tr></thead><tbody>${r.checks.map(c=>{
  const saved=baseline.checks.find(x=>x.field===c.field),old=original.checks.find(x=>x.field===c.field),kind=classifyCheck(saved,c);
  const resolved=after&&kind==='pass'&&classifyCheck(saved,old)==='regression';
  return `<tr><td>${esc(c.field)}<small class="check-kind ${resolved?'improvement':kind}">${resolved?'Resolved regression':labels[kind]}</small></td><td>${esc(format(c.expected))}</td>${modelCell(saved)}${modelCell(old)}${after?modelCell(c):''}</tr>`;
 }).join('')}</tbody></table><details class="document-details"><summary>View input document</summary><pre>${esc(state.snapshot.cases[index].input)}</pre></details>`;
}
const editTitles={invoice_id:'Preserve invoice identifiers',seller_name:'Choose the seller, not the buyer',total:'Keep missing totals empty'};
function chooseEdits(){
 if(!state.before)return;
 if(!state.additions){state.additions=suggestAdditions(migrationFailures(state.incumbent,state.before),state.snapshot.prompt);state.selectedEdits=new Set(state.additions.map(a=>a.id));}
 status();renderAdaptation();showScreen('adapt');
}
function renderAdaptation(){
 $('revision-rules').innerHTML=state.additions.map((a,i)=>`<label class="revision-rule ${state.selectedEdits.has(a.id)?'checked':''}" for="edit-${a.id}"><div class="edit-heading"><input id="edit-${a.id}" type="checkbox" data-edit="${a.id}" ${state.selectedEdits.has(a.id)?'checked':''} aria-label="${esc(editTitles[a.id])}"><strong>${esc(editTitles[a.id])}</strong><span class="edit-number">0${i+1}</span></div><p>${esc(a.instruction)}</p><div class="reason">${esc(a.reason)}</div></label>`).join('');
 document.querySelectorAll('[data-edit]').forEach(input=>input.onchange=()=>{
  if(input.checked)state.selectedEdits.add(input.dataset.edit);else state.selectedEdits.delete(input.dataset.edit);
  input.closest('.revision-rule').classList.toggle('checked',input.checked);
  const hadAfter=!!state.after;clearAdapted();
  if(hadAfter)status('Selection changed. Rerun to see results for these edits.');
  updatePreview();renderResults();
 });
 updatePreview();
}
function updatePreview(){
 const selected=pickedAdditions();
 $('selection-count').textContent=selected.length+' OF '+state.additions.length+' SELECTED';
 $('prompt-preview').innerHTML=`<div class="original-text">${esc(state.snapshot.prompt)}</div>${selected.length?`<p class="clarifications-title">CLARIFICATIONS</p>${selected.map(a=>`<span class="selected-addition">${esc(a.instruction)}</span>`).join('')}`:'<p class="no-selection">No additions selected. Your original prompt is unchanged.</p>'}`;
 $('rerun').disabled=!selected.length;
 $('rerun-hint').textContent=selected.length?'Only selected edits will be tested.':'Select at least one edit to test.';
}
function rerun(){
 const additions=pickedAdditions();if(!additions.length)return;
 state.testedPrompt=revise(state.snapshot.prompt,additions);state.appliedAdditions=clone(additions);
 state.after=makeResults(state.snapshot.cases,state.snapshot.cases.map(c=>simulateExtraction(c.input,state.testedPrompt)));
 status();selectFirstFailure();renderResults();showScreen('results');
}
function exportSession(){
 if(!state.before)return;
 const payload=createComparisonExport(state);
 const url=URL.createObjectURL(new Blob([JSON.stringify(payload,null,2)],{type:'application/json'}));
 const a=document.createElement('a');a.href=url;a.download='fireworks-migration-comparison.json';document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
 status('Comparison exported as JSON, including the tested prompt, applied edits, examples, and simulation provenance.');
}
for(const group of ['Anthropic','OpenAI']){
 const el=document.createElement('optgroup');el.label=group;
 for(const model of SOURCE_MODELS.filter(m=>m.provider===group)){const option=new Option(model.name,model.id);el.append(option);}
 $('source-model').append(el);
}
for(const model of TARGET_MODELS)$('target-model').add(new Option(model.name,model.id));
$('run').onclick=run;$('rerun').onclick=rerun;$('export').onclick=exportSession;$('choose-edits').onclick=chooseEdits;
$('back-setup').onclick=()=>{status();showScreen('setup');};$('back-results').onclick=()=>{renderResults();showScreen('results');};
$('step-setup').onclick=()=>{status();showScreen('setup');};$('step-results').onclick=()=>{renderResults();showScreen('results');};$('step-adapt').onclick=chooseEdits;
$('reset').onclick=()=>{state.prompt=ORIGINAL_PROMPT;state.cases=freshCases();state.selected=0;$('prompt').value=state.prompt;invalidate();renderCase();status('Sample prompt and examples restored.');};
$('prompt').oninput=()=>{state.prompt=$('prompt').value;invalidate();};
$('case-input').oninput=()=>{state.cases[state.selected].input=$('case-input').value;$('input-error').hidden=true;invalidate();};
$('case-expected').oninput=()=>{state.cases[state.selected].rawExpected=$('case-expected').value;$('input-error').hidden=true;invalidate();};
$('source-model').onchange=()=>{state.sourceId=$('source-model').value;invalidate();};
$('target-model').onchange=()=>{state.targetId=$('target-model').value;invalidate();};
$('prompt').value=state.prompt;renderCase();updateSteps();
