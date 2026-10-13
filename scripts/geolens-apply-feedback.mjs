import {readFileSync,writeFileSync} from 'node:fs';
const path='src/lib/labs/content.json',data=JSON.parse(readFileSync(path,'utf8')),feedback=JSON.parse(readFileSync('scripts/geolens-check-feedback.json','utf8').replace(/^\uFEFF/,''));
for(const l of data.labs){if(feedback[l.slug]?.length!==l.questions.length)throw Error(l.slug);l.questions=l.questions.map((q,i)=>({...q,explain:feedback[l.slug][i]}));}
const eclipse=data.labs.find(l=>l.slug==='eclipses');console.log('Eclipse questions before:',JSON.stringify(eclipse.questions.map(q=>q.prompt)));
writeFileSync(path,JSON.stringify(data,null,2)+'\n');console.log('Applied '+Object.values(feedback).flat().length+' complete feedback explanations.');
