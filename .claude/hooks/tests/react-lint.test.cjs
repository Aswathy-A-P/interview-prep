'use strict';

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const REPO = path.resolve(__dirname, '..', '..', '..');
const APP_DIR = path.join(REPO, 'frontend');
const HOOK = path.join(__dirname, '..', 'react-lint.cjs');

let passed = 0,
  failed = 0,
  skipped = 0;
function ok(cond, msg) {
  if (cond) passed++;
  else {
    failed++;
    console.error(`  FAIL: ${msg}`);
  }
}
function skip(msg) {
  skipped++;
  console.log(`  SKIP: ${msg}`);
}

function eslintInstalled() {
  const dir = path.join(APP_DIR, 'node_modules', '.bin');
  return ['eslint', 'eslint.cmd'].some((b) => fs.existsSync(path.join(dir, b)));
}

function edit(relPath, content) {
  const filePath = relPath ? path.join(REPO, relPath) : '';
  const payload = { tool_name: 'Edit', tool_input: { file_path: filePath, new_string: content || '' } };
  return spawnSync(process.execPath, [HOOK], {
    input: JSON.stringify(payload),
    encoding: 'utf8',
    cwd: REPO,
    env: { ...process.env, CLAUDE_PROJECT_DIR: REPO },
  }).status;
}

function withFixture(relPath, content, fn) {
  const abs = path.join(REPO, relPath);
  fs.mkdirSync(path.dirname(abs), { recursive: true });
  fs.writeFileSync(abs, content);
  try {
    fn();
  } finally {
    fs.rmSync(abs, { force: true });
  }
}

ok(edit('', '') === 0, 'no file path is allowed');
ok(edit('README.md', '# practice') === 0, 'root README is allowed');
ok(edit('frontend/vite.config.js', 'export default {}') === 0, 'a frontend js file outside src is allowed');
ok(edit('src/App.jsx', 'export const App = () => null;') === 0, 'a src folder outside frontend/ is not linted');
ok(edit('backend/src/main/java/A.java', 'class A {}') === 0, 'a backend file is not linted');
ok(edit('frontend/src/index.css', 'body {}') === 0, 'a stylesheet is not linted');

if (eslintInstalled()) {
  const clean = 'export const sum = (a, b) => a + b;\n';
  withFixture('frontend/src/_hook_lint_fixture_clean.jsx', clean, () => {
    ok(edit('frontend/src/_hook_lint_fixture_clean.jsx', clean) === 0, 'a clean frontend/src file is allowed');
  });
  const bad = 'export const X = () => { const unused = 1; return null; };\n';
  withFixture('frontend/src/_hook_lint_fixture_bad.jsx', bad, () => {
    ok(edit('frontend/src/_hook_lint_fixture_bad.jsx', bad) === 2, 'a frontend/src file with an unused var is surfaced');
  });
} else {
  ok(edit('frontend/src/_fixture.jsx', 'export const X = () => null;') === 0, 'a frontend/src file is allowed when eslint is not installed');
  skip('frontend/node_modules/.bin/eslint absent - eslint lint cases skipped');
}

console.log(`\nreact-lint: ${passed} passed, ${failed} failed, ${skipped} skipped`);
process.exit(failed === 0 ? 0 : 1);
