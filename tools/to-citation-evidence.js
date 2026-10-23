#!/usr/bin/env node
'use strict';

// Convert geo_judge_results.csv (exported by the judge page) into the
// `citationEvidence` array that geo-audit reads from .agents/geo-audit-context.md.
//
//   node tools/to-citation-evidence.js geo_judge_results.csv            # JSON array
//   node tools/to-citation-evidence.js geo_judge_results.csv --context  # paste-ready context line

const fs = require('fs');

const COL = {
  note: '备注',
  engine: '引擎',
  mentioned: '品牌提及',
  citedOnly: '仅被引',
  brandUrls: '被引官网链接',
  competitors: '竞品出现顺序',
  question: '问题',
};

// RFC 4180-style parser: quoted fields may contain commas, quotes ("") and newlines
function parseCsv(text) {
  const rows = [];
  let row = [], field = '', quoted = false;
  text = text.replace(/^﻿/, '');
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"' && text[i + 1] === '"') { field += '"'; i++; }
      else if (ch === '"') quoted = false;
      else field += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ',') { row.push(field); field = ''; }
    else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && text[i + 1] === '\n') i++;
      row.push(field); rows.push(row); row = []; field = '';
    } else field += ch;
  }
  if (field !== '' || row.length) { row.push(field); rows.push(row); }
  return rows.filter(r => r.some(v => v.trim() !== ''));
}

// "1. 竞品A ×2　2. 竞品B" → ["竞品A", "竞品B"]; the judge writes a placeholder when none were found
function parseCompetitors(cell) {
  if (!cell || /没发现/.test(cell)) return [];
  return cell.split(/　+/)
    .map(s => s.replace(/^\s*\d+\.\s*/, '').replace(/\s*×\d+\s*$/, '').trim())
    .filter(Boolean);
}

function toCitationEvidence(csvText) {
  const [header, ...rows] = parseCsv(csvText);
  if (!header) return { evidence: [], skipped: 0 };
  const idx = {};
  for (const [key, name] of Object.entries(COL)) {
    idx[key] = header.indexOf(name);
    if (idx[key] === -1) throw new Error(`CSV 缺少列「${name}」，请用判定助手的「下载 CSV」导出的原文件`);
  }
  const evidence = [];
  let skipped = 0;
  for (const r of rows) {
    const query = (r[idx.question] || r[idx.note] || '').trim();
    if (!query) { skipped++; continue; }
    evidence.push({
      query,
      platform: (r[idx.engine] || '').trim(),
      brandMentioned: r[idx.mentioned] === '是',
      officialUrlCited: r[idx.citedOnly] === '是' || (r[idx.brandUrls] || '').trim() !== '',
      competitorsCited: parseCompetitors(r[idx.competitors]),
    });
  }
  return { evidence, skipped };
}

if (require.main === module) {
  const file = process.argv[2];
  if (!file) {
    console.error('Usage: node tools/to-citation-evidence.js <geo_judge_results.csv> [--context]');
    process.exit(1);
  }
  const { evidence, skipped } = toCitationEvidence(fs.readFileSync(file, 'utf8'));
  if (skipped) console.error(`跳过 ${skipped} 行：没有「问题」也没有「备注」，geo-audit 无法把它归到某个查询`);
  const json = JSON.stringify(evidence);
  console.log(process.argv.includes('--context') ? `citationEvidence: ${json}` : JSON.stringify(evidence, null, 2));
}

module.exports = { parseCsv, parseCompetitors, toCitationEvidence };
