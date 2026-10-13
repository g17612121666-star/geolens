import {readFileSync,writeFileSync,readdirSync,existsSync} from 'node:fs';
import {relative,join} from 'node:path';
import {createHash} from 'node:crypto';
const root=process.cwd(),base=JSON.parse(readFileSync('artifacts/geolens/initial-source-hashes.json','utf8').replace(/^\uFEFF/,''));
const walk=d=>readdirSync(d,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(join(d,e.name)):[join(d,e.name)]);
const before=new Map(base.map(i=>[i.Path.toLowerCase(),i])),changes=[];
for(const file of walk(join(root,'src'))){const prior=before.get(file.toLowerCase()),hash=createHash('sha256').update(readFileSync(file)).digest('hex').toUpperCase();if(!prior||hash!==prior.Hash)changes.push({status:prior?'Modified':'Added',path:relative(root,file).replaceAll('\\','/')});}
for(const prior of base)if(!existsSync(prior.Path))changes.push({status:'Deleted',path:relative(root,prior.Path).replaceAll('\\','/')});
changes.sort((a,b)=>a.path.localeCompare(b.path));
writeFileSync('reports/geolens-changed-source-files.json',JSON.stringify(changes,null,2)+'\n');
writeFileSync('reports/geolens-changed-source-files.md','# 本轮源码变更清单\n\n以本轮开始时的 318 个源码文件 SHA-256 快照作比较，包含新增与删除文件；不将之前已存在的 Git 未提交改动算作本轮工作。截图、构建产物、脚本和 public 资源另见交付报告。\n\n| 状态 | 源文件 |\n|---|---|\n'+changes.map(c=>'| '+c.status+' | `'+c.path+'` |').join('\n')+'\n');
console.log(JSON.stringify({total:changes.length,modified:changes.filter(c=>c.status==='Modified').length,added:changes.filter(c=>c.status==='Added').length,deleted:changes.filter(c=>c.status==='Deleted').length}));
