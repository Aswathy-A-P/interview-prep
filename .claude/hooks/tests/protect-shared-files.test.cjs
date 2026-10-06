'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const { BLOCKED, ALLOWED, createSuite } = require('./_assert.cjs');

const suite = createSuite('protect-shared-files');
const { ok } = suite;

const MANIFEST = '.claude/harness/manifest.json';
const HOOK = '.claude/hooks/protect-shared-files.cjs';
const SHARED_FILE = '.claude/conventions/git-hygiene.md';
const REGISTER = 'CLAUDE.md';
const GENERATED = '.claude/harness/hashes.json';
const OWN_SHARED = '.claude/hooks/_util.cjs';
const OWN_FILE = 'src/app.js';

const MANIFEST_FILES = {
  [REGISTER]: { scope: 'every', match: 'common' },
  [SHARED_FILE]: { scope: 'every', match: 'full' },
  [GENERATED]: { scope: 'every', match: 'generated' },
  [OWN_SHARED]: { scope: 'every', match: 'present' },
  '.claude/harness/install.cjs': { scope: 'source' },
};

const REGISTER_TEXT = [
  '# CLAUDE.md',
  '',
  'The common section, shared everywhere.',
  '',
  '## Project-specific',
  '',
  '- **Default Branch**: main',
  '',
].join('\n');

function write(root, rel, text) {
  const target = path.join(root, rel);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, text);
}

function copyInto(root, rel, from) {
  const target = path.join(root, rel);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.copyFileSync(from, target);
}

function installHarness(root) {
  copyInto(root, '.claude/harness/shared-files.cjs', path.resolve(__dirname, '..', '..', 'harness', 'shared-files.cjs'));
  copyInto(root, OWN_SHARED, path.resolve(__dirname, '..', '_util.cjs'));
  copyInto(root, HOOK, path.resolve(__dirname, '..', 'protect-shared-files.cjs'));
}

function buildRepo(root) {
  fs.mkdirSync(root, { recursive: true });
  installHarness(root);
  write(root, MANIFEST, JSON.stringify({ files: MANIFEST_FILES, dropped: [] }, null, 2));
  write(root, REGISTER, REGISTER_TEXT);
  write(root, SHARED_FILE, '# Git hygiene\n');
  write(root, GENERATED, '{}\n');
  write(root, OWN_FILE, 'export const x = 1;\n');
  return root;
}

function run(root, payload) {
  return spawnSync(process.execPath, [path.join(root, HOOK)], {
    input: JSON.stringify({ cwd: root, ...payload }),
    encoding: 'utf8',
    env: { ...process.env, CLAUDE_PROJECT_DIR: root },
    timeout: 10000,
  }).status;
}

function writeTool(root, rel, content) {
  return run(root, { tool_name: 'Write', tool_input: { file_path: path.join(root, rel), content } });
}

function editTool(root, rel, oldString, newString, replaceAll) {
  return run(root, {
    tool_name: 'Edit',
    tool_input: {
      file_path: path.join(root, rel),
      old_string: oldString,
      new_string: newString,
      replace_all: Boolean(replaceAll),
    },
  });
}

function main(sandbox) {
  const repo = buildRepo(path.join(sandbox, 'installed'));

  ok(editTool(repo, SHARED_FILE, '# Git hygiene', '# Git rules') === BLOCKED, 'an edit to a shared file is blocked');
  ok(writeTool(repo, SHARED_FILE, '# Git rules\n') === BLOCKED, 'a rewrite of a shared file is blocked');
  ok(writeTool(repo, GENERATED, '{"files":{}}\n') === BLOCKED, 'a hand edit of a generated shared file is blocked');
  ok(
    editTool(repo, REGISTER, 'The common section, shared everywhere.', 'Something else.') === BLOCKED,
    "an edit above the register's project heading is blocked",
  );
  ok(
    writeTool(repo, REGISTER, REGISTER_TEXT.replace('The common section', 'A rewritten section')) === BLOCKED,
    "a rewrite that changes the register's common section is blocked",
  );

  ok(
    editTool(repo, REGISTER, '- **Default Branch**: main', '- **Default Branch**: develop') === ALLOWED,
    "an edit inside the register's project section is allowed",
  );
  ok(
    writeTool(repo, REGISTER, REGISTER_TEXT.replace('main', 'develop')) === ALLOWED,
    "a rewrite that keeps the register's common section is allowed",
  );
  ok(editTool(repo, OWN_FILE, 'export const x = 1;', 'export const x = 2;') === ALLOWED, "a repo's own file is allowed");
  ok(editTool(repo, OWN_SHARED, 'use strict', 'use strict') === ALLOWED, 'a file the repo owns its copy of is allowed');
  ok(
    writeTool(repo, '.claude/hooks/python-lint.cjs', 'process.exit(0);\n') === ALLOWED,
    'a file the manifest does not classify is allowed',
  );
  ok(
    run(repo, { tool_name: 'Write', tool_input: { file_path: path.join(sandbox, 'outside.md'), content: 'x' } }) ===
      ALLOWED,
    'a file outside the repo is allowed',
  );

  const source = buildRepo(path.join(sandbox, 'source'));
  write(source, 'harnessed-repos.json', '[]\n');
  write(source, '.claude/harness/install.cjs', 'process.exit(0);\n');
  ok(editTool(source, SHARED_FILE, '# Git hygiene', '# Git rules') === ALLOWED, 'the shared set itself is exempt');

  const bare = path.join(sandbox, 'bare');
  fs.mkdirSync(bare, { recursive: true });
  installHarness(bare);
  write(bare, OWN_FILE, 'export const x = 1;\n');
  ok(
    editTool(bare, OWN_FILE, 'export const x = 1;', 'export const x = 2;') === ALLOWED,
    'a repo with no manifest is allowed',
  );
}

const sandbox = fs.mkdtempSync(path.join(os.tmpdir(), 'protect-shared-files-'));
try {
  main(sandbox);
} finally {
  fs.rmSync(sandbox, { recursive: true, force: true });
}

suite.done();
