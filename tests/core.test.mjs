import test from 'node:test';
import assert from 'node:assert/strict';
import {compare,validateExpected,SAMPLE_CASES,ORIGINAL_PROMPT,makeResults,summarize,transitions,revise,simulateExtraction,suggestAdditions} from '../docs/core.js';

test('field checks distinguish missing, null, wrong types, and leading zeros',()=>{
 const expected={invoice_id:'00042',seller_name:'A',total:null,currency:'USD'};
 assert.equal(compare(expected,{currency:'USD',total:null,seller_name:'A',invoice_id:'00042'}).pass,true);
 assert.equal(compare(expected,{...expected,invoice_id:'42'}).pass,false);
 assert.equal(compare(expected,{...expected,total:''}).checks.find(c=>c.field==='total').pass,false);
 const missing={...expected};delete missing.total;
 assert.equal(compare(expected,missing).checks.find(c=>c.field==='total').missing,true);
 assert.equal(compare(expected,{...expected,extra:true}).pass,false);
 assert.equal(compare(expected,null).pass,false);
});
test('malformed expected outputs are rejected',()=>{
 assert.throws(()=>validateExpected({}),/exactly/);
 assert.throws(()=>validateExpected({...SAMPLE_CASES[0].expected,total:'220'}),/number/);
 assert.throws(()=>validateExpected({...SAMPLE_CASES[0].expected,invoice_id:42}),/string/);
 assert.doesNotThrow(()=>validateExpected(SAMPLE_CASES[2].expected));
});
test('sample workflow improves three checks and leaves ambiguous currency unresolved',()=>{
 const before=makeResults(SAMPLE_CASES,SAMPLE_CASES.map(c=>simulateExtraction(c.input,ORIGINAL_PROMPT)));
 const additions=suggestAdditions(before,ORIGINAL_PROMPT);
 assert.equal(additions.length,3);
 const prompt=revise(ORIGINAL_PROMPT,additions);
 assert.ok(prompt.startsWith(ORIGINAL_PROMPT));
 const after=makeResults(SAMPLE_CASES,SAMPLE_CASES.map(c=>simulateExtraction(c.input,prompt)));
 assert.equal(summarize(before).fields,12);assert.equal(summarize(after).fields,15);
 assert.equal(summarize(before).cases,1);assert.equal(summarize(after).cases,3);
 assert.deepEqual(transitions(before,after),{fixed:3,regressed:0});
 assert.equal(after[2].checks.find(c=>c.field==='currency').pass,false);
 assert.deepEqual(suggestAdditions(after,prompt),[]);
 after[0].checks[0].pass=false;
 assert.deepEqual(transitions(before,after),{fixed:3,regressed:1});
});
test('editing supported document values changes the simulation',()=>{
 const input=SAMPLE_CASES[0].input.replace('Northline Studio','Aster Studio').replace('220.00','250.00');
 const actual=simulateExtraction(input,ORIGINAL_PROMPT);
 assert.equal(actual.seller_name,'Aster Studio');assert.equal(actual.total,250);
});
test('unsupported documents produce explicit missing values, not sample answers',()=>{
 assert.deepEqual(simulateExtraction('Unstructured note',ORIGINAL_PROMPT),{invoice_id:null,seller_name:null,total:null,currency:null});
});

