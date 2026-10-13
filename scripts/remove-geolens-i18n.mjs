import ts from 'typescript';
import {readFileSync,writeFileSync,readdirSync} from 'node:fs';
import {join,relative} from 'node:path';
const root=process.cwd();
function files(dir){return readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?files(join(dir,e.name)):[join(dir,e.name)]);}
const changed=JSON.parse(readFileSync('reports/geolens-language-files.json','utf8'));
for(const file of files(join(root,'src')).filter(p=>/\.tsx?$/.test(p)&&!p.includes('i18n')&&!p.endsWith('routeTree.gen.ts'))){
 if(process.env.GEOLENS_PARTIAL==='1' && /[\\/](?:teachers[^\\/]*|glossary|case\.\$slug)\.tsx$/.test(file))continue;
 let source=readFileSync(file,'utf8');
 if(!source.includes('/i18n'))continue;
 const sf=ts.createSourceFile(file,source,ts.ScriptTarget.Latest,true,file.endsWith('tsx')?ts.ScriptKind.TSX:ts.ScriptKind.TS);
 const edits=[];
 const erase=(start,end,text='')=>edits.push({start,end,text});
 function walk(node){
  if(ts.isImportDeclaration(node)&&node.moduleSpecifier.text.includes('/i18n')){erase(node.getStart(sf),node.end);return;}
  if(ts.isVariableStatement(node)&&node.declarationList.declarations.length===1){const d=node.declarationList.declarations[0];if(d.initializer&&ts.isCallExpression(d.initializer)&&d.initializer.expression.getText(sf)==='useTranslate'){erase(node.getStart(sf),node.end);return;}}
  if(ts.isCallExpression(node)){
   const name=node.expression.getText(sf);
   if(['tr','translateText','searchable'].includes(name)&&node.arguments.length){const arg=node.arguments[0];erase(node.getStart(sf),arg.getStart(sf),"(");erase(arg.end,node.end,")");walk(arg);return;}
   if(ts.isPropertyAccessExpression(node.expression)&&node.expression.name.text==='map'&&node.arguments[0]?.getText(sf)==='searchable'){erase(node.expression.expression.end,node.end);walk(node.expression.expression);return;}
  }
  ts.forEachChild(node,walk);
 }
 walk(sf);
 for(const e of edits.sort((a,b)=>b.start-a.start))source=source.slice(0,e.start)+e.text+source.slice(e.end);
 source=source.replace('// Localised display text.\n','').replaceAll('TerraLens','Geolens');
 writeFileSync(file,source);changed.push(relative(root,file));
}
for(const file of files(join(root,'src')).filter(p=>/\.(tsx?|json)$/.test(p)&&!p.includes('i18n')&&!p.endsWith('routeTree.gen.ts'))){const s=readFileSync(file,'utf8');if(s.includes('TerraLens')){writeFileSync(file,s.replaceAll('TerraLens','Geolens'));changed.push(relative(root,file));}}
writeFileSync('reports/geolens-language-files.json',JSON.stringify([...new Set(changed)],null,2));
console.log('Removed translation wrappers in '+changed.length+' source files.');
