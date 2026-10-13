import {readFileSync,readdirSync,writeFileSync} from 'node:fs';
const slugs=readdirSync('src/labs',{withFileTypes:true}).filter(d=>d.isDirectory()).map(d=>d.name).filter(slug=>slug!=='shared').sort();
const result={status:'Source inventory. Scientific tests and desktop/mobile checks are documented separately in DELIVERY.md.',replacementScenes:[],legacyScenes:[],requiredEight:['earth-interior','seasons','plate-boundaries','rivers','atmosphere-layers','water-cycle','volcanoes','contours']};
for(const slug of slugs){let source;try{source=readFileSync(`src/labs/${slug}/scene.tsx`,'utf8');}catch{continue;}
  (source.includes('makeGlbScene(')?result.legacyScenes:result.replacementScenes).push(slug);
}
writeFileSync('reports/model-replacements.json',JSON.stringify(result,null,2)+'\n');
console.log(`${result.replacementScenes.length} replacement scene entry points; ${result.legacyScenes.length} legacy GLB scenes. Visual acceptance is tracked separately.`);
