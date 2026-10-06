#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const SUITE_SUFFIX = '.test.cjs';

const suites = fs.readdirSync(__dirname).filter((f) => f.endsWith(SUITE_SUFFIX)).sort();

let failures = 0;
for (const suite of suites) {
  const result = spawnSync(process.execPath, [path.join(__dirname, suite)], { encoding: 'utf8' });
  process.stdout.write(result.stdout || '');
  if (result.stderr) process.stderr.write(result.stderr);
  if (result.status !== 0) failures += 1;
}

console.log(`\n${suites.length} suites run, ${failures} failed`);
process.exit(failures === 0 ? 0 : 1);
