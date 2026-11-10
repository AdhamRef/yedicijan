#!/usr/bin/env node
// Offline, read-only API/UI/Cron/Prisma inventory. Presence is NOT functional parity.
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export function kind(p) {
  if (/(^|\/)sms(\/|\.|$)/i.test(p)) return null;
  if (/^app\/\(dashboard\)\/dashboard\/.*\/page\.(tsx|jsx)$/.test(p)) return 'dashboard_page';
  if (/^app\/api\/cron\/.*\/route\.[jt]s$/.test(p)) return 'cron_api';
  if (/^app\/api\/.*\/route\.[jt]s$/.test(p)) return 'api';
  if (/^app\/.*\/page\.(tsx|jsx)$/.test(p)) return 'public_page';
  return null;
}

export function models(schema) {
  const out = new Map();
  let name = null;
  for (const line of schema.split(/\r?\n/)) {
    const m = /^model\s+(\w+)\s*\{/.exec(line);
    if (m) { name = m[1]; out.set(name, new Set()); continue; }
    if (/^\}/.test(line)) { name = null; continue; }
    if (!name) continue;
    const f = /^\s+([A-Za-z]\w*)\s+(\w+(?:\[\]|\?)?)(?:\s|$)/.exec(line);
    if (f) out.get(name).add(f[1] + ':' + f[2]);
  }
  return out;
}

export function compareSurface(srcFiles, dstFiles, srcSchema = '', dstSchema = '') {
  const src = new Set(srcFiles.filter(kind));
  const dst = new Set(dstFiles.filter(kind));
  const rows = [...new Set([...src, ...dst])].sort().map(id => ({
    type: kind(id), id, baseline: src.has(id), target: dst.has(id),
    presence: !src.has(id) ? 'TARGET_ONLY' : dst.has(id) ? 'PATH_PRESENT' : 'PATH_MISSING',
    functionalStatus: 'NOT_VERIFIED'
  }));
  const sm = models(srcSchema), dm = models(dstSchema);
  for (const name of [...new Set([...sm.keys(), ...dm.keys()])].sort()) {
    const a = sm.get(name), b = dm.get(name);
    rows.push({
      type: 'prisma_model', id: 'prisma:model:' + name,
      baseline: !!a, target: !!b,
      presence: !a ? 'TARGET_ONLY' : b ? 'MODEL_PRESENT' : 'MODEL_MISSING',
      missingSourceFields: a ? [...a].filter(field => !b?.has(field)).length : null,
      functionalStatus: 'NOT_VERIFIED'
    });
  }
  const summary = {};
  for (const type of ['dashboard_page','public_page','api','cron_api','prisma_model']) {
    const r = rows.filter(row => row.type === type);
    const needed = r.filter(row => row.baseline);
    const same = needed.filter(row => row.target);
    summary[type] = {
      sourceCount: needed.length, targetCount: r.filter(row => row.target).length,
      commonCount: same.length, missingCount: needed.length - same.length,
      targetOnlyCount: r.filter(row => !row.baseline).length,
      structuralCoveragePercent: needed.length ? Math.round(same.length / needed.length * 10000) / 100 : null,
      functionallyVerified: 0
    };
  }
  return { warning: 'Path and schema-text comparison ONLY. UI/API/payment/DB permissions are NOT verified.', summary, rows };
}

function git(repo, args) {
  return execFileSync('git', ['-C', path.resolve(repo), ...args], {
    encoding: 'utf8', stdio: ['ignore','pipe','pipe'], timeout: 30000, maxBuffer: 33554432
  });
}

function inventory(repo, ref) {
  const sha = git(repo, ['rev-parse','--verify', ref + '^{commit}']).trim();
  const files = git(repo, ['ls-tree','-r','--name-only',sha]).split('\n').filter(Boolean);
  let schema = '';
  try { schema = git(repo, ['show', sha + ':prisma/schema.prisma']); } catch { /* missing schema */ }
  return { sha, files, schema };
}

function cli(argv) {
  const opts = { 'source-ref': 'HEAD', 'target-ref': 'HEAD', format: 'json' };
  for (let i = 0; i < argv.length; i += 2) {
    if (!/^--(source|target|source-ref|target-ref|format)$/.test(argv[i]) || !argv[i + 1])
      throw new Error('Invalid args');
    opts[argv[i].slice(2)] = argv[i + 1];
  }
  if (!opts.source || !opts.target || !['json','csv'].includes(opts.format)) throw new Error('Invalid args');
  const a = inventory(opts.source, opts['source-ref']);
  const b = inventory(opts.target, opts['target-ref']);
  const report = compareSurface(a.files,b.files,a.schema,b.schema);
  report.sourceCommit = a.sha;
  report.targetCommit = b.sha;
  if (opts.format === 'json') { process.stdout.write(JSON.stringify(report,null,2) + '\n'); return; }
  const cols = ['type','id','baseline','target','presence','missingSourceFields','functionalStatus'];
  const quote = v => { const s = v == null ? '' : String(v); return /[",\n\r]/.test(s) ? '"' + s.replaceAll('"','""') + '"' : s; };
  process.stdout.write([cols.join(','),...report.rows.map(row => cols.map(c => quote(row[c])).join(','))].join('\n') + '\n');
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { cli(process.argv.slice(2)); }
  catch { process.stderr.write('Audit blocked: invalid paths, refs, or Git repository\n'); process.exitCode = 2; }
}
