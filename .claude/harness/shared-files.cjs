'use strict';

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const MANIFEST = '.claude/harness/manifest.json';
const HASHES = '.claude/harness/hashes.json';
const REGISTER = 'CLAUDE.md';
const SIBLINGS = '.claude/conventions/sibling-repos.md';
const UTIL = '.claude/hooks/_util.cjs';
const SETTINGS = '.claude/settings.json';
const HARNESSED = 'harnessed-repos.json';
const INSTALLER = '.claude/harness/install.cjs';
const CI_APPROVES_KEY = '**CI Approves**';
const STACK_TOKEN = '<STACK>';
const STACK_NAME = 'STACK';

const PROJECT_HEADING = /^[ \t]*#{1,2} Project-specific[ \t]*$/;
const PLACEHOLDER = /<[^<>\n]{1,160}>/;
const FILLABLE_LINE = /^(?:[-*][ \t]+\*\*[^*]+\*\*:|\|)/;
const PLACEHOLDER_BULLET = /^[-*][ \t]+<[^<>\n]{1,160}>$/;
const REGISTER_KEY = /^\s*[-*]?\s*\*\*([^*]+)\*\*:/;
const VALUE_BULLET = /^[ \t]*[-*][ \t]*\*\*[^*]+\*\*:/;
const VALUE_LINE = /^[ \t]*[-*]?[ \t]*\*\*([^*]+)\*\*:[ \t]*\S/gm;
const HOOK_PATH = /\.claude\/[\w./-]*\.c?js(?![\w.])/g;

function isFilled(value) {
  return Boolean(value) && !value.startsWith('<');
}

function readFile(root, rel) {
  return fs.readFileSync(path.join(root, rel), 'utf8');
}

function exists(root, rel) {
  return fs.existsSync(path.join(root, rel));
}

function presentAsNamed(root, rel) {
  const target = path.join(root, rel);
  if (!fs.existsSync(target)) return false;
  try {
    return fs.readdirSync(path.dirname(target)).includes(path.basename(rel));
  } catch {
    return false;
  }
}

function isSourceRepo(root) {
  return exists(root, HARNESSED) && exists(root, INSTALLER);
}

function sha256(text) {
  return crypto.createHash('sha256').update(text, 'utf8').digest('hex');
}

function splitProjectSection(text) {
  const lines = text.split('\n');
  let marker = -1;
  for (let i = 0; i < lines.length; i += 1) {
    if (PROJECT_HEADING.test(lines[i])) marker = i;
  }
  if (marker === -1) return null;
  return {
    marker: marker + 1,
    common: lines.slice(0, marker).join('\n'),
    project: lines.slice(marker + 1).join('\n'),
  };
}

function hashOf(text, match) {
  if (match === 'full') return sha256(text);
  if (match === 'common') {
    const split = splitProjectSection(text);
    if (!split) return null;
    return sha256(split.common);
  }
  return null;
}

function loadManifest(root) {
  const manifest = JSON.parse(readFile(root, MANIFEST));
  const entries = Object.keys(manifest.files).map((rel) => ({ path: rel, ...manifest.files[rel] }));
  return { ...manifest, entries };
}

function loadHashes(root) {
  return JSON.parse(readFile(root, HASHES));
}

function trackedFiles(root) {
  const res = spawnSync('git', ['-C', root, 'ls-files'], { encoding: 'utf8' });
  if (res.status !== 0) throw new Error(`git ls-files failed in ${root}: ${res.stderr}`);
  return res.stdout.split('\n').filter(Boolean);
}

function unfilledLines(text) {
  const split = splitProjectSection(text);
  if (!split) return [];
  return split.project
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => (FILLABLE_LINE.test(line) && PLACEHOLDER.test(line)) || PLACEHOLDER_BULLET.test(line));
}

function valueOn(line, key) {
  const at = line.indexOf(`**${key}**:`);
  if (at === -1) return null;
  return line.slice(at + key.length + 5).trim();
}

function ciApprovesAt(text) {
  const split = splitProjectSection(text);
  if (!split) return -1;
  const lines = text.split('\n');
  for (let i = split.marker; i < lines.length; i += 1) {
    if (lines[i].includes(CI_APPROVES_KEY)) return i;
  }
  return -1;
}

function runsCiReview(text) {
  return ciApprovesAt(text) !== -1;
}

