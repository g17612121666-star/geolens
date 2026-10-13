import {readFileSync,writeFileSync} from 'node:fs';
const file='scripts/approved-photo-candidates.json';
const records=JSON.parse(readFileSync(file,'utf8'));
for(const row of JSON.parse(readFileSync(process.argv[2],'utf8'))) {
  const index=records.findIndex(r=>r.id===row.id);
  if(index<0) records.push(row); else records[index]=row;
}
writeFileSync(file,JSON.stringify(records,null,2)+'\n');
console.log(records.length,'reviewed candidates');
