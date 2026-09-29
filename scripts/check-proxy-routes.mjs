#!/usr/bin/env node
// Checks the hand-written API proxies (src/app/proxy/**/*.ts) against the API's real routes.
//
// The proxies are written by hand, and a guessed route fails only at runtime with a 404. This compares every
// `method` + `url` a proxy calls with the routes the API publishes at /api/abp/api-definition.
//
//   node scripts/check-proxy-routes.mjs                 check against src/app/proxy/api-routes.snapshot.json (what CI runs)
//   node scripts/check-proxy-routes.mjs --refresh URL   fetch URL/api/abp/api-definition from a running API and rewrite the snapshot
//
// Refresh the snapshot whenever the API's application services change, and commit it with the proxy change.
import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const proxyDir = join(root, 'src', 'app', 'proxy');
const snapshotPath = join(proxyDir, 'api-routes.snapshot.json');

const normalise = (url) =>
  '/' +
  url
    .replace(/\$\{[^}]*\}/g, '{p}')
    .replace(/^\/+/, '')
    .split('?')[0]
    .replace(/\/+$/, '')
    .split('/')
    .map((seg) => (/^\{[^}]+\}$/.test(seg) || /^\$\{[^}]+\}$/.test(seg) ? '{}' : seg.toLowerCase()))
    .join('/');

async function refresh(base) {
  const res = await fetch(base.replace(/\/+$/, '') + '/api/abp/api-definition');
  if (!res.ok) throw new Error(`api-definition returned ${res.status}`);
  const def = await res.json();
  const routes = new Set();
  for (const mod of Object.values(def.modules)) {
    for (const controller of Object.values(mod.controllers)) {
      for (const action of Object.values(controller.actions)) {
        routes.add(`${action.httpMethod.toUpperCase()} ${normalise(action.url)}`);
      }
    }
  }
  const sorted = [...routes].sort();
  writeFileSync(
    snapshotPath,
    JSON.stringify({ source: '/api/abp/api-definition', routes: sorted }, null, 2) + '\n',
  );
  console.log(`Wrote ${sorted.length} routes to ${relative(root, snapshotPath)}.`);
}

function proxyFiles(dir) {
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) return proxyFiles(p);
    return name.endsWith('.ts') && !name.endsWith('.spec.ts') ? [p] : [];
  });
}

// Every request object in a proxy: `method: 'X'` followed (within the same object) by `url: '...'` or `url: \`...\``.
function callsIn(file) {
  const text = readFileSync(file, 'utf8');
  const calls = [];
  // A proxy may keep its prefix in `private base = '/api/...'` and build `${this.base}/...`: resolve it so those calls are checked too.
  const base = /\bbase\s*=\s*'([^']+)'/.exec(text)?.[1];
  const re = /method:\s*'([A-Z]+)'[\s\S]{0,200}?url:\s*(?:'([^']+)'|`([^`]+)`)/g;
  let m;
  while ((m = re.exec(text))) {
    const url = (m[2] ?? m[3]).replace('${this.base}', base ?? '${this.base}');
    if (!url.startsWith('/api/')) continue;
    const line = text.slice(0, m.index).split('\n').length;
    calls.push({
      method: m[1],
      url,
      route: `${m[1]} ${normalise(url)}`,
      where: `${relative(root, file)}:${line}`,
    });
  }
  return calls;
}

async function main() {
  const i = process.argv.indexOf('--refresh');
  if (i >= 0) {
    await refresh(process.argv[i + 1] ?? 'https://localhost:44320');
    return;
  }

  const snapshot = JSON.parse(readFileSync(snapshotPath, 'utf8'));
  const known = new Set(snapshot.routes);
  const calls = proxyFiles(proxyDir).flatMap(callsIn);
  const missing = calls.filter((c) => !known.has(c.route));

  if (missing.length) {
    console.error(`${missing.length} proxy call(s) have no matching API route:`);
    for (const c of missing) console.error(`  ${c.where}  ${c.method} ${c.url}`);
    console.error(
      '\nFix the proxy, or refresh the snapshot if the API changed: node scripts/check-proxy-routes.mjs --refresh <api url>',
    );
    process.exit(1);
  }
  console.log(`All ${calls.length} proxy calls match an API route.`);
}

main().catch((e) => {
  console.error(e.message ?? e);
  process.exit(1);
});
