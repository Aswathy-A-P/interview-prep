#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const shared = require('./shared-files.cjs');

const SKILLS = '.claude/skills';
const AGENTS = '.claude/agents';
const HOOKS = '.claude/hooks';
const CLAUDE_DIR = '.claude/';
const SKILL_FILE = 'SKILL.md';
const CONVENTIONS_SUFFIX = '-conventions';
const REVIEWER_AGENT = /^senior-.+-engineer\.md$/;
const CONVENTIONS_KEY = 'Conventions Skills';
const AGENTS_KEY = 'Reviewer Agents';
const FOLDED = '>-';
const NULL_VALUE = 'NULL';

const SHARED_HOOKS = [
  { matcher: 'Write|Edit|NotebookEdit', hook: 'block-secrets.cjs' },
  { matcher: 'Write|Edit|NotebookEdit', hook: 'protect-shared-files.cjs' },
  { matcher: 'Bash', hook: 'block-unsafe-bash.cjs' },
  { matcher: 'Bash', hook: 'protect-branches.cjs' },
];

function parseArgs(argv) {
  let repo = path.resolve(__dirname, '..', '..');
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === '--repo') {
      repo = path.resolve(argv[i + 1] || '');
      i += 1;
    } else {
      process.stderr.write(`unknown argument: ${argv[i]}\nusage: verify.cjs [--repo <dir>]\n`);
      process.exit(2);
    }
  }
  return { repo };
}

const { repo: ROOT } = parseArgs(process.argv.slice(2));

if (!shared.exists(ROOT, shared.MANIFEST)) {
  process.stderr.write(`${ROOT} carries no ${shared.MANIFEST}, so the harness is not installed there\n`);
  process.exit(2);
}

const manifest = shared.loadManifest(ROOT);
const isSource = shared.isSourceRepo(ROOT);
const hashes = shared.exists(ROOT, shared.HASHES) ? shared.loadHashes(ROOT) : null;
const register = shared.exists(ROOT, shared.REGISTER) ? shared.readFile(ROOT, shared.REGISTER) : '';
const ciReview = shared.runsCiReview(register);

let failed = 0;
let ran = 0;

function check(name, fn) {
  ran += 1;
  let problems;
  try {
    problems = fn() || [];
  } catch (err) {
    problems = [err.message];
  }
  if (!problems.length) {
    process.stdout.write(`OK    ${name}\n`);
    return;
  }
  failed += 1;
  process.stdout.write(`FAIL  ${name}\n`);
  for (const problem of problems) process.stdout.write(`        ${problem}\n`);
}

function registerValue(key) {
  const line = register.split('\n').find((candidate) => candidate.includes(`**${key}**:`));
  if (!line) return null;
  return line.slice(line.indexOf(`**${key}**:`) + key.length + 5).trim();
}

