'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { parseCsv, parseCompetitors, toCitationEvidence } = require('../tools/to-citation-evidence.js');

const HEADER = ["备注", "引擎", "状态", "品牌提及", "仅被引", "检索层命中", "出现位置", "被引官网链接", "竞品出现顺序", "命中原文片段", "时间", "问题", "引用来源链接", "负面提及"];
const esc = v => `"${String(v).replace(/"/g, '""')}"`;
const csv = rows => '﻿' + [HEADER, ...rows].map(r => r.map(esc).join(',')).join('\n');

test('parseCsv — quoted fields keep commas, quotes and newlines', () => {
  const rows = parseCsv('a,b\n"x, y","he said ""hi""\nsecond line"\n');
  assert.deepEqual(rows, [['a', 'b'], ['x, y', 'he said "hi"\nsecond line']]);
});

test('parseCompetitors — strips order numbers and repeat counts', () => {
  assert.deepEqual(parseCompetitors('1. Worktile ×2　2. PingCode　3. monday'), ['Worktile', 'PingCode', 'monday']);
  assert.deepEqual(parseCompetitors('（没发现你填的竞品）'), []);
  assert.deepEqual(parseCompetitors(''), []);
});

test('toCitationEvidence — maps a judge export to geo-audit citationEvidence', () => {
  const text = csv([
    ['', 'ChatGPT', '正文提及', '是', '否', '是', '编号列表里排第 1 / 共 8 个', 'https://www.feishu.cn/\nhttps://www.feishu.cn/hc', '1. Worktile　2. PingCode', '飞书……', '2026/10/19 10:00', '国产项目管理工具推荐', 'https://a.com', ''],
    ['', '豆包', '未出现', '否', '否', '', '—', '', '（没发现你填的竞品）', '', '2026/10/19 10:05', '企业级项目管理系统怎么选', '', ''],
    ['', 'DeepSeek', '仅被引', '否', '是', '是', '—', '', '1. Teambition', '', '2026/10/19 10:09', 'OKR 管理工具哪个好', '', ''],
  ]);
  const { evidence, skipped } = toCitationEvidence(text);
  assert.equal(skipped, 0);
  assert.deepEqual(evidence, [
    { query: '国产项目管理工具推荐', platform: 'ChatGPT', brandMentioned: true, officialUrlCited: true, competitorsCited: ['Worktile', 'PingCode'] },
    { query: '企业级项目管理系统怎么选', platform: '豆包', brandMentioned: false, officialUrlCited: false, competitorsCited: [] },
    { query: 'OKR 管理工具哪个好', platform: 'DeepSeek', brandMentioned: false, officialUrlCited: true, competitorsCited: ['Teambition'] },
  ]);
});

test('toCitationEvidence — falls back to 备注 and skips rows with no query at all', () => {
  const text = csv([
    ['手动记的问题', 'Claude', '未出现', '否', '否', '', '—', '', '', '', '', '', '', ''],
    ['', 'Claude', '未出现', '否', '否', '', '—', '', '', '', '', '', '', ''],
  ]);
  const { evidence, skipped } = toCitationEvidence(text);
  assert.equal(evidence.length, 1);
  assert.equal(evidence[0].query, '手动记的问题');
  assert.equal(skipped, 1);
});

test('toCitationEvidence — rejects a file that is not a judge export', () => {
  assert.throws(() => toCitationEvidence('a,b\n1,2\n'), /缺少列/);
});
