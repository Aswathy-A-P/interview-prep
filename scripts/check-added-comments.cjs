#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const {
  addedCommentLines,
  isGated,
  GATED_PATHSPECS,
  GATED_LABEL,
} = require('../.claude/hooks/_comment-lexers.cjs');

function git(args) {
  const r = spawnSync('git', args, { encoding: 'utf8' });
  if (r.status !== 0) throw new Error(`git ${args.join(' ')} failed: ${r.stderr}`);
  return r.stdout;
}

function mergeBase(baseRef) {
  const r = spawnSync('git', ['merge-base', baseRef, 'HEAD'], { encoding: 'utf8' });
  const sha = (r.stdout || '').trim();
  if (r.status !== 0 || !sha) {
    throw new Error(
      `no merge-base between ${baseRef} and HEAD (${r.stderr.trim() || 'no common ancestor'}); ` +
        `fetch the full history of both before running this check`
    );
  }
  return sha;
}

function changedGatedFiles(baseCommit) {
  return git(['diff', '--name-status', '-M', baseCommit, '--', ...GATED_PATHSPECS])
    .split('\n')
    .filter(Boolean)
    .map((row) => row.split('\t'))
    .filter(([status]) => status !== 'D')
    .map(([status, a, b]) =>
      status.startsWith('R') || status.startsWith('C') ? { basePath: a, path: b } : { basePath: a, path: a }
    )
    .filter(({ path: file }) => isGated(file));
}

function baseText(baseCommit, basePath) {
  const r = spawnSync('git', ['show', `${baseCommit}:${basePath}`], { encoding: 'utf8' });
  return r.status === 0 ? r.stdout : '';
}

function violations(baseRef) {
  const baseCommit = mergeBase(baseRef);
  const found = [];
  for (const { basePath, path: file } of changedGatedFiles(baseCommit)) {
    const current = fs.readFileSync(path.resolve(file), 'utf8');
    for (const l of addedCommentLines(baseText(baseCommit, basePath), current, file)) {
      found.push(`${file}:${l.line}: ${l.text.trim()}`);
    }
  }
  return found;
}

if (require.main === module) {
  const baseRef = process.argv[2];
  if (!baseRef) {
    process.stderr.write('usage: node scripts/check-added-comments.cjs <base-ref>\n');
    process.exit(2);
  }
  let found;
  try {
    found = violations(baseRef);
  } catch (e) {
    process.stderr.write(`${e.message}\n`);
    process.exit(2);
  }
  if (found.length > 0) {
    process.stdout.write(found.join('\n') + '\n');
    process.stdout.write(
      `\n${found.length} comment line(s) added under ${GATED_LABEL}; .claude/conventions/comment-conventions.md allows none.\n`
    );
    process.exit(1);
  }
  process.stdout.write(`No comment lines added under ${GATED_LABEL}.\n`);
}

module.exports = { mergeBase, changedGatedFiles, violations };