function registerList(key) {
  const value = registerValue(key);
  if (!value || value === NULL_VALUE || value.startsWith('<')) return [];
  return value
    .split(',')
    .map((entry) => entry.trim().replace(/[`.]/g, ''))
    .filter(Boolean);
}

function requiredIn(entry) {
  if (entry.scope === 'every') return true;
  if (entry.scope === 'ci-review') return isSource || ciReview;
  if (entry.scope === 'template' || entry.scope === 'source') return isSource;
  return shared.exists(ROOT, entry.path);
}

function skillFolders() {
  if (!shared.exists(ROOT, SKILLS)) return [];
  return fs
    .readdirSync(path.join(ROOT, SKILLS))
    .filter((folder) => fs.existsSync(path.join(ROOT, SKILLS, folder, SKILL_FILE)));
}

function stackPairFiles() {
  const files = [];
  for (const folder of skillFolders()) {
    if (folder.endsWith(CONVENTIONS_SUFFIX)) files.push(`${SKILLS}/${folder}/${SKILL_FILE}`);
  }
  if (shared.exists(ROOT, AGENTS)) {
    for (const file of fs.readdirSync(path.join(ROOT, AGENTS))) {
      if (REVIEWER_AGENT.test(file)) files.push(`${AGENTS}/${file}`);
    }
  }
  return files;
}

function pairTemplateLines() {
  const lines = new Set();
  for (const entry of manifest.entries) {
    if (entry.scope !== 'stack' && entry.scope !== 'template') continue;
    for (const line of (hashes.unfilled || {})[entry.path] || []) lines.add(line);
  }
  return lines;
}

function installedFiles() {
  return manifest.entries
    .filter((entry) => entry.scope !== 'source')
    .map((entry) => entry.path)
    .filter((rel) => shared.exists(ROOT, rel));
}

function governedFiles() {
  const files = new Set(installedFiles());
  for (const rel of shared.trackedFiles(ROOT)) {
    if (rel.startsWith(CLAUDE_DIR) && shared.exists(ROOT, rel)) files.add(rel);
  }
  return [...files].sort();
}

function settings() {
  if (!shared.exists(ROOT, shared.SETTINGS)) return null;
  return JSON.parse(shared.readFile(ROOT, shared.SETTINGS));
}

check('every shared file is present and matches the shared set', () => {
  const problems = [];
  for (const entry of manifest.entries) {
    const here = shared.exists(ROOT, entry.path);
    if (!requiredIn(entry)) {
      if (here && (entry.scope === 'ci-review' || entry.scope === 'template')) {
        problems.push(`${entry.path} is installed but this repo does not carry it, so delete it`);
      }
      continue;
    }
    if (!here) {
      problems.push(`${entry.path} is missing`);
      continue;
    }
    if (entry.match !== 'full' && entry.match !== 'common') continue;
    if (isSource) {
      const recorded = hashes && hashes.files ? hashes.files[entry.path] : null;
      const actual = shared.hashOf(shared.readFile(ROOT, entry.path), entry.match);
      if (recorded !== actual) {
        problems.push(`${entry.path} is not the file ${shared.HASHES} records, so run update-manifest.cjs`);
      }
      continue;
    }
    if (!hashes || !hashes.files || !hashes.files[entry.path]) {
      problems.push(`${entry.path} has no shared hash recorded, so reinstall the harness`);
      continue;
    }
    const actual = shared.hashOf(shared.readFile(ROOT, entry.path), entry.match);
    if (actual !== hashes.files[entry.path]) {
      const scope = entry.match === 'common' ? 'common section' : 'file';
      problems.push(`${entry.path} differs from the shared version in its ${scope}`);
    }
  }
  return problems;
});

check('no file this harness dropped is still installed', () => {
  const installed = manifest.entries.filter((entry) => entry.scope !== 'source').map((entry) => entry.path);
  return manifest.dropped
    .filter((rel) => shared.presentAsNamed(ROOT, rel))
    .map((rel) => {
      const collides = shared.caseCollision(rel, installed);
      return collides && !shared.presentAsNamed(ROOT, collides)
        ? `${rel} is this harness's ${collides} under the old spelling, so rename it rather than deleting it`
        : `${rel} is not part of this harness, so delete it with its test and its settings entry`;
    });
});

check('every hook is a .cjs file', () => {
  if (!shared.exists(ROOT, HOOKS)) return [];
  const problems = [];
  for (const dir of [HOOKS, `${HOOKS}/tests`]) {
    if (!shared.exists(ROOT, dir)) continue;
    for (const file of fs.readdirSync(path.join(ROOT, dir))) {
      if (file.endsWith('.js')) problems.push(`${dir}/${file} must be renamed .cjs, with its settings entry`);
    }
  }
  return problems;
});

check('every skill frontmatter parses', () => {
  const problems = [];
  for (const folder of skillFolders()) {
    const rel = `${SKILLS}/${folder}/${SKILL_FILE}`;
    const text = shared.readFile(ROOT, rel);
    let fields;
    try {
      fields = shared.frontmatter(text);
    } catch (err) {
      problems.push(`${rel}: ${err.message}`);
      continue;
    }
    if (fields.name !== folder) problems.push(`${rel}: name is "${fields.name}", not the folder name "${folder}"`);
    if (!fields.description) problems.push(`${rel}: description is empty`);
    const declared = text.split('\n').find((line) => line.startsWith('description:'));
    if (declared && declared.trim() !== `description: ${FOLDED}`) {
      problems.push(`${rel}: description must be a ${FOLDED} folded block so colons are safe`);
    }
  }
  return problems;
});