test('migration comparison separates regressions, shared failures and target improvements',async()=>{
 const {SAVED_INCUMBENT,migrationSummary,migrationFailures}=await import('../docs/core.js');
 const baseline=makeResults(SAMPLE_CASES,SAVED_INCUMBENT);
 const before=makeResults(SAMPLE_CASES,SAMPLE_CASES.map(c=>simulateExtraction(c.input,ORIGINAL_PROMPT)));
 assert.equal(summarize(baseline).fields,15);
 assert.deepEqual(migrationSummary(baseline,before),{regressions:3,sharedFailures:1,improvements:0,passes:12});
 const failures=migrationFailures(baseline,before);
 assert.equal(failures.flatMap(r=>r.checks).length,3);
 assert.ok(failures.flatMap(r=>r.checks).every(c=>c.field!=='currency'));
 const adapted=revise(ORIGINAL_PROMPT,suggestAdditions(failures,ORIGINAL_PROMPT));
 const after=makeResults(SAMPLE_CASES,SAMPLE_CASES.map(c=>simulateExtraction(c.input,adapted)));
 assert.deepEqual(migrationSummary(baseline,after),{regressions:0,sharedFailures:1,improvements:0,passes:15});
 const correct=makeResults(SAMPLE_CASES,SAMPLE_CASES.map(c=>c.expected));
 assert.deepEqual(migrationSummary(baseline,correct),{regressions:0,sharedFailures:0,improvements:1,passes:15});
 assert.deepEqual(migrationSummary([...baseline].reverse(),before),migrationSummary(baseline,before));
});
test('changing expected values rescores incumbent as well as target',async()=>{
 const {SAVED_INCUMBENT,migrationSummary}=await import('../docs/core.js');
 const cases=structuredClone(SAMPLE_CASES);cases[0].expected.total=999;
 const baseline=makeResults(cases,SAVED_INCUMBENT);
 const target=makeResults(cases,cases.map(c=>simulateExtraction(c.input,ORIGINAL_PROMPT)));
 assert.deepEqual(migrationSummary(baseline,target),{regressions:3,sharedFailures:2,improvements:0,passes:11});
});

test('incumbent simulation follows document edits independently of expected values',async()=>{
 const {simulateIncumbent}=await import('../docs/core.js');
 const edited=structuredClone(SAMPLE_CASES);
 edited[0].input=edited[0].input.replace('Northline Studio','Aster Studio').replace('220.00','250.00');
 const result=simulateIncumbent(edited[0].input);
 assert.equal(result.seller_name,'Aster Studio');assert.equal(result.total,250);
 edited[0].expected.total=999;
 assert.equal(simulateIncumbent(edited[0].input).total,250);
 assert.equal(makeResults(edited,edited.map(c=>simulateIncumbent(c.input)))[0].pass,false);
 assert.equal(simulateIncumbent(SAMPLE_CASES[2].input).currency,'USD');
 assert.deepEqual(simulateIncumbent('Unknown format'),{invoice_id:null,seller_name:null,total:null,currency:null});
});

test('each prompt edit can be applied independently without fixing unselected failures',async()=>{
 const {simulateIncumbent,migrationFailures,migrationSummary}=await import('../docs/core.js');
 const incumbent=makeResults(SAMPLE_CASES,SAMPLE_CASES.map(c=>simulateIncumbent(c.input)));
 const before=makeResults(SAMPLE_CASES,SAMPLE_CASES.map(c=>simulateExtraction(c.input,ORIGINAL_PROMPT)));
 const additions=suggestAdditions(migrationFailures(incumbent,before),ORIGINAL_PROMPT);
 const expectations=structuredClone(SAMPLE_CASES.map(c=>c.expected));
 assert.equal(revise(ORIGINAL_PROMPT,[]),ORIGINAL_PROMPT);
 for(const addition of additions){
  const prompt=revise(ORIGINAL_PROMPT,[addition]);
  const after=makeResults(SAMPLE_CASES,SAMPLE_CASES.map(c=>simulateExtraction(c.input,prompt)));
  assert.equal(summarize(after).fields,13);
  assert.deepEqual(transitions(before,after),{fixed:1,regressed:0});
  assert.equal(migrationSummary(incumbent,after).regressions,2);
  for(const result of after)for(const check of result.checks){
   if(check.field!==addition.field)assert.equal(check.pass,before.find(r=>r.id===result.id).checks.find(c=>c.field===check.field).pass);
  }
  for(const rejected of additions.filter(a=>a.id!==addition.id))assert.ok(!prompt.includes(rejected.instruction));
 }
 assert.deepEqual(SAMPLE_CASES.map(c=>c.expected),expectations);
});
