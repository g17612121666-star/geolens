# TerraLens 本地升级交付

日期：2026-09-20。仓库：Zzyyio/terralens9.18；基线：5207fb6c586ff3175b754dda66de5ce292e0a5e5；分支：codex/terralens-classroom-upgrade。

第二轮模型、字体、目录、胶片浏览与河流反馈修正见 [ROUND2-DELIVERY.md](ROUND2-DELIVERY.md)。下面保留第一轮 P0–P5 的范围与验证记录；其中 82 项测试是第一轮记录，最新相关测试为 102 项。

用户随后授权新网址公开发布，现已上线至 https://terralens-kohl.vercel.app ，见 [发布记录](RELEASE-2026-09-20.md)。未提交或推送原仓库，未修改 terralens.grok.me。历史批次记录保存在 [UPGRADE-STATUS.md](UPGRADE-STATUS.md)，其中早期“待检查”条目以本文的最终记录为准。

## 可点击预览

- [Live weather](http://127.0.0.1:8081/tools/live-weather)
- [Earth-motion calculator](http://127.0.0.1:8081/tools/earth-motion)
- [World map studio](http://127.0.0.1:8081/tools/map)
- [Atlas](http://127.0.0.1:8081/atlas)
- [Glossary](http://127.0.0.1:8081/glossary)
- [Earth interior](http://127.0.0.1:8081/lab/earth-interior)
- [全部实验](http://127.0.0.1:8081/explore) · [Teachers](http://127.0.0.1:8081/teachers)

## 修改模块

| 范围 | 交付内容 |
|---|---|
| P0 地图 | 去除实际返回 API-key 水印的 CARTO 底图。默认 OpenFreeMap → OSM → 本地 Natural Earth 海岸线；明确显示加载、回退、缺少街道细节与重试。切换底图后恢复教学覆盖层。 |
| P1 图片 | 319 个审阅来源服务于 1,223 个展示位置；417 词条、62 封面、62 教师图、453 词条缩略图、184 Atlas 地点、35 Cases、8 Realms、2 地球运动观察图。逐项保留来源、许可、作者、alt、caption 和文件哈希。 |
| P2 天气 | 72 小时 UTC / SI 请求、所选小时的地图数值和风羽、两地同一 UTC 小时对比、当前条件独立标时、图表与表格、CSV、来源网格与精确请求、分享、投影、取消/超时/限流/缓存。 |
| P2 地球运动 | 同一太阳几何驱动计算、照亮半球、晨昏线与当前太阳高度；日期/纬度/UTC/倾角/折射选项、极昼极夜、全年曲线、两地比较、分享与 CSV；手机画布适配。 |
| P2 Map studio | 可用底图、课堂预设、分层的可选图层、PB2002 板块与边界分类、Natural Earth 边界、测距、双视图、图例、共享视角与投影模式。 |
| P2 Atlas | 184 个地点真实匹配影像与来源；定位图、筛选、双地比较；Köppen 类别从 Beck V3 1991–2020 数据按定位点采样。 |
| P3 Glossary | 简洁定义、支持重音归一化的搜索、realm/首字母筛选、分页、词条链接、相关实验、回忆/揭示与本地修订标记。 |
| P4 Labs | 62 个旧模型入口均替换为按课题构造的科学几何/数据场景；材质、光照、比例说明、视角适配、交互、标签与相应教学说明同步更新。 |
| P5 Teachers | 保留原有十五分钟定位和课标；realm/学段/课标/文本筛选；四阶段计时计划、纠错、演示脚本、匹配图片、按需载入模型、直接进入阶段/投影、复制/下载大纲、大字/打印。无需登录。 |

### 图片清单与真实性

- [完整替换清单](media-replacements.json)：每个位置的旧图、新图、类型、来源、许可、alt、caption、SHA-256。
- [当前媒体审计](media-audit.json)：1,223 个位置全部存在，diagram / missing / needsReview 均为 0。
- [原 241 个 diagram 的逐项审阅记录](glossary-original-diagrams/REVIEW.md)及同目录的 assignments.json、11 张联系表。
- [注册表](../src/lib/photo-assign.ts)与 [来源库](../src/lib/verified-photos.ts)；[公共 manifest](../public/photos/manifest.json)同步生成。
- `photo` 与 `scientific-image` 分开标记。官方卫星观测、磁异常或辐射数据图说明其测量量；不把仪器照片说成不可见过程本身。没有生成假照片。
- 当前展示不再引用 O/A/E/B/C 空框封面、宗教画或“Classroom diagram / USGS-style”占位。旧资源文件可能仍留在仓库中，但不在当前有效图片分配中。旧自动示意图生成脚本已停用。

### 模型清单与科学边界

[全部 62 个模型、预览和实现入口](MODEL-INVENTORY.md)；[机器可读入口清单](model-replacements.json)；[当前教学内容快照](teaching-catalog.json)。

重点变化包括地球真实层半径与固态地幔、Kepler 季节运动、PB2002 边界/GPlates 古地理、守恒水量与土壤/河流预算、地震 P/S 传播、等值线与高程、断层/褶皱/火山实体几何、天体轨道与尺度、按数据着色的气候地球。NASA 地球纹理为 4096×2048；额外行星纹理和 NASA 模型记录在 [纹理来源](../public/textures/planets/sources.json)。

教学模型仍有明确简化：垂直夸张、示踪粒子、理想地形、平衡潮汐、概念环流、选定阶段与示意运动均在界面或 Why 中说明。不是数值天气预报、洪水/海啸预警、岩浆流体求解或地点地质调查。重建图层是科学模型数据，不能冒充实拍。True scale 对适用场景保留，不给不存在的普适精度承诺。

## 最小必要的共享与范围外改动

- `LibreMap`：修复瓦片完成判断/回退/重试/图层恢复、异步标记初始化、跨日期变更线的双点视野及容器缩放后的重新取景；增加 React 点位内容，保证气象数值随状态更新；禁用旋转保持地图北向上。
- `Figure`、图片类型和注册表：保留来源及许可链接，区分照片/科学观测。
- `ClientCanvas`、Earth 材质、共用几何/纹理、相机适配与标签：修复白球材质重编译、过期标签遮挡、手机构图和动态几何缓冲，供多个 lab 复用。
- Lab player、控制条和 URL 状态：修复左右面板压缩模型、移动端标签、实例化几何视角、手动时间端点、键盘/投影/全屏与课堂阶段链接；教学步骤与已更新模型脚本一致。
- 全局样式仅增加相关响应式/打印修复；原有暗色、字体和主色保留。未改 About/Privacy、品牌、无关导航声音或课程分类。
- `scripts/with-app-env.mjs` 以 Node 入口运行 Vite，兼容 Windows，保留原环境处理。构建产生 `.vercel/output`；这是预览产物，不是手写产品模块。

## 验证记录与复现

自动检查：82 项本次新增的科学计算、几何、地图、天气、课堂状态测试全部通过，见 [science-tests.log](science-tests.log)；最后一次地图布局修改后，另复跑 14 项地图/天气回归，全部通过，见 [map-weather-final-tests.log](map-weather-final-tests.log)。最终类型检查和构建见 [final-typecheck.log](final-typecheck.log)、[final-build.log](final-build.log)。没有 DATABASE_URL，迁移按原逻辑跳过，未创建数据库。

桌面与手机完成 62 个 lab 的载入检查：模型能挂载、页面无横向溢出。检查发现 river-hydrology 在 Float32 地形边缘出现 NaN，已钳制高度底数，增加有限顶点/法线测试，并重新检查该模型。冷启动的大纹理和重建资源需要加载时间；加载完成后才判定通过。

重点人工检查覆盖 earth-interior、seasons、plate-boundaries、rivers、atmosphere-layers、water-cycle、volcanoes、contours，包括比例/物态提示、零倾角昼长、0/200 Ma 数据切换、大气温度剖面、10,000 m³ 水量预算、河流流量/播放、火山口切换、等高距/二维视图。全 62 页挂载检查与这 8 个重点交互检查是不同层次；不把挂载成功称为 62 个模型逐一独立科学认证。

其他实际浏览器验证：

- 地图：默认矢量底图可见；同时阻断 OpenFreeMap/OSM 后本地海岸线与板块覆盖层仍可用；解除阻断并 Retry 恢复在线底图。无 API-key 水印。测距两点得到 2,862 km；双视图出现两个地图；Copy view link 显示已复制并将图层/双视角写入地址栏。
- 天气：真实 API 返回 72 小时；London/Sydney 在同一 UTC 小时给出不同读数，所选小时风向与当前天气分开。最终手机和桌面在 2026-09-21 08:00 UTC 分别显示 A 1.8 m/s / 72°、B 6.0 m/s / 167°；清除 B 后仅保留 A 标记。实际 429 测试显示禁用重试倒计时，保留另一个地点和地图，解除失败后成功恢复。
- Atlas：UK/England 与 California 对比定位图、图片和气候/构造卡片可见，手机无横向溢出。
- Glossary：页面 1–3 共 36 词实际浏览；原 241 个 diagram 全部经联系表视觉审阅。后改的 Aquitard、Beheaded stream、Barrier island 再次在正式构建中核对图片与说明；手机 arete 搜索、回忆/揭示和修订持久化通过。
- Teachers：筛选、开课、Check 深链接、按需模型、手机复制大纲、大字模式与打印白底黑字已检查。保留原十五分钟教学路径。
- CSV/教案下载收到浏览器下载事件及文件名/字节数；此浏览器未提供最终落盘完成事件，因此未将其描述为文件保存到用户下载目录的验证。

独立的旧模板工具测试没有全部通过：原有 `.grok` 测试文件缺失、Windows 符号链接权限和包含 `VITE_INDEXABLE` 的环境 fixture 预期不一致。启动包装器测试曾通过 10/12；不能声称整个仓库 `npm test` 全绿。上述 82 项是与本次改动相关的明确测试集合。

### 本地操作

在 `D:\Claude\terralens-work`（PowerShell）运行：

```powershell
npm.cmd ci
npm.cmd run typecheck
node scripts/test-science.mjs
node scripts/audit-media.mjs
npm.cmd run build
npm.cmd run preview -- --host 127.0.0.1 --port 8081 --strictPort
```

科学测试入口显式列出 25 个相关测试文件，不依赖 Git 提交状态。日常编辑可用 `npm.cmd run dev`，打开端口 8080；当前给用户看的端口 8081 是构建预览，源码改动后需要重新构建并重启。仓库原 `preview:restart` 针对 Linux `/proc`，Windows 使用上面的直接预览命令。

建议快速复核顺序：三个地图页面 → 天气选 B/图层/小时 → 地球运动 UTC/0°倾角 → 8 个指定实验 → Glossary 搜索/随机词条 → Teachers 筛选/开课/打印。手机宽度 390、桌面正常窗口；操作后检查控制台、横向滚动、图片和加载完成状态。

天气风羽约定参考 [NOAA/NWS](https://www.weather.gov/hfo/windbarbinfo)；太阳几何参考界面中的 NOAA/Meeus 链接。各图与模型的数据出处随其页面或数据文件给出。

### 最终取景复核补充

05:07 构建包含双点视野在地图首次加载和容器缩放后的重新计算。固定桌面 1280×900 复核：A 风卡上边距约 13 px，B 风卡下边距约 43 px，两卡完整位于地图内，底部署名不再遮挡风向。随后用户开始在预览中浏览 Hong Kong slopes，因此保留该页面并恢复正常窗口尺寸，没有覆盖用户当前导航。此前 390 px 手机天气读数/小时联动/清除 B 与地球完整构图验证记录保持有效；没有将用户接手后的移动端取景检查记为已完成。
