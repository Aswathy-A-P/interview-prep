#!/usr/bin/env node
'use strict';

const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const { readPayload, allow, surfaceToModel, extractFileEdit } = require('./_util.cjs');

const ROOT = process.env.CLAUDE_PROJECT_DIR || path.resolve(__dirname, '..', '..');
const APP = 'backend';
const APP_DIR = path.join(ROOT, APP);
const LINTED = /^backend\/src\/(?:main|test)\/java\/.+\.java$/;
const IS_WINDOWS = process.platform === 'win32';
const WRAPPER = IS_WINDOWS ? 'mvnw.cmd' : 'mvnw';
const OUTPUT_LIMIT = 2000;
const TIMEOUT_MS = 180000;

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

function spotlessCheck(rel) {
  const wrapper = path.join(APP_DIR, WRAPPER);
  if (!fs.existsSync(wrapper)) return null;
  const inApp = rel.slice(APP.length + 1);
  const pattern = inApp.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  try {
    runTool(wrapper, ['-q', '-o', 'spotless:check', `-DspotlessFiles=.*${pattern}`], APP_DIR, TIMEOUT_MS);
    return null;
  } catch (err) {
    if (err.code === 'ENOENT' || err.killed) return null;
    return ((err.stdout || '') + (err.stderr || '')).trim() || `spotless:check failed on ${rel}`;
  }
}

(async () => {
  const payload = await readPayload();
  const { filePath } = extractFileEdit(payload);
  if (!filePath) return allow();

  const rel = relativeToRoot(filePath);
  if (!rel || !LINTED.test(rel)) return allow();

  const finding = spotlessCheck(rel);
  if (!finding) return allow();

  return surfaceToModel(
    `Spotless flagged ${rel} - run ./mvnw spotless:apply from ${APP}/ before moving on, because the ${APP} gate commands run the same check:\n${finding.slice(
      0,
      OUTPUT_LIMIT,
    )}`,
  );
})();