function withCiApproves(text, runs) {
  const lines = text.split('\n');
  const at = ciApprovesAt(text);
  const approves = `- ${CI_APPROVES_KEY}: yes`;
  if (at !== -1) {
    if (!runs) lines.splice(at, 1);
    else if (isFilled(valueOn(lines[at], CI_APPROVES_KEY.slice(2, -2)))) return text;
    else lines[at] = approves;
    return lines.join('\n');
  }
  if (!runs) return text;
  const split = splitProjectSection(text);
  if (!split) return text;
  let last = -1;
  for (let i = split.marker; i < lines.length; i += 1) {
    if (VALUE_BULLET.test(lines[i])) last = i;
  }
  if (last === -1) return text;
  lines.splice(last + 1, 0, approves);
  return lines.join('\n');
}

function namesRepo(text, name) {
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`(^|[^A-Za-z0-9_-])${escaped}($|[^A-Za-z0-9_-])`).test(text);
}

function caseCollision(rel, paths) {
  const lower = rel.toLowerCase();
  return paths.find((candidate) => candidate !== rel && candidate.toLowerCase() === lower) || null;
}

function registerKeys(text) {
  const split = splitProjectSection(text);
  if (!split) return [];
  const keys = [];
  for (const line of split.project.split('\n')) {
    const found = line.match(REGISTER_KEY);
    if (found) keys.push(found[1].trim());
  }
  return keys;
}

function valueKeysIn(text) {
  const keys = new Set();
  let found = VALUE_LINE.exec(text);
  while (found) {
    keys.add(found[1].trim());
    found = VALUE_LINE.exec(text);
  }
  VALUE_LINE.lastIndex = 0;
  return keys;
}

function siblingRepos(text) {
  const split = splitProjectSection(text);
  if (!split) return [];
  const names = new Set();
  for (const line of split.project.split('\n')) {
    if (!line.trim().startsWith('|')) continue;
    const cell = line.split('|')[1];
    if (!cell) continue;
    const name = cell.trim().replace(/`/g, '');
    if (name.includes('<') || !name.includes('/') || name.startsWith('-')) continue;
    names.add(name.split('/').pop());
  }
  return [...names];
}

function frontmatter(text) {
  const lines = text.split('\n');
  if (lines[0] !== '---') throw new Error('frontmatter does not start on line 1');
  const end = lines.indexOf('---', 1);
  if (end === -1) throw new Error('frontmatter is not closed');
  const fields = {};
  let key = null;
  for (const line of lines.slice(1, end)) {
    const start = line.match(/^([A-Za-z][\w-]*):(.*)$/);
    if (start) {
      key = start[1];
      fields[key] = start[2].trim();
    } else if (key && line.startsWith('  ')) {
      fields[key] = `${fields[key]} ${line.trim()}`.trim();
    } else if (line.trim()) {
      throw new Error(`cannot parse frontmatter line: ${line}`);
    }
  }
  return fields;
}

function utilExports(text) {
  const block = text.match(/module\.exports\s*=\s*{([^}]*)}/);
  if (!block) return [];
  return block[1]
    .split(',')
    .map((entry) => entry.split(':')[0].trim())
    .filter(Boolean);
}

function settingsHookCommands(json) {
  const commands = [];
  for (const event of Object.keys(json.hooks || {})) {
    for (const group of json.hooks[event] || []) {
      for (const hook of group.hooks || []) {
        if (hook.command) commands.push({ event, matcher: group.matcher || '', command: hook.command });
      }
    }
  }
  return commands;
}

function settingsHookPaths(json) {
  const found = [];
  for (const entry of settingsHookCommands(json)) {
    let match = HOOK_PATH.exec(entry.command);
    while (match) {
      found.push({ ...entry, path: match[0] });
      match = HOOK_PATH.exec(entry.command);
    }
    HOOK_PATH.lastIndex = 0;
  }
  return found;
}

function stackFrom(skillPath) {
  const folder = path.basename(path.dirname(skillPath));
  return folder.replace(/-conventions$/, '');
}

function displayName(stack) {
  return stack
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

module.exports = {
  MANIFEST,
  HASHES,
  REGISTER,
  SIBLINGS,
  UTIL,
  SETTINGS,
  HARNESSED,
  INSTALLER,
  CI_APPROVES_KEY,
  STACK_TOKEN,
  STACK_NAME,
  isFilled,
  valueOn,
  ciApprovesAt,
  runsCiReview,
  withCiApproves,
  namesRepo,
  caseCollision,
  readFile,
  exists,
  presentAsNamed,
  isSourceRepo,
  sha256,
  splitProjectSection,
  hashOf,
  loadManifest,
  loadHashes,
  trackedFiles,
  unfilledLines,
  registerKeys,
  valueKeysIn,
  siblingRepos,
  frontmatter,
  utilExports,
  settingsHookCommands,
  settingsHookPaths,
  stackFrom,
  displayName,
};
