import {readFileSync,writeFileSync} from 'node:fs';
const path='src/lib/labs/content.json',data=JSON.parse(readFileSync(path,'utf8')),myths=JSON.parse(readFileSync('scripts/geolens-misconceptions.json','utf8').replace(/^\uFEFF/,''));
for(const l of data.labs){if(!myths[l.slug]?.truth)throw Error(l.slug);l.misconception=myths[l.slug];l.misconceptions=[myths[l.slug]];}
writeFileSync(path,JSON.stringify(data,null,2)+'\n');console.log('Applied '+data.labs.length+' reviewed misconceptions.');
