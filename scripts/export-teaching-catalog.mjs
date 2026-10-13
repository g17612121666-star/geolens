import ts from 'typescript';
import Module,{createRequire} from 'node:module';
import {readFileSync,writeFileSync} from 'node:fs';
Module._extensions['.ts']=(m,file)=>m._compile(ts.transpileModule(readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,resolveJsonModule:true,esModuleInterop:true}}).outputText,file);
const require=createRequire(import.meta.url);
const {GLOSSARY}=require('../src/lib/glossary-data.ts');
const {LABS}=require('../src/lib/labs/catalog.ts');
writeFileSync('reports/teaching-catalog.json',JSON.stringify({glossary:GLOSSARY,labs:LABS},null,2)+'\n');
console.log(GLOSSARY.length,'terms;',LABS.length,'labs');
