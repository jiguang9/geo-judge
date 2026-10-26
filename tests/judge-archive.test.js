'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { loadJudge, judgeArchive } = require('../tools/judge-archive.js');

const HEADER = ['问题原文', '平台', '档位', '第几次', '日期', '回答正文', '来源列表', '分享链接', '取数状态', '原始数据文件', '搜索词'];
const esc = v => `"${String(v).replace(/"/g, '""')}"`;
const csv = rows => '﻿' + [HEADER, ...rows].map(r => r.map(esc).join(',')).join('\n');
const OPTS = { brand: 'Acme, 艾克美', domain: 'acme.com', competitors: 'Foo|福, Bar' };

const ROWS = [
  // 正文点名，竞品按出现顺序
  ['项目管理工具推荐', 'DeepSeek', 'default', '1', '2026-10-24',
    '推荐三款：\n1. Bar 适合小团队\n2. Acme 功能全（来源：知乎）\n3. Foo 便宜',
    '评测 | zhihu.com | https://zhihu.com/p/1 | 正文引用', 'https://example.com/s/1', '成功', '', ''],
  // 正文没写名字，但官网被角标引用：仅被引。角标里的站点名「Acme」不算正文点名
  ['项目管理工具推荐', '豆包', '', '2', '2026-10-24',
    '可以看看 Foo 和 Bar（来源：Acme）',
    'Acme 官网 | acme.com | https://www.acme.com/pricing | 正文引用\n别的 | other.com | https://other.com/a', 'https://example.com/s/2', '成功', '', ''],
  // 只在搜索词里出现：仅检索到
  ['项目管理工具推荐', '豆包', '', '3', '2026-10-24',
    'Foo 和 Bar 都可以。\n[视频卡片：Acme 测评\n第二行说明]',
    '别的 | other.com | https://other.com/b', 'https://example.com/s/3', '成功', '', 'Acme 和 Foo 对比'],
  // 取数失败：跳过
  ['项目管理工具推荐', 'ChatGPT', '', '1', '', '', '', 'https://example.com/s/4', '要人打开看：打不开分享链接（HTTP 403）', '', ''],
];

test('loadJudge — reads the judging functions and the engine list from index.html', () => {
  const j = loadJudge();
  assert.equal(typeof j.judgeArchiveItem, 'function');
  assert.ok(j.engines.includes('DeepSeek') && j.engines.includes('豆包'));
});

test('judgeArchive — same verdicts the page gives on import', () => {
  const { records, skipped } = judgeArchive(csv(ROWS), OPTS);
  assert.deepEqual(records.map(r => r.status), ['正文提及', '仅被引', '仅检索到']);
  assert.deepEqual(records[0].comps.map(c => c.name), ['Bar', 'Foo']);
  assert.deepEqual(records[1].brandUrls, ['https://www.acme.com/pricing']);
  assert.equal(skipped.length, 1);
  assert.match(skipped[0].reason, /要人打开看/);
});

test('judgeArchive — CSV matches the page export layout', () => {
  const { csv: out } = judgeArchive(csv(ROWS), OPTS);
  const header = out.replace(/^﻿/, '').split('\n')[0];
  assert.ok(header.startsWith('"备注","引擎","状态"'));
  assert.ok(header.endsWith('"分享链接","档位","第几次"'));
  assert.ok(out.includes('"https://example.com/s/1","default","1"'));
});
