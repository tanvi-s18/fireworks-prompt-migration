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
