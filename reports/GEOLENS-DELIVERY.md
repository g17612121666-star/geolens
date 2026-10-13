# Geolens 改版交付记录

日期：2026-09-21。代码库：`D:\Claude\terralens-work`。

本轮是在原有未提交工作之上实施的改版，保留此前科学模型、公式、真实照片纹理和海蚀拱洞修复。未执行 Git 提交或推送。用户随后要求上线，已于 2026-09-21 将经验证的构建发布至 https://terralens-kohl.vercel.app/，生产状态为 Ready。详见 [发布与回滚记录](GEOLENS-RELEASE-2026-09-21.md)。页面品牌已统一为 Geolens；现有 canonical 域名仍保留 `terralens-kohl.vercel.app`，未虚构或绑定新域名。

## 已完成的产品改动

| 范围 | 结果 |
|---|---|
| 品牌、语言、导航 | 页眉、页脚、SEO、PWA 和页面统一 Geolens；移除中文入口、翻译包装、字典和中文字体；删除 Paths 路由及入口。外观菜单仅保留 Light、Dark、System。 |
| 首页 | 文字与地球分栏；手机先展示标题与行动入口；真实地球纹理的球形占位避免空白；Realms 增加封面；案例显示完整短摘要；课堂区与页脚收紧。 |
| Explore | 大图编辑式卡片，保留主题、课程、关键词筛选；四组精选序列吸收原课程排序。 |
| Atlas | 选中地点成为主视觉；用过程证据卡连接实验；双地地图同步缩放与底图；照片标明实际地点，未把景观当作首都照片。 |
| Live weather | 默认 London / Singapore；主读数、统一 UTC 的 72 小时图表、地图和课堂问题；可切换温度、降水、风及云量，保留 CSV 与错误恢复。 |
| 62 个实验 | 统一画面取景、侧栏单滚动、控件状态与 Controls 帮助；短屏给模型更多高度；气候分类改为球体与可点击图例，移除独立植被块；大气线条增强明暗主题对比；月食默认打开有标注的阴影特写。 |
| 实验文字 | 62 条完整学习目标、62 条主题解释问题、62 个主要误区、186 条教师提醒与全部 245 道题的解释已整理；保留数值模型，必要限制集中到正文或可展开的模型说明。 |
| Teachers | 图片索引、讨论问题、教案主图与词汇观察图；讲稿分成可读短段；打印样式隐藏交互控件；嵌入模型采用准确的加载提示。 |
| Glossary | UI 共 417 个词条，对应 419 个定义键；累计扩写 224 条定义，并提供对应照片的观察段落。图下出处条移走，保留图片和放大操作。 |
| About | 统一 Li Zeyu、Earth science educator、science communication enthusiast、Shanghai Pinghe School geography club founder and president、IB Class of 2028；保留已有学生讲解员经历。 |
| 图片与视频 | 全部 319 张源图做接触表视觉检查；1223 处引用无缺失；修正 8 处术语错图。保留 7 个主题核实视频的 9 处引用，删除其余 51 处未充分匹配引用。 |
| 图片署名 | 新增页脚可访问的 Image credits 页面，支持搜索原作者、来源和许可；不在每张图下堆出处条。 |

## 已改文件

完整源码清单见 [geolens-changed-source-files.md](geolens-changed-source-files.md)，机器可读版见 [geolens-changed-source-files.json](geolens-changed-source-files.json)。本轮开始时的 SHA-256 快照与最终源码比较：129 个修改、3 个新增、21 个删除，共 153 个源码文件。

核心文件组：

- 页面：`src/routes/index.tsx`、`explore.tsx`、`about.tsx`、`atlas.tsx`、`tools.live-weather.tsx`、`tools.map.tsx`、`tools.earth-motion.tsx`、`tools.index.tsx`、`teachers.index.tsx`、`teachers.$slug.tsx`、`glossary.tsx`、`case.$slug.tsx`、`search.tsx`、`realms.$realm.tsx`、`privacy.tsx`、`__root.tsx`；新增 `image-credits.tsx`。
- 共用界面：`src/components/layout/{header,footer}.tsx`、`preferences-menu.tsx`、`figure.tsx`、`zoomable-image.tsx`、`progress-media.tsx`、`lab-card.tsx`、`lab-filmstrip.tsx`、`atlas-weather.css`、`src/styles.css`、`src/fonts.css`。
- 三维与实验：`src/components/globe/{home-hero,hero-earth,client-canvas}.tsx`、`src/components/lab/{lab-player,control-bar,step-rail,why-panel}.tsx`、`src/labs/shared/{studio,science-kit,fit-science-view,kit,lunar-model}.tsx`，以及逐模型移除翻译包装的文件。详细三维清单见 [IMPLEMENTATION.md](lab-qa-2026-09-21/IMPLEMENTATION.md)。
- 内容：`src/lib/labs/{catalog.ts,content.json,types.ts}`、`src/lib/{cases,glossary-data,lab-videos,photo-assign,preferences,contact,seo,atlas-data,map-overlays,search-aliases}.ts`、`src/lib/teachers/{article,workflow}.ts`、`scripts/glossary-definitions.json`。
- 公共资源：`public/manifest.webmanifest`、`robots.txt`、`sitemap.xml`、`geo/SOURCES.md`、`photos/uniqueness.json`；三份 PWA 图标改为 `geolens-*` 名称。
- 校验与编辑源：新增 `scripts/preferences.test.mjs`、`photo-semantics.test.mjs`，移除旧 `preferences-i18n.test.mjs`；新增 `scripts/geolens-*.json/.mjs` 编辑稿与迁移记录。报告目录保留媒体接触表、来源清单及浏览器检查结果。