check('no project section or stack pair is left unfilled', () => {
  if (isSource) return [];
  if (!hashes || !hashes.unfilled) return [`${shared.HASHES} records no template lines, so reinstall the harness`];
  const problems = [];
  for (const entry of manifest.entries) {
    if (entry.match !== 'common' || !shared.exists(ROOT, entry.path)) continue;
    const template = hashes && hashes.unfilled ? hashes.unfilled[entry.path] || [] : [];
    for (const line of shared.unfilledLines(shared.readFile(ROOT, entry.path))) {
      if (template.includes(line)) problems.push(`${entry.path}: ${line}`);
    }
  }
  const pairLines = pairTemplateLines();
  if (!pairLines.size) problems.push(`${shared.HASHES} records no stack pair template lines, so reinstall the harness`);
  for (const rel of stackPairFiles()) {
    const text = shared.readFile(ROOT, rel);
    if (text.includes(shared.STACK_TOKEN) || rel.includes(shared.STACK_NAME)) {
      problems.push(`${rel} still names the placeholder stack, so rename and fill the pair`);
      continue;
    }
    const split = shared.splitProjectSection(text);
    if (!split) {
      problems.push(`${rel} carries no "Project-specific" marker, so it states no scope or rules of its own`);
      continue;
    }
    split.project.split('\n').forEach((line, index) => {
      if (pairLines.has(line.trim())) problems.push(`${rel}:${split.marker + index + 1}: ${line.trim()}`);
    });
  }
  return problems;
});

check('each repository value is registered in one place', () => {
  if (!register) return [`${shared.REGISTER} is missing`];
  const keys = shared.registerKeys(register);
  if (!keys.length) return [`${shared.REGISTER} has no **Key**: values in its project section`];
  const problems = [];
  for (const rel of governedFiles()) {
    if (rel === shared.REGISTER || rel === shared.SETTINGS) continue;
    const found = shared.valueKeysIn(shared.readFile(ROOT, rel));
    for (const key of keys) {
      if (found.has(key)) problems.push(`${rel} restates **${key}**, which only ${shared.REGISTER} may hold`);
    }
  }
  return problems;
});

check('sibling repositories are named in one file', () => {
  if (isSource || !shared.exists(ROOT, shared.SIBLINGS)) return [];
  const names = shared.siblingRepos(shared.readFile(ROOT, shared.SIBLINGS));
  if (!names.length) return [];
  const problems = [];
  for (const rel of governedFiles()) {
    if (rel === shared.SIBLINGS || rel === shared.SETTINGS) continue;
    const text = shared.readFile(ROOT, rel);
    for (const name of names) {
      if (shared.namesRepo(text, name)) problems.push(`${rel} names the sibling ${name}, which only ${shared.SIBLINGS} may do`);
    }
  }
  return problems;
});

