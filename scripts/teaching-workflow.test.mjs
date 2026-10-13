import test from 'node:test';
import assert from 'node:assert/strict';
import ts from 'typescript';
import Module, {createRequire} from 'node:module';
import {readFileSync} from 'node:fs';
Module._extensions['.ts']=(m,file)=>m._compile(ts.transpileModule(readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,resolveJsonModule:true,esModuleInterop:true}}).outputText,file);
const require=createRequire(import.meta.url);
const {LABS}=require('../src/lib/labs/catalog.ts');
const {lessonLink,lessonOutline}=require('../src/lib/teachers/workflow.ts');
const {teacherArticle}=require('../src/lib/teachers/article.ts');
const {useLabControls}=require('../src/lib/store/lab-controls.ts');
test('scrubbing reaches both endpoints while playback still wraps a cycle',()=>{
 const s=useLabControls.getState();s.setT(1);assert.equal(useLabControls.getState().t,1);
 s.setT(-.01);assert.equal(useLabControls.getState().t,0);s.setT(NaN);assert.equal(useLabControls.getState().t,0);
 s.setT(.99);s.play();s.tick(.1,1);assert.ok(Math.abs(useLabControls.getState().t-.09)<1e-12);s.pause();
});
test('every classroom stage link carries reproducible, valid control inputs',()=>{
 assert.equal(LABS.length,62);
 for(const lab of LABS)for(let i=0;i<4;i++){
  const url=new URL(lessonLink(lab,i),'https://example.test');
  assert.equal(url.pathname,`/lab/${lab.slug}`);assert.equal(url.searchParams.get('layout'),'projector');assert.equal(url.searchParams.get('step'),String(i));assert.equal(url.searchParams.get('lesson'),'1');
  for(const extra of lab.controls.extra??[]){const v=Number(url.searchParams.get(extra.key));assert.ok(v>=extra.min&&v<=extra.max,`${lab.slug}: ${extra.key}`);}
  if(lab.controls.slice)assert.equal(url.searchParams.get('slice'),'.42');
 }
});
test('teacher notes and exported answer keys agree with the actual lesson bank',()=>{
 for(const lab of LABS){
  assert.ok(lab.questions.length>0);for(const q of lab.questions){assert.ok(q.choices[q.answer]);assert.ok(q.explain.trim());}
  const outline=lessonOutline(lab,'https://example.test'),article=teacherArticle(lab);
  assert.ok(outline.includes(`Answer: ${lab.questions[0].answer+1}. ${lab.questions[0].explain}`));
  assert.ok(article.sections.flatMap(s=>s.paragraphs).some(p=>p.includes(`Open Check for ${lab.questions.length} questions.`)));
 }
});