删除的翻译文件详见 [geolens-removed-language-files.json](geolens-removed-language-files.json)：46 个文件，包含中文字典、适配层、两个中文字体和旧翻译生成材料。Paths 页面与旧分散实验文字模块也已删除，改由单一目录内容文件供页面使用。

## 已删或重写文案

- TerraLens 显示名称及旧名关联免责。
- 简体中文入口、中文搜索 chip、About 中文身份行及中英混排。
- Paths 导航、独立页面与首页入口；有用顺序转入 Explore。
- `International English. SI units first...`、`Space plays. Arrows scrub...` 等口号与快捷键速记。
- `Fifteen minutes. Projector on.` 及反复出现的十五分钟销售式描述。
- `bilingual handshake`、`not a contact desk`、`Also builds`，以及本站身份中的 Geoscience Club / geology club。
- Atlas 的 `Classroom reference...` 长免责；气候实验的密集数据来源串、独立 biome 说明和重复学习目标。
- 图片下 Flickr / Wikimedia / CC BY / resized / Image source / Licence / Enlarge image 出处条。
- 案例地点间隔号串、半截摘要，以及 `Weathered granite, steep catchments...` 同类提示。
- `Humility.`、`Nodes.`、`Mirror.`、`Wrong machine.`、`Tabloid ENSO.`、`culture war`、`magic radiator` 等空泛测验反馈和教学速记。
- 修正把月牙亮区说成月球夜面的概念错误，统一 Miami/London 案例的标题、地点、正文及相关实验。

## 验证结果与边界

- `npm run typecheck`：通过，记录在 `artifacts/geolens/typecheck-final.log`。
- `npm run build`：通过，记录在 `artifacts/geolens/build-final.log`。未配置数据库的迁移步骤按原逻辑跳过。仍有大型三维/地图模块的打包体积提示，没有构建失败。
- 108 项针对性测试：108 通过、0 失败，记录在 `artifacts/geolens/science-tests-final.log`。覆盖科学计算、守恒、交互状态、天气取消与单位、主题偏好及照片语义映射；未把平台基础设施全套测试冒充本轮检查。
- 62/62 实验入口：均到达 ready 状态、有非零画布和页面标题，审计时无应用错误。不是穷举每个参数组合。详见 [62 个实验检查报告](lab-qa-2026-09-21/README.md)。
- 桌面、1280×720 短屏和 390×844 手机尺寸实看了代表页面；浅色与深色主题均检查。最终短屏复核：气候画布 268 px、大气 317 px、海岸 261 px；月食默认特写可见。页面追加说明收起后可给模型更多空间，投影模式可进一步放大。
- 实测 Explore 精选序列顺序、Atlas 两地比较、London/Singapore 真实天气返回及降水时间切换、气候图例联动、碳循环参数和正误反馈、词典搜索、集中出处搜索、外观切换。浏览器打印媒体样式已实看，未对每份教案逐页导出 PDF 验收。
- 最终生产预览已实测主页、主题菜单、月食默认场景与新测验解释、教师讲稿及实际 ready 的嵌入气候模型；所查生产页控制台 error 为 0。Three.js 仍有 Clock 弃用提示，不影响本轮已测功能。
- 已删除的品牌显示串、中文、Paths 产品路由及列出的旧坏句已做源码扫描；保留的旧域名和本地进度迁移键不作为页面显示文案。

## 仍需人工确认的媒体

精确列表和所有来源地址见 [geolens-media-review.md](geolens-media-review.md)。

1. 七个保留视频的学校网络播放、字幕与播放器限制：`2lSnnH12tJ4`、`11ZI9aqurfA`、`xa6SdvFA3w0`、`7CPv0NSIG2M`、`7Bxw4kkeHJ8`、`CDEj62HGNkk`、`mkt-0ZuTKXU`。已核实主题对应，没有声称已在学校网络完整播放。
2. `nrcs-raindrop-soil-splash`：原始 USDA/NRCS 记录中的落滴底面描述还需再次确认。
3. `addi-selam-catena`、`berlin-soil-profile`、`himalaya-iss`：本轮视觉主题相符，但 Commons 来源页重开失败，沿用先前来源记录。
4. 319 张图片中，本轮新核实原始来源页 1 张，其余 318 张的摄影者、精确拍摄地点/日期和许可沿用既有记录。接触表视觉检查不能替代逐张重新认证这些来源事实；报告附有完整 318 项待刷新记录。

## 本地结果

最终本地生产预览：`http://127.0.0.1:8086/`。开发预览保留在 `http://localhost:8085/`。本轮改动已发布至 https://terralens-kohl.vercel.app/，首页及月食实验交互的线上浏览器验收通过。
