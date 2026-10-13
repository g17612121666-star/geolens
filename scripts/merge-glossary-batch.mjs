import {readFileSync,writeFileSync} from 'node:fs';
const file='scripts/glossary-photo-assignments.json';
const records=JSON.parse(readFileSync(file,'utf8'));
const batch=JSON.parse(readFileSync(process.argv[2],'utf8'));
const replaced=new Set(batch.flatMap(r=>r.terms));
const kept=records.map(r=>({...r,terms:r.terms.filter(t=>!replaced.has(t))})).filter(r=>r.terms.length);
writeFileSync(file,JSON.stringify([...kept,...batch],null,2)+'\n');
console.log([...kept,...batch].reduce((n,r)=>n+r.terms.length,0),'explicit term assignments');
