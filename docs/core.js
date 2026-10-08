export const MODEL = 'accounts/fireworks/models/kimi-k2p5';
export const FIELDS = ['invoice_id', 'seller_name', 'total', 'currency'];
export const SCHEMA = {
  type: 'object', additionalProperties: false,
  properties: {
    invoice_id: {anyOf: [{type: 'string'}, {type: 'null'}]},
    seller_name: {anyOf: [{type: 'string'}, {type: 'null'}]},
    total: {anyOf: [{type: 'number'}, {type: 'null'}]},
    currency: {anyOf: [{type: 'string'}, {type: 'null'}]},
  }, required: FIELDS,
};
export const ORIGINAL_PROMPT = 'Extract the invoice ID, seller name, total, and currency from the document. Return JSON with invoice_id, seller_name, total, and currency. Use null for information that is not present.';
export const SAMPLE_CASES = [
  {id: 'standard', name: 'A straightforward invoice', note: 'A control example with every field present.', input: 'INVOICE INV-1042\nIssued by: Northline Studio\nBill to: Acme Retail\nSubtotal: USD 200.00\nTax: USD 20.00\nInvoice total: USD 220.00', expected: {invoice_id:'INV-1042', seller_name:'Northline Studio', total:220, currency:'USD'}},
  {id: 'parties', name: 'Buyer versus seller', note: 'The buyer appears before the seller.', input: 'BILL TO: Acme Retail\nINVOICE EU-208\nSupplier / issued by: Copper Supply Ltd\nSubtotal: EUR 480.00\nTax: EUR 96.00\nInvoice total: EUR 576.00', expected: {invoice_id:'EU-208', seller_name:'Copper Supply Ltd', total:576, currency:'EUR'}},
  {id: 'missing', name: 'Missing information', note: 'A subtotal is not a total. A dollar sign does not identify a currency code.', input: 'DRAFT INVOICE D-309\nIssued by: Harbor Works\nServices subtotal: $75.00\nTax: pending\nFinal invoice total: not yet available\nNo currency code is specified.', expected: {invoice_id:'D-309', seller_name:'Harbor Works', total:null, currency:null}},
  {id: 'identifier', name: 'Identifiers and amounts', note: 'Preserve leading zeros and distinguish the total from the subtotal.', input: 'Invoice number: 000042\nIssued by: Signal Labs\nSubtotal: GBP 1000.00\nVAT: GBP 200.00\nInvoice total: GBP 1200.00', expected: {invoice_id:'000042', seller_name:'Signal Labs', total:1200, currency:'GBP'}},
];
export function clone(value) {return structuredClone(value);}
// Saved baseline fixtures, authored for the demo, not responses from Claude.
// Both illustrative models infer USD incorrectly in the missing-data example.
export const SAVED_INCUMBENT = SAMPLE_CASES.map(c=>({...c.expected,...(c.id==='missing'?{currency:'USD'}:{})}));
export function classifyCheck(incumbent, target) {
  if(incumbent.pass && !target.pass) return 'regression';
  if(!incumbent.pass && !target.pass) return 'shared';
  if(!incumbent.pass && target.pass) return 'improvement';
  return 'pass';
}
export function migrationSummary(incumbent,target) {
  const summary={regressions:0,sharedFailures:0,improvements:0,passes:0};
  const keys={regression:'regressions',shared:'sharedFailures',improvement:'improvements',pass:'passes'};
  for(const result of target) {
    const baseline=incumbent.find(r=>r.id===result.id);
    if(!baseline)throw new Error('Missing incumbent result for '+result.id);
    for(const check of result.checks) {
      const saved=baseline.checks.find(c=>c.field===check.field);
      if(!saved)throw new Error('Missing incumbent field '+check.field);
      summary[keys[classifyCheck(saved,check)]]++;
    }
  }
  return summary;
}
export function migrationFailures(incumbent,target) {
  return target.map(result=>({...result,checks:result.checks.filter(check=>{
    const saved=incumbent.find(r=>r.id===result.id)?.checks.find(c=>c.field===check.field);
    return saved && classifyCheck(saved,check)==='regression';
  })}));
}
export function isObject(value) {return value !== null && typeof value === 'object' && !Array.isArray(value);}
export function validateExpected(value) {
  if (!isObject(value)) throw new Error('Expected output must be a JSON object.');
  if (FIELDS.some(k => !Object.hasOwn(value,k)) || Object.keys(value).some(k => !FIELDS.includes(k))) throw new Error('Use exactly these fields: ' + FIELDS.join(', ') + '.');
  for (const k of FIELDS) {
    const v=value[k];
    if(v !== null && (k === 'total' ? typeof v !== 'number' || !Number.isFinite(v) : typeof v !== 'string')) throw new Error(k + ' must be ' + (k === 'total' ? 'a number' : 'a string') + ' or null.');
  }
  return value;
}
export function compare(expected, actual) {
  const object=isObject(actual);
  const checks=FIELDS.map(field => {
    const present=object && Object.hasOwn(actual,field);
    return {field, expected:expected[field], actual:present ? actual[field] : undefined, pass:present && actual[field] === expected[field], missing:!present};
  });
  const extra=object ? Object.keys(actual).filter(k=>!FIELDS.includes(k)) : [];
  return {checks, extra, pass:object && !extra.length && checks.every(x=>x.pass)};
}
export function makeResults(cases, outputs) {
  return cases.map((c,i)=>({id:c.id,name:c.name,expected:clone(c.expected),actual:outputs[i],...compare(c.expected,outputs[i])}));
}
export function summarize(results=[]) {
  return {fields:results.reduce((n,r)=>n+(r.checks?.filter(c=>c.pass).length || 0),0), total:results.length*FIELDS.length, cases:results.filter(r=>r.pass).length, errors:results.filter(r=>r.error).length};
}
export function transitions(before,after) {
  let fixed=0,regressed=0;
  for(const r of after) {
    const prev=before.find(p=>p.id===r.id);
    if(!prev || prev.error || r.error) continue;
    for(const c of r.checks) {
      const old=prev.checks.find(x=>x.field===c.field);
      if(old && !old.pass && c.pass) fixed++;
      if(old?.pass && !c.pass) regressed++;
    }
  }
  return {fixed,regressed};
}
export function revise(prompt,additions) {return prompt.trim()+'\n\nClarifications:\n'+additions.map(a=>'- '+a.instruction).join('\n');}
export function format(value) {return value === undefined ? '(missing)' : JSON.stringify(value);}
// A deliberately limited local simulation. It is NOT Kimi inference and does
// not predict how a real model responds. It supports the sample invoice labels.
// Prompt edits affect only the explicitly recognized clarification rules below.
export function simulateExtraction(input,prompt) {
  const lines=input.split('\n').map(s=>s.trim()).filter(Boolean);
  const identifier=input.match(/(?:invoice\s*(?:number|id|no\.?))\s*:\s*([^\n]+)/i)?.[1]?.trim()
    ?? input.match(/\bINVOICE\s+([A-Z0-9][A-Z0-9-]*)\b/i)?.[1] ?? null;
  const preserve=/verbatim|leading zeros|exactly as (?:written|shown)/i.test(prompt);
  const invoice_id=identifier && /^0+\d+$/.test(identifier) && !preserve ? String(Number(identifier)):identifier;
  const parties=lines.filter(l=>/^(?:issued by|supplier\s*\/\s*issued by|bill to)\s*:/i.test(l));
  const useSupplier=/issuing supplier|do not use.*bill to|seller.*not.*buyer/i.test(prompt);
  const party=useSupplier?parties.find(l=>!/bill to/i.test(l)):parties[0];
  const seller_name=party?party.slice(party.indexOf(':')+1).trim():null;
  const money=line=>{const match=line?.match(/(-?\d[\d,]*(?:\.\d{1,2})?)/);return match?Number(match[1].replaceAll(',','')):null;};
  const totalLine=lines.find(l=>/^(?:final\s+)?invoice total\s*:/i.test(l));
  const requireTotal=/do not substitute the subtotal|no final total.*null|explicitly stated final invoice total/i.test(prompt);
  const subtotalLine=lines.find(l=>/subtotal\s*:/i.test(l));
  const total=money(totalLine) ?? (requireTotal?null:money(subtotalLine));
  const code=input.match(/\b(USD|EUR|GBP|CAD|AUD|JPY|INR)\b/)?.[1];
  const currency=code ?? (input.includes('$')?'USD':null);
  return {invoice_id,seller_name,total,currency};
}
export function suggestAdditions(results,prompt) {
  const failed=new Set(results.flatMap(r=>r.checks.filter(c=>!c.pass).map(c=>c.field)));
  const rules=[
    {field:'invoice_id',instruction:'Copy invoice identifiers verbatim as strings, preserving leading zeros.',reason:'An invoice identifier changed. Preserve its original representation.'},
    {field:'seller_name',instruction:'Use the issuing supplier as seller_name. Do not use the company under Bill to.',reason:'A buyer was returned where the issuing seller was expected.'},
    {field:'total',instruction:'Use the explicitly stated final invoice total. If no final total is available, return null; do not substitute the subtotal.',reason:'A subtotal was returned even though the final total was missing.'},
  ];
  return rules.filter(r=>failed.has(r.field)&&!prompt.includes(r.instruction)).map(({instruction,reason})=>({instruction,reason}));
}
