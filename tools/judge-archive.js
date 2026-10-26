#!/usr/bin/env node
'use strict';

// Judge every row of an answer-archive CSV from the command line, with the same
// logic the page uses for "导入存档表". The judging code is not copied here: it is
// read from index.html (the CORE and PURE blocks) at run time, so the page and
// this script can never drift apart.
//
//   node tools/judge-archive.js 回答存档表.csv --brand "飞书, Feishu, Lark" --domain feishu.cn \
//        --competitors "钉钉|DingTalk, 企业微信|WeCom" [-o geo_judge_results.csv]
//
// Output is the same CSV the page's 「下载 CSV」 gives (BOM, same columns), so
// tools/to-citation-evidence.js and the answer-archive index builder read it as is.

process.env.TZ = process.env.TZ || 'Asia/Shanghai';   // 「时间」列和网页一样按北京时间写

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const PAGE = path.join(__dirname, '..', 'index.html');

function block(html, name) {
  const m = html.match(new RegExp(`/\\* ===== ${name}-BEGIN ===== \\*/([\\s\\S]*?)/\\* ===== ${name}-END ===== \\*/`));
  if (!m) throw new Error(`index.html 里找不到 ${name} 块，页面结构变了，要同步改这个脚本`);
  return m[1];
}

// Load the judging functions from the page into a sandbox and hand them back
function loadJudge(pagePath = PAGE) {
  const html = fs.readFileSync(pagePath, 'utf8');
  const engines = [...html.match(/<select id="engine"[\s\S]*?<\/select>/)[0].matchAll(/<option value="([^"]+)"/g)].map(m => m[1]);
  const ctx = vm.createContext({});
  vm.runInContext(block(html, 'CORE') + '\n' + block(html, 'PURE') +
    '\n;({ buildConfig, parseCSV, archiveToInputs, judgeArchiveItem, archiveTs, toCSV, rowFields, ROW_HEADER })', ctx);
  const api = vm.runInContext('({ buildConfig, parseCSV, archiveToInputs, judgeArchiveItem, archiveTs, toCSV, rowFields, ROW_HEADER })', ctx);
  return { ...api, engines };
}

// Same steps as importArchive() on the page, minus the browser parts
function judgeArchive(csvText, opts, judge = loadJudge()) {
  const cfg = judge.buildConfig(opts.brand, opts.domain, opts.competitors);
  if (!cfg) throw new Error('要填 --brand（品牌名，多个叫法用逗号隔开）');
  const { items, skipped, error } = judge.archiveToInputs(judge.parseCSV(csvText), judge.engines);
  if (error) throw new Error('这个文件判不了：' + error);
  const records = [], seen = new Set();
  items.forEach((it, i) => {
    if (it.shareUrl && seen.has(it.shareUrl)) { skipped.push({ ...it, reason: '同一分享链接出现了两次，只判第一次' }); return; }
    seen.add(it.shareUrl);
    const a = judge.judgeArchiveItem(it, cfg);
    records.push({ ts: judge.archiveTs(it.date, i), qid: it.question, note: it.question, engine: it.engine, ...a,
      shareUrl: it.shareUrl, tier: it.tier, round: it.round });
  });
  // 沙箱里造出来的数组、对象原型和外面不是同一个，转一道 JSON 交出去，调用方拿到的是普通对象
  const plain = x => JSON.parse(JSON.stringify(x));
  return { records: plain(records), skipped: plain(skipped), csv: judge.toCSV(records) };
}

function parseArgs(argv) {
  const opts = { input: '', out: 'geo_judge_results.csv', brand: '', domain: '', competitors: '' };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--brand') opts.brand = argv[++i];
    else if (a === '--domain') opts.domain = argv[++i];
    else if (a === '--competitors') opts.competitors = argv[++i];
    else if (a === '-o' || a === '--out') opts.out = argv[++i];
    else if (!opts.input) opts.input = a;
    else throw new Error('多了一个参数：' + a);
  }
  if (!opts.input) throw new Error('用法：node tools/judge-archive.js 回答存档表.csv --brand 品牌 --domain 官网域名 --competitors 竞品 [-o 输出.csv]');
  return opts;
}

if (require.main === module) {
  try {
    const opts = parseArgs(process.argv.slice(2));
    const { records, skipped, csv } = judgeArchive(fs.readFileSync(opts.input, 'utf8'), opts);
    fs.writeFileSync(opts.out, csv);
    const count = {};
    for (const r of records) count[r.status] = (count[r.status] || 0) + 1;
    console.error(`判定 ${records.length} 条，跳过 ${skipped.length} 条 → ${opts.out}`);
    if (records.length) console.error('  ' + Object.entries(count).map(([k, v]) => `${k} ${v}`).join('，'));
    for (const s of skipped) console.error(`  跳过 第 ${s.line} 行 · ${s.engine || '—'} · ${(s.question || '（没写问题）').slice(0, 40)}：${s.reason}`);
  } catch (e) {
    console.error(e.message);
    process.exit(1);
  }
}

module.exports = { loadJudge, judgeArchive };
