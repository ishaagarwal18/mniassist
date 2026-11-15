// Runs `ng test` from the project folder with an upper-case Windows drive letter.
//
// Why: a terminal opened as `d:\...` (VS Code does this) makes Vitest load its runner module once as `d:/…` and once
// as `D:/…`. Node treats those as two different modules, so Angular's test-bed set-up finds no runner and every
// spec file fails with "Vitest failed to find the runner" before a single test runs. Starting from `D:\…` keeps one
// spelling. Elsewhere (Linux, macOS, an upper-case drive already) this changes nothing.
//
// Usage: npm test [-- <ng test options>], e.g. npm test -- --include=src/app/features/inbox/**/*.spec.ts
import { spawn } from 'node:child_process';
import process from 'node:process';

const cwd = process.cwd().replace(/^([a-z]):/, (_, d) => `${d.toUpperCase()}:`);
const args = ['ng', 'test', '--watch=false', ...process.argv.slice(2)];

const child = spawn('npx', args, { cwd, stdio: 'inherit', shell: process.platform === 'win32' });
child.on('exit', (code, signal) => process.exit(signal ? 1 : (code ?? 1)));
