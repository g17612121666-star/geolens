/** Input is a manually reviewed TSV: place ID, candidate ID, alt, caption. */
import {readFileSync,writeFileSync} from 'node:fs';
const file='scripts/approved-photo-candidates.json';
const approved=JSON.parse(readFileSync(file,'utf8'));
const assignments=JSON.parse(readFileSync('scripts/atlas-photo-assignments.json','utf8'));
for(const line of readFileSync(process.argv[2],'utf8').trim().split(/\r?\n/)) {
  const [place,candidate,alt,caption,kind='photo',credit]=line.split('\t');
  if(!place || !candidate || !alt || !caption) throw new Error('Incomplete curation row');
  const id=`place-${place}`;
  const row={id,candidate,alt,caption,kind,...(credit ? {credit} : {})};
  const index=approved.findIndex(s=>s.id===id);
  if(index<0) approved.push(row); else approved[index]=row;
  assignments[place]=id;
}
writeFileSync(file,JSON.stringify(approved,null,2)+'\n');
writeFileSync('scripts/atlas-photo-assignments.json',JSON.stringify(assignments,null,2)+'\n');
console.log(Object.keys(assignments).length,'explicit place assignments');
