import ts from 'typescript';
import Module,{createRequire} from 'node:module';
import fs from 'node:fs';
Module._extensions['.ts']=(m,file)=>m._compile(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,resolveJsonModule:true,esModuleInterop:true}}).outputText,file);
const require=createRequire(import.meta.url);
const {CASES}=require('../src/lib/cases.ts');
const {ATLAS,atlasGeo}=require('../src/lib/atlas-data.ts');
const photos=require('../src/lib/photo-assign.ts');
const {VERIFIED_PHOTOS}=require('../src/lib/verified-photos.ts');
const zh=JSON.parse(fs.readFileSync('src/lib/i18n/zh.json','utf8'));
const entries=new Map();
function add(text,location){if(typeof text!=='string'||zh[text]||!/[a-z]/i.test(text))return;if(!entries.has(text))entries.set(text,[]);entries.get(text).push(location);}
for(const c of CASES){for(const key of ['title','place','lede'])add(c[key],`case:${c.slug}:${key}`);c.body.forEach((p,i)=>add(p,`case:${c.slug}:body${i}`));for(const key of ['prompt','hint'])add(c.exam[key],`case:${c.slug}:${key}`);}
for(const p of ATLAS){for(const key of ['name','capital'])add(p[key],`atlas:${p.id}:${key}`);atlasGeo(p).forEach((s,i)=>add(s,`atlas:${p.id}:geo${i}`));}
for(const [group,values] of Object.entries({...photos,VERIFIED_PHOTOS})){for(const [key,p]of Object.entries(values)){for(const field of ['alt','caption'])add(p[field],`${group}:${key}:${field}`);}}
fs.writeFileSync('reports/place-copy-pending.json',JSON.stringify([...entries].map(([text,locations])=>({text,locations})),null,2)+'\n');
fs.writeFileSync('reports/place-catalog.json',JSON.stringify({cases:CASES,atlas:ATLAS.map(p=>({...p,geo:atlasGeo(p)}))},null,2)+'\n');
console.log({cases:CASES.length,atlas:ATLAS.length,pending:entries.size});
