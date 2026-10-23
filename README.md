# GEO 可见度判定助手

**把 AI 的回答粘进来，看你的品牌有没有被提到、排第几、竞品是谁、有没有被引用。**

在 ChatGPT、Claude、Perplexity、Google AI 概览、DeepSeek 或豆包里问一个你的客户会问的问题，把回答整段复制进来，工具会判定品牌在这条回答里处在哪一层。测上几条之后，它会自动汇总成记分卡、行动建议和引用来源清单。

纯前端单文件，所有判定都在你的浏览器里完成，不上传任何数据。

- **在线用**：[aimarketinglift.com/tools/geo-judge](https://aimarketinglift.com/tools/geo-judge)
- **本地用**：下载 [`index.html`](index.html)，双击用浏览器打开即可，不用装任何东西

## 五种判定结果

一条回答只会落在其中一种，从强到弱：

| 状态 | 意思 |
|------|------|
| ✅ 正文提及 | 品牌名直接出现在回答正文里，这是最强的可见度 |
| 🔗 仅被引 | 官网被当作来源引用了，但正文没写你的名字 |
| 🔍 仅检索到 | 只出现在搜索或来源面板里，正文和引用都没用到你 |
| ⚪ 无引用数据 | 粘进来的内容没有任何链接，也没有检索面板，只能确认正文没点名你 |
| ❌ 未出现 | 正文、引用、检索里都没有你的品牌 |

大多数同类工具只回答"有没有提到"。分出这五层，才知道问题卡在哪：没被检索到是抓取和来源的问题，检索到了却没被引用是内容的问题，被引用了却没被点名是表述和权威的问题。

## 能做什么

- **单条判定**：品牌有没有被点名、在编号列表里排第几、被引用的官网链接、竞品按出现顺序排列、命中的原文片段，还能手动标记"这次是负面提及"
- **汇总记分卡**：可见率、SOV、平均位次、各引擎覆盖情况；样本少于 5 条时只提示"样本不足"，不拿一两条记录下结论
- **行动建议**：根据结果判断问题出在抓取、内容还是引用排名
- **引用来源情报**：汇总 AI 实际引用过的第三方域名并按次数排序，就是一份值得去铺内容的渠道清单
- **测试计划矩阵**：先列出客户会问的问题，生成"问题 × 引擎"矩阵，点未测的格子直接开始测，不容易漏
- **优化前后对比**：填一个分界日期，记录自动分成优化前和优化后两组
- **导出**：一键复制到 Excel，或下载 CSV

## 支持的引擎

ChatGPT、Claude、Perplexity、Google AI 概览、DeepSeek、豆包。

每个引擎的复制方式不一样，页面里有逐步说明。最容易踩的坑：DeepSeek 和豆包回答下方自带的"复制"按钮只给干净正文，会把来源全部丢掉，这样只能判断"正文有没有点名"，判断不了"是否被引用"。要手动框选整段回答再复制。

工具会自动把回答正文和搜索/来源面板分开，各引擎的分界规则写在源码注释里，公开可复现。

## 数据和隐私

- 判定逻辑全部在浏览器本地运行，粘贴的回答不会发送到任何服务器
- 测试记录存在你自己浏览器的 localStorage 里（最多 200 条），跨会话累积；换设备或清浏览器数据会丢失，重要结果请导出 CSV
- 页面会从 aimarketinglift.com 加载引擎图标、从 Google Fonts 加载字体，这两类请求不带任何你的数据；断网时只是图标和字体显示不出来，判定照常可用

## 和 geo-audit 配合用

[geo-audit](https://github.com/jiguang9/geo-audit) 诊断的是你的网站具不具备被 AI 引用的条件，这个工具测的是 AI 实际怎么回答。把这里测出来的结果喂给 geo-audit，诊断报告会多出一张"查询 × 平台"引用矩阵：

```bash
# 1. 在判定助手里点「下载 CSV」，得到 geo_judge_results.csv
# 2. 转成 geo-audit 的 citationEvidence 格式（需要 Node 18+，零依赖）
node tools/to-citation-evidence.js geo_judge_results.csv --context
```

把输出的那一行 `citationEvidence: [...]` 粘进你项目里的 `.agents/geo-audit-context.md`，再跑一次 geo-audit 即可。不加 `--context` 输出格式化的 JSON。

同一个问题在同一个引擎上测了多次，每次都会各自转成一条记录。

## 局限

- 这是单条判定工具，没有对接任何 AI 引擎的接口，不会帮你自动去问；问题要你自己去各个引擎问，再把回答粘回来
- AI 的回答本身会波动，一次结果只代表那一刻；同一个问题建议隔天再测几次，再看汇总
- 匹配规则基于品牌名和官网域名的文本匹配，品牌名是常见词时可能误判，填竞品和别名时尽量具体
- 各引擎界面改得勤，页面里的复制说明以 2026 年 10 月的界面为准

## 项目结构

```
index.html                      判定助手本体（单文件，打开即用）
tools/to-citation-evidence.js   CSV → geo-audit citationEvidence
tests/                          转换脚本的测试（npm test）
scripts/sync-from-site.py       从官网版重新生成 index.html
```

官网上的版本是主版本，这里的 `index.html` 由 `scripts/sync-from-site.py` 生成：去掉官网的统计代码、导航和结构化数据，把站内链接改成绝对地址。

## 关于作者

硅基光哥，做 GEO、AI 营销和出海获客。更多方法和实测在 [aimarketinglift.com](https://aimarketinglift.com)，同系列还有 [geo-audit](https://github.com/jiguang9/geo-audit) 等几个开源 Skill，见 [GitHub 主页](https://github.com/jiguang9)。

用得顺手的话点个 Star，遇到判定不准的回答，欢迎提 [Issue](https://github.com/jiguang9/geo-judge/issues) 附上脱敏后的原文。

## License

MIT