check('the sibling directory grants mirror the sibling table', () => {
  if (isSource || !shared.exists(ROOT, shared.SIBLINGS)) return [];
  const json = settings();
  if (!json) return [`${shared.SETTINGS} is missing`];
  const granted = (json.permissions || {}).additionalDirectories || [];
  const split = shared.splitProjectSection(shared.readFile(ROOT, shared.SIBLINGS));
  const paths = [];
  for (const line of (split ? split.project : '').split('\n')) {
    if (!line.trim().startsWith('|')) continue;
    const cell = (line.split('|')[2] || '').trim().replace(/`/g, '');
    if (cell.startsWith('..') && !cell.includes('<')) paths.push(cell);
  }
  const problems = [];
  for (const local of paths) {
    if (!granted.includes(local)) problems.push(`${shared.SETTINGS} does not grant ${local}, which the sibling table lists`);
  }
  for (const local of granted) {
    if (!paths.includes(local)) problems.push(`${shared.SETTINGS} grants ${local}, which the sibling table does not list`);
  }
  return problems;
});

check('the shared guardrail hooks are registered', () => {
  const json = settings();
  if (!json) return [`${shared.SETTINGS} is missing`];
  const commands = shared.settingsHookCommands(json);
  const problems = [];
  for (const entry of SHARED_HOOKS) {
    const found = commands.find(
      (candidate) =>
        candidate.event === 'PreToolUse' && candidate.matcher === entry.matcher && candidate.command.includes(entry.hook),
    );
    if (!found) problems.push(`${entry.hook} is not registered on PreToolUse for ${entry.matcher}`);
  }
  return problems;
});

check('every stack the register names carries a skill, an agent and a lint hook', () => {
  if (isSource) return [];
  const declared = registerValue(CONVENTIONS_KEY);
  if (declared === null) return [`${shared.REGISTER} names no **${CONVENTIONS_KEY}**`];
  if (declared.startsWith('<')) return [];
  const skills = registerList(CONVENTIONS_KEY);
  const agents = registerList(AGENTS_KEY);
  const json = settings();
  const commands = json ? shared.settingsHookCommands(json) : [];
  const problems = [];
  for (const skill of skills) {
    if (!shared.exists(ROOT, `${SKILLS}/${skill}/${SKILL_FILE}`)) {
      problems.push(`${shared.REGISTER} names the skill ${skill}, which is not installed`);
      continue;
    }
    const stack = shared.stackFrom(`${SKILLS}/${skill}/${SKILL_FILE}`);
    const lint = `${HOOKS}/${stack}-lint.cjs`;
    if (!shared.exists(ROOT, lint)) {
      problems.push(`${lint} is missing, and ${skill} needs a lint hook`);
    } else if (!commands.some((candidate) => candidate.event === 'PostToolUse' && candidate.command.includes(`${stack}-lint.cjs`))) {
      problems.push(`${lint} is not registered on PostToolUse in ${shared.SETTINGS}`);
    }
  }
  for (const agent of agents) {
    if (!shared.exists(ROOT, `${AGENTS}/${agent}.md`)) {
      problems.push(`${shared.REGISTER} names the agent ${agent}, which is not installed`);
    }
  }
  if (agents.length !== skills.length) {
    problems.push(`${shared.REGISTER} names ${skills.length} conventions skills and ${agents.length} reviewer agents`);
  }
  return problems;
});

check('every hook the settings register names is installed', () => {
  const json = settings();
  if (!json) return [`${shared.SETTINGS} is missing`];
  const absent = new Set();
  for (const entry of shared.settingsHookPaths(json)) {
    if (!shared.exists(ROOT, entry.path)) absent.add(entry.path);
  }
  return [...absent].map(
    (rel) => `${shared.SETTINGS} registers ${rel}, which is not installed, so remove that hook entry`,
  );
});

check('every tracked file in the shared set is classified', () => {
  if (!isSource) return [];
  const classified = new Set(manifest.entries.map((entry) => entry.path));
  return shared
    .trackedFiles(ROOT)
    .filter((rel) => !classified.has(rel))
    .map((rel) => `${shared.MANIFEST} classifies no scope for ${rel}, so add it there`);
});

check('the hook helper exports everything the shared copy does', () => {
  if (!shared.exists(ROOT, shared.UTIL)) return [`${shared.UTIL} is missing, which disarms every guardrail hook`];
  if (!hashes || !hashes.utilExports) return [`${shared.HASHES} records no helper exports, so reinstall the harness`];
  const here = shared.utilExports(shared.readFile(ROOT, shared.UTIL));
  return hashes.utilExports
    .filter((name) => !here.includes(name))
    .map((name) => `${shared.UTIL} does not export ${name}, which the shared hooks import`);
});

process.stdout.write(`\n${ran} checks run, ${failed} failed\n`);
process.exit(failed === 0 ? 0 : 1);
