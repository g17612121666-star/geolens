# Round 5 · 按中文讲解习惯重写

## 范围与结果

- 阅读 62 个实验的标题、目标、四步讲解与原理段落，复核 417 个术语定义；同时检查教案常见误解、35 个案例和 184 个地图集地点的中文描述。
- 本轮共改写、统一或补齐 760 个词典条目（包含重复文案同步、术语统一、上下文专用译名与此前遗漏的状态提示，并非 760 篇独立文章）。逐项前后对照见 `round5-chinese-edits.json`。
- 中文按“现象—原因—如何操作—模型局限”组织，去掉英语句式和不必要的抽象表达。保留科学关系、数值、SI 单位、教学限制和原有操作。
- 导航、实验目录、术语页、教案、地图集和工具中的名称保持一致。水循环明确区分一般储水位置和人工水库；气象 Visibility 改为能见度；Inversion 在地质语境下为构造反转；Surface trace 在锋面语境下为锋线。
- Intensity 在地震词条中显示地震烈度，在其他控件中保留强度；纽约市与纽约州、密西西比河与密西西比州采用独立上下文。
- 分页、已掌握数量、教案环节入口、预报时段改为整句翻译，避免按英文顺序拼接中文。补齐天气加载/错误/限流、分享反馈、地图预设等运行时提示。
- 更新中文字体子集：1811 个码位，484,820 字节。英文文案与品牌保留，来源署名、许可证名称和原视频标题保留原文。

## 最小配套修改

- `src/lib/i18n/index.ts`：上下文术语加入中文搜索；回退句式调整。
- `src/routes/glossary.tsx`、`search.tsx` 和 `src/components/lab/why-panel.tsx`：术语上下文；词条计数与分页整句处理。
- `src/routes/teachers.$slug.tsx`、`src/lib/teachers/workflow.ts`：教案按钮和导出时间段保持自然中文。
- `src/routes/tools.live-weather.tsx`：预报标题按完整句式翻译。
- `src/lib/photo-assign.ts`：两处术语语义纠错需要同步配图。构造反转改用已有珀贝克海岸白垩岩照片；锋线改用已有安大略冷锋云照片。保留原始 credit/许可，并重写双语图注，明确不能只凭一张照片推断地质历史或锋线的精确位置。没有新增下载图片。
- 校对源稿保存在 `scripts/zh-editorial/`，额外上下文在 `scripts/zh-editorial-extra.json`。`scripts/apply-zh-editorial.mjs` 校验插值占位符并生成最终词典和对照清单。请勿重新生成冻结的 `zh-editorial-source.json`，否则源稿编号会变化。
- 保留已有未提交工作；本轮没有提交或推送源码，没有修改模型几何、账户权限或域名。

## 验证

- `node --test --test-isolation=none scripts/preferences-i18n.test.mjs scripts/teaching-workflow.test.mjs`：8 项通过。包括内容覆盖、上下文术语、城市/州名、数值/单位/模板、中文检索、偏好设置和教案链接/答案一致性。
- `npm run typecheck`：通过。
- `npm run build`：通过；日志 `round5-build.log`。数据库配置缺失时构建按项目原有逻辑跳过迁移。
- 浏览器本地检查：首页、手机术语检索、地震烈度/构造反转/锋线词条、教案、水循环、实时天气。天气真实数据与底图成功显示；中文读数、能见度、未来 72 小时标题正确。
- 英文/中文切换均显示对应语言。教案复制按钮显示成功；本轮浏览器剪贴板接口没有返回文本，因此没有把剪贴板正文列为本轮已验证项。导出函数由测试覆盖。
- 正式构建在 8081 预览，390×844 手机水循环页加载并显示三维场景、中文讲解和操作控件；页面可用宽度与内容宽度均为 375 px（含系统滚动条），无水平溢出。所检查页未记录到控制台 error。外部视频仍依赖提供方网络。
- 本轮没有重新逐一操作全部 62 个模型参数；模型验收记录仍见 Round 4。本轮全量覆盖检查是文案检查，不等于每一个词条都重新改写。

## 本地复现

1. `npm run dev`，打开 `http://127.0.0.1:8080/`，在“语言与外观”选择简体中文。
2. 查看 `/lab/water-cycle` 与 `/teachers/water-cycle`，核对标题、四个学习环节、原理和教案的一致性。
3. `/glossary?q=烈度`，打开地震烈度；再查看 `?term=Inversion`、`?term=Surface%20trace`，核对定义和照片。
4. `/tools/live-weather` 查看纽约、能见度、未来 72 小时和数据说明；切回 English 核对原英文仍在。
5. 运行上述测试及类型检查；构建后用 `npm run preview -- --host 127.0.0.1 --port 8081` 检查正式产物。

## 专业含义核对来源

- BGS，英国南部新生代构造与盆地反转：<https://earthwise.bgs.ac.uk/index.php/Bedrock_Geology_UK_South%3A_Cenozoic>
- BGS，侏罗纪海岸海陆连续基岩地图：<https://www.bgs.ac.uk/geology-projects/sea-floor-marine-geoscience/seamless-bedrock-map-of-the-jurassic-coast/>
- Met Office，锋与锋面：<https://weather.metoffice.gov.uk/learn-about/weather/atmosphere/weather-fronts>

## 发布

- 目标为现有站点 `https://terralens-kohl.vercel.app/`，部署同一 Vercel project；不修改访问权限。
- 上一生产部署（回退参考）：`dpl_5S5Rq4QREvkkTz7pBvnVdReLDkkA`。
- 本轮生产部署 `dpl_BmsiQA3Myy2WzEgA5RAmLgzWe7qg` 已 READY，公开别名更新成功；日志 `round5-deploy.log`。
- 不变部署地址：`https://terralens-qh16th6pt-harryxin0919s-projects.vercel.app`。
- 公开首页切换简体中文后，显示“看懂地球，探索世界。”及新的八主题说明。公开手机术语页 `?term=Intensity` 显示地震烈度及正确的 USGS 配图，页面无水平溢出、破图或控制台 error。
- 本轮公开检查为首页和手机术语页；水循环三维场景及工具读数在同一正式构建的本地预览/开发预览中检查。未把本地检查写作全部线上检查。
- 临时手机/桌面视口覆盖已撤销，浏览器留在公开中文首页。
