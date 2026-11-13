import ts from 'typescript';
import Module,{createRequire} from 'node:module';
import {readFileSync,writeFileSync} from 'node:fs';
Module._extensions['.ts']=(m,file)=>m._compile(ts.transpileModule(readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,resolveJsonModule:true,esModuleInterop:true}}).outputText,file);
const require=createRequire(import.meta.url);
const {summarize,withDefinitions}=require('../src/lib/labs/summary.ts');
const content=require('../src/lib/labs/content.json'),definitions=require('./glossary-definitions.json');
// The site gets these modules from scripts/vite-lab-content.mjs; build the same ones for Node.
const virtual={'virtual:lab-index':{LAB_INDEX:content.labs.map(summarize)},'virtual:lab-lessons':{LESSONS:{}}};
const resolve=Module._resolveFilename;
Module._resolveFilename=function(request,...rest){return request in virtual?request:resolve.call(this,request,...rest);};
for(const [id,exports] of Object.entries(virtual))require.cache[id]={id,filename:id,loaded:true,exports,children:[]};
const {GLOSSARY}=require('../src/lib/glossary-data.ts');
const LABS=content.labs.map(lab=>withDefinitions(lab,definitions));
const out=process.argv[2]??'reports/teaching-catalog.json';
writeFileSync(out,JSON.stringify({glossary:GLOSSARY,labs:LABS},null,2)+'\n');
console.log(GLOSSARY.length,'terms;',LABS.length,'labs');
