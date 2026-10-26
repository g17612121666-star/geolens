/** One-time source migration: explicit translation calls, no DOM mutation or runtime JSX replacement. */
import ts from 'typescript';
import fs from 'node:fs';
import path from 'node:path';
const files=[];
function scan(dir){for(const name of fs.readdirSync(dir)){const file=path.join(dir,name);if(fs.statSync(file).isDirectory())scan(file);else if(file.endsWith('.tsx'))files.push(file);}}
for(const dir of ['src/routes','src/components','src/labs'])scan(dir);
const candidates=new Set(),changed=[];
const normalize=text=>{const lines=text.replace(/\r/g,'').split('\n').map((s,i,a)=>{s=s.replace(/\t/g,' ');if(i>0)s=s.replace(/^ +/,'');if(i<a.length-1)s=s.replace(/ +$/,'');return s;}).filter(Boolean);return lines.join(' ');};
for(const file of files){
 if(file.includes('components\\ui\\')||file.includes('components/ui/')||/preferences-menu|preview-host-bridge|__root|auth/.test(file))continue;
 let source=fs.readFileSync(file,'utf8');if(source.includes('// Localized display text.'))continue;
 const sf=ts.createSourceFile(file,source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX),edits=[];
 const add=(start,end,value)=>edits.push({start,end,value});
 const jsxWithin=node=>{let found=false;const walk=n=>{if(ts.isJsxElement(n)||ts.isJsxSelfClosingElement(n)){found=true;return;}ts.forEachChild(n,walk);};walk(node);return found;};
 function visit(node){
  if(ts.isJsxElement(node)&&['script','style','noscript'].includes(node.openingElement.tagName.getText(sf)))return;
  if(ts.isJsxText(node)){const text=normalize(node.getText(sf));if(/[A-Za-z]/.test(text)){candidates.add(text.trim());add(node.getStart(sf),node.end,`{tr(${JSON.stringify(text)})}`);}return;}
  if(ts.isJsxExpression(node)&&node.expression&&(ts.isJsxElement(node.parent)||ts.isJsxFragment(node.parent))&&!jsxWithin(node.expression)){
   const value=node.expression.getText(sf);if(!value.startsWith('tr('))add(node.expression.getStart(sf),node.expression.end,`tr(${value})`);
   return;
  }
  if(ts.isJsxAttribute(node)&&['title','alt','placeholder','aria-label','label'].includes(node.name.getText(sf))&&node.initializer){
   if(ts.isStringLiteral(node.initializer)){const text=node.initializer.text;if(/[A-Za-z]/.test(text)){candidates.add(text.trim());add(node.initializer.getStart(sf),node.initializer.end,`{tr(${JSON.stringify(text)})}`);}return;}
   if(ts.isJsxExpression(node.initializer)&&node.initializer.expression){const e=node.initializer.expression;if(!e.getText(sf).startsWith('tr('))add(e.getStart(sf),e.end,`tr(${e.getText(sf)})`);return;}
  }
  ts.forEachChild(node,visit);
 }
 visit(sf);if(!edits.length)continue;
 let hooks=0;
 function hook(node){
  if(ts.isFunctionDeclaration(node)&&node.name&&/^[A-Z]/.test(node.name.text)&&node.body&&jsxWithin(node.body)){add(node.body.getStart(sf)+1,node.body.getStart(sf)+1,'\n  const tr=useTranslate();');hooks++;}
  if(ts.isVariableDeclaration(node)&&ts.isIdentifier(node.name)&&/^[A-Z]/.test(node.name.text)&&node.initializer&&ts.isArrowFunction(node.initializer)&&ts.isBlock(node.initializer.body)&&jsxWithin(node.initializer.body)){add(node.initializer.body.getStart(sf)+1,node.initializer.body.getStart(sf)+1,'\n  const tr=useTranslate();');hooks++;}
  ts.forEachChild(node,hook);
 }hook(sf);
 edits.sort((a,b)=>b.start-a.start||b.end-a.end);for(const e of edits)source=source.slice(0,e.start)+e.value+source.slice(e.end);
 source=`// Localized display text.\nimport {tr${hooks?',useTranslate':''}} from '@/lib/i18n';\n`+source;
 fs.writeFileSync(file,source);changed.push(file);
}
fs.writeFileSync('reports/round4-static-ui-strings.json',JSON.stringify([...candidates].sort(),null,2));
console.log(`${changed.length} UI files use explicit translation calls; ${candidates.size} static strings extracted.`);
