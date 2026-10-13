import fs from 'node:fs';
const file='src/lib/i18n/zh.json',zh=JSON.parse(fs.readFileSync(file,'utf8'));
const edit=(path,old,next)=>{const text=fs.readFileSync(path,'utf8');if(!text.includes(old)){if(text.includes(next))return;throw Error(path+': missing '+old.slice(0,40));}fs.writeFileSync(path,text.replaceAll(old,next));};
// Names which mean different things in a river lesson and the atlas use explicit contexts.
for(const path of ['src/routes/atlas.tsx','src/routes/search.tsx'])edit(path,'tr(p.name)','tr(p.name,`atlas:${p.id}`)');
for(const id of ['shown','vs'])edit('src/routes/atlas.tsx',`tr(${id}.name)`,`tr(${id}.name,\`atlas:\${${id}.id}\`)`);
edit('src/routes/atlas.tsx',"import {tr,useTranslate}","import {tr,useTranslate,searchable,translateText}");
edit('src/routes/atlas.tsx','fold(atlasSearchText(p))',"fold(atlasSearchText(p)+' '+[p.name,p.capital,...atlasGeo(p)].map(searchable).join(' ')+' '+translateText(p.name,'zh',`atlas:${p.id}`))");
edit('src/routes/search.tsx','tr,useTranslate,searchable','tr,useTranslate,searchable,translateText');
edit('src/routes/search.tsx','`${p.name} ${p.capital} ${p.hook} ${(p.alias ?? []).join(" ")} ${(p.geo ?? []).join(" ")}`.toLowerCase()',"[translateText(p.name,'zh',`atlas:${p.id}`),p.name,p.capital,p.hook,...p.alias??[],...p.geo??[]].map(searchable).join(' ').toLowerCase()");
edit('src/routes/search.tsx','`${c.title} ${c.place} ${c.lede} ${c.body.join(" ")} ${c.region}`.toLowerCase()',"[c.title,c.place,c.lede,...c.body,c.region].map(searchable).join(' ').toLowerCase()");
edit('src/routes/search.tsx','`${p.title} ${p.blurb} ${p.board} ${p.kicker}`.toLowerCase()',"[p.title,p.blurb,p.board,p.kicker].map(searchable).join(' ').toLowerCase()");
edit('src/routes/teachers.$slug.tsx','teacherArticle(lab)','teacherArticle(lab,tr)');
edit('src/routes/teachers.$slug.tsx','lessonOutline(lab, window.location.origin)','lessonOutline(lab, window.location.origin,tr)');
edit('src/routes/teachers.$slug.tsx','{tr(" · ")}\n        {tr(article.wordCount)} {tr("words")}','');
edit('src/routes/teachers.$slug.tsx','text-[11px] uppercase tracking-[0.14em]','text-sm');
edit('src/routes/paths.index.tsx','<p className="mt-2 text-sm text-mist">{tr(p.kicker)}</p>','');
edit('src/routes/paths.$slug.tsx','<p className="mt-2 text-glacier">{tr(path.kicker)}</p>','');
edit('src/routes/search.tsx','<p className="text-sm text-mist">{tr(p.kicker)}</p>','');
edit('scripts/zh-photo-copy/110-319.txt','2010 年代卫星观测实例：','');
// Keep specimen trees upright when only terrain relief is exaggerated.
edit('src/labs/river-capture/capture.tsx','<PlantStand kind="broadleaf"','<group scale={[1,1/v,1]}><PlantStand kind="broadleaf"');
edit('src/labs/river-capture/capture.tsx','return [x,height(x,z),z]','return [x,height(x,z)*v,z]');
edit('src/labs/river-capture/capture.tsx','Math.abs(x)>.5))}/>','Math.abs(x)>.5))}/></group>');
// Source-language scientific corrections, carrying over the corresponding reviewed translation.
const corrections=[
 ['src/labs/groundwater/aquifer.tsx','The blue pressure surface above it is the level in a well','The gold pressure surface above it is the level in a well'],
 ['src/lib/cases.ts','It is a hole the plate is sliding over — the continental cousin of Hawaii.','It is a thermal anomaly beneath a moving plate — a continental counterpart to Hawaii, not a hole in the crust.'],
 ['src/lib/cases.ts','Transform vs subduction. Slide-past does not melt a slab; Cascadia does.','Transform vs subduction. Slab-released water promotes partial melting in the mantle wedge beneath Cascadia; a transform boundary does not have that mechanism.'],
 ['src/lib/cases.ts','Describe how a Cascadia megathrust earthquake can generate both a volcanic arc (over time) and a tsunami (in minutes).','Explain how the Cascadia subduction system forms a volcanic arc over geological time, and how a megathrust earthquake can generate a tsunami in minutes.'],
 ['src/lib/cases.ts','The bend records a change in plate motion about 47 million years ago — a sentence for A-level, not a KS3 requirement.','The bend around 47 million years ago records changing relative motion; both plate-motion changes and hotspot migration need to be considered.'],
 ['src/lib/cases.ts','They are waiting on geometry, not weather.','They need the right geometry, a clear line of sight and suitable weather.'],
 ['src/lib/cases.ts','The same warm-core engine as Katrina or Sandy, a western North Pacific name.','The same warm-core class as Katrina, with a western North Pacific name; Sandy underwent extratropical transition near landfall.'],
 ];
