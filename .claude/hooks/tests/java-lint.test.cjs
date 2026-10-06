'use strict';

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const REPO = path.resolve(__dirname, '..', '..', '..');
const APP_DIR = path.join(REPO, 'backend');
const HOOK = path.join(__dirname, '..', 'java-lint.cjs');
const WRAPPER = path.join(APP_DIR, process.platform === 'win32' ? 'mvnw.cmd' : 'mvnw');

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

function edit(relPath) {
  const filePath = relPath ? path.join(REPO, relPath) : '';
  const payload = { tool_name: 'Edit', tool_input: { file_path: filePath, new_string: '' } };
  return spawnSync(process.execPath, [HOOK], {
    input: JSON.stringify(payload),
    encoding: 'utf8',
    cwd: REPO,
    env: { ...process.env, CLAUDE_PROJECT_DIR: REPO },
  }).status;
}

ok(edit('') === 0, 'no file path is allowed');
ok(edit('README.md') === 0, 'root README is allowed');
ok(edit('backend/pom.xml') === 0, 'the pom is not linted');
ok(edit('backend/src/main/resources/application.yml') === 0, 'a resource file is not linted');
ok(edit('src/main/java/A.java') === 0, 'a java file outside backend/ is not linted');
ok(edit('frontend/src/App.jsx') === 0, 'a frontend file is not linted');
ok(edit(path.join('..', 'elsewhere', 'backend', 'src', 'main', 'java', 'A.java')) === 0, 'a file outside the repo is not linted');

if (fs.existsSync(WRAPPER)) {
  skip('backend/mvnw present - spotless cases need a JDK and network, so they run through the backend gate commands instead');
} else {
  ok(edit('backend/src/main/java/A.java') === 0, 'a backend java file is allowed when the maven wrapper is absent');
  skip('backend/mvnw absent - spotless cases skipped');
}

console.log(`\njava-lint: ${passed} passed, ${failed} failed, ${skipped} skipped`);
process.exit(failed === 0 ? 0 : 1);
