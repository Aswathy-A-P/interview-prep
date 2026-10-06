'use strict';

const path = require('path');
const { spawnSync } = require('child_process');

const BLOCKED = 2;
const ALLOWED = 0;
const HOOK_TIMEOUT_MS = 10000;

function hookPath(name) {
  return path.resolve(__dirname, '..', name);
}

function runHook(name, payload, env) {
  return spawnSync(process.execPath, [hookPath(name)], {
    input: JSON.stringify(payload),
    encoding: 'utf8',
    env: { ...process.env, ...env },
    timeout: HOOK_TIMEOUT_MS,
    killSignal: 'SIGKILL',
  }).status;
}

function createSuite(name) {
  let passed = 0;
  let failed = 0;
  return {
    ok(condition, description) {
      if (condition) passed += 1;
      else {
        failed += 1;
        console.error(`  FAIL: ${description}`);
      }
    },
    fail(description) {
      failed += 1;
      console.error(`  FAIL: ${description}`);
    },
    done() {
      console.log(`\n${name}: ${passed} passed, ${failed} failed`);
      process.exit(failed === 0 ? 0 : 1);
    },
  };
}

module.exports = { BLOCKED, ALLOWED, runHook, createSuite };
