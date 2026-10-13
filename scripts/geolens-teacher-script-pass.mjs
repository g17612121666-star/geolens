import {readFileSync,writeFileSync} from 'node:fs';
const path='src/lib/labs/content.json',data=JSON.parse(readFileSync(path,'utf8'));
for(const l of data.labs){
 l.teacher.script=l.teacher.script.split('\n\n').filter(p=>!p.startsWith('Invite a student or geography club member')).map(p=>p.replace(/^Begin with the model paused\. /,'').replace(/^Ask students to predict the result before changing a control\. /,'')).join('\n\n');
 l.teacher.script=l.teacher.script.replace('compare physical scale to compare physical radii with orbital separation.','switch to physical scale and compare planet radii with the distances between their orbits.').replace('Compare physical scale to compare the altitude scale with Earth’s radius.','Switch to physical scale and compare the thickness of the atmosphere with Earth’s radius.').replace('Compare physical scale to compare equal scales.','Switch to physical scale to see the vertical and horizontal dimensions at the same scale.');
 if(l.slug==='plate-boundaries') l.teacher.script=l.teacher.script.replace(' These are modern coastlines carried by a plate-motion model, not ancient shorelines.','');
 if(l.slug==='rotation') l.teacher.script=l.teacher.script.replace(/^Watch Earth turn eastward/,'Play the animation and watch Earth turn eastward');
}
writeFileSync(path,JSON.stringify(data,null,2)+'\n');
console.log('Removed duplicated teacher-script boilerplate and repeated model-limit paragraphs.');