for(const [path,old,next]of corrections){const source=fs.readFileSync(path,'utf8');for(const [en,cn]of Object.entries(zh))if(en.includes(old))zh[en.replace(old,next)]=cn;if(source.includes(old))edit(path,old,next);}
Object.assign(zh,{
 'Georgia':'格鲁吉亚','Mississippi':'密西西比河','15 minutes · no login':'15 分钟 · 无需登录',
 'Ctrl + scroll to zoom; plus and minus keys also zoom; Escape resets.':'按 Ctrl＋滚轮缩放，也可按加减键；Esc 重置。',
 'Check the scale caption. Drag to rotate; Ctrl + scroll or pinch to zoom. Labels (L), projector (P), full screen (F), reset (R).':'先读比例说明。拖动旋转，Ctrl＋滚轮或双指缩放。L 标签，P 投影，F 全屏，R 重置。',
 'This is a parameter-driven experiment; there is no time playback.':'此实验由参数驱动，没有时间播放。',
 'Space plays or pauses; the arrow keys nudge the displayed time or process.':'空格播放或暂停，方向键微调时间或过程。',
 'Lesson controls':'本课控件','Ask pupils to explain their choice before revealing the answer.':'先让学生说明理由，再显示答案。',
 'The film stays paused until you play it.':'点击播放后才开始视频。',
 'Aim':'目标','Claim':'说法','Correction':'纠正','Answer':'答案',
 'GCSE Physical Landscapes':'GCSE 自然地貌','GCSE Natural Hazards':'GCSE 自然灾害','A-level Water and Carbon':'A-level 水与碳循环','NGSS Earth in Space':'NGSS 太空中的地球','APES Earth systems':'APES 地球系统','How a river ages':'从源头到河口','What happens at a plate boundary':'板块边界发生什么','The planet as a clock':'地球时钟',
 'Read a hill, then follow water off it, then the sea, then ice. Contours first. Rivers. Coasts. Glaciers.':'从等高线读山地，再依次观察河流、海岸和冰川。',
 'Plates first, then the sudden Earth: quakes, volcanoes, tsunami, tropical cyclones.':'从板块认识地震、火山与海啸，再研究热带气旋和风暴潮。',
 'Stores and flows, then a basin, a hydrograph, a river regime, and the carbon cycle with a fossil-fuel tap.':'从储库和通量出发，依次研究流域、过程线、径流制度与碳循环。',
 'Rotation, seasons, the Sun’s path, and the Moon. The clockwork that makes day, night, and the calendar.':'用自转、季节、太阳路径与月球解释昼夜和历法。',
 'Atmosphere, water, soil, carbon. The systems APES treats as one planet, not eight topics.':'把大气、水、土壤与碳联系为相互作用的地球系统。',
 'Tilt, then the Sun’s path over a school yard, then the year on a calculator.':'先研究地轴倾斜，再观察太阳路径，最后用计算器比较全年。',
 'Long profile, then erosion, deposition, capture, and a hydrograph after rain.':'从纵剖面连接侵蚀、沉积、袭夺与降雨后的流量过程。',
 'Divergent, convergent, transform. Then the hazards those edges write.':'比较离散、汇聚与转换边界，再分析各自相关灾害。',
 'Tilt, then the spinning Earth, then the Moon. The three labs that make day, night, season, and phase.':'通过地轴倾斜、自转与月球，连接昼夜、季节和月相。',
 'SI first. These are classroom models, not forecasts or site assessments. The photograph is evidence from a named source; the interactive scene is a model with the stated limits.':'SI 单位优先。照片是具名来源的观测证据，交互场景是有明确局限的课堂模型，不能作为预报或场地评估。',
 'SI first. These are classroom models, not forecasts or site assessments. Read the scale and model limits before interpreting a scene.':'SI 单位优先。解释场景前请先读比例与模型局限；课堂模型不能作为预报或场地评估。',
});
fs.writeFileSync(file,JSON.stringify(zh,null,2)+'\n');
