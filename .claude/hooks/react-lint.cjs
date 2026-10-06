#!/usr/bin/env node
'use strict';

const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const { readPayload, allow, surfaceToModel, extractFileEdit } = require('./_util.cjs');

const ROOT = process.env.CLAUDE_PROJECT_DIR || path.resolve(__dirname, '..', '..');
const APP = 'frontend';
const APP_DIR = path.join(ROOT, APP);
const LINTED = /^frontend\/src\/.+\.(?:t|j)sx?$/;
const IS_WINDOWS = process.platform === 'win32';
const OUTPUT_LIMIT = 2000;
const TIMEOUT_MS = 60000;

function runTool(bin, args, cwd, timeout) {
  const quote = (s) => (IS_WINDOWS ? `"${s}"` : s);
  return execFileSync(quote(bin), args.map(quote), {
    cwd,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
    timeout,
    shell: IS_WINDOWS,
  });
}

function relativeToRoot(filePath) {
  const rel = path.relative(ROOT, path.resolve(ROOT, filePath)).replace(/\\/g, '/');
  return rel.startsWith('..') ? null : rel;
}

function localEslint() {
  const bin = path.join(APP_DIR, 'node_modules', '.bin', IS_WINDOWS ? 'eslint.cmd' : 'eslint');
  return fs.existsSync(bin) ? bin : null;
}

function eslintCheck(filePath) {
  const eslint = localEslint();
  if (!eslint) return null;
  try {
    runTool(eslint, ['--max-warnings=0', path.resolve(ROOT, filePath)], APP_DIR, TIMEOUT_MS);
    return null;
  } catch (err) {
    if (err.code === 'ENOENT' || err.killed) return null;
    return ((err.stdout || '') + (err.stderr || '')).trim() || `eslint failed on ${filePath}`;
  }
}

(async () => {
  const payload = await readPayload();
  const { filePath } = extractFileEdit(payload);
  if (!filePath) return allow();

  const rel = relativeToRoot(filePath);
  if (!rel || !LINTED.test(rel)) return allow();

  const finding = eslintCheck(rel);
  if (!finding) return allow();

  return surfaceToModel(
    `ESLint flagged ${rel} - fix it before moving on, because the ${APP} gate commands run ESLint with --max-warnings=0:\n${finding.slice(
      0,
      OUTPUT_LIMIT,
    )}`,
  );
})();
