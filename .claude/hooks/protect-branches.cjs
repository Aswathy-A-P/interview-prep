#!/usr/bin/env node
'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');
const {
  readPayload,
  block,
  allow,
  unquoted,
  withoutHeredocBodies,
  GIT,
} = require('./_util.cjs');

const REGISTER_FILE = 'CLAUDE.md';
const REGISTER_KEY = 'Protected Branches';
const REGISTER_UNFILLED = /^<.*>$/;
const FALLBACK_BRANCHES = ['main', 'master'];

const CONTINUATION = /\\\r?\n/g;
const SEPARATOR = /(&&|\|\||;|\n|&)/;
const SEGMENT_START = String.raw`^[\s(){]*`;
const SUBCOMMAND_END = String.raw`(?![\w-])`;

const UNLESS_ABANDONED = String.raw`(?![^\n;&|]*\s--(?:abort|quit)(?![\w-]))`;
const RESUMABLE = String.raw`am|merge|revert|cherry-pick`;
const GIT_HEAD = new RegExp(SEGMENT_START + String.raw`git(?=\s)`);
const GIT_VALUE_OPTION = new Set([
  '-C',
  '-c',
  '--git-dir',
  '--work-tree',
  '--namespace',
  '--exec-path',
  '--super-prefix',
  '--config-env',
]);
const CHDIR_OPTION = '-C';
const WORK_TREE_OPTION = '--work-tree';
const GIT_DIR_OPTION = '--git-dir';
const DOT_GIT = '.git';
const QUOTED_VALUE = /^(['"])(.*)\1$/;
const BRANCH_OP = new RegExp(SEGMENT_START + GIT + String.raw`(?:switch|checkout)` + SUBCOMMAND_END);
const CREATE_OPTION = /^(?:-[bBcC]|--(?:create|force-create|orphan)(?:=(.*))?)$/;
const WORD = /'([^']*)'|"([^"]*)"|(\S+)/g;
const CLOSERS = { ')': '(', '}': '{' };
const TERMINATOR = ';';
const OPTIONS_END = '--';
const PREVIOUS_BRANCH = '-';
const PREVIOUS_BRANCH_REF = '@{-1}';
const NUMBERED_PREVIOUS_BRANCH = /^@\{-\d+\}$/;
const CD = new RegExp(
  SEGMENT_START + String.raw`(?:cd|pushd)\s+(?:(?:-[LP]|--)\s+)*(?:(['"])(.*?)\1|(\S+))`
);
const HOME_PREFIX = /^(?:~|\$\{HOME\}|\$HOME)(?=\/|$)/;
const ADVANCES_BRANCH = new RegExp(
  GIT + String.raw`commit` + SUBCOMMAND_END + String.raw`|` +
    GIT + String.raw`(?:` + RESUMABLE + String.raw`)` + SUBCOMMAND_END + UNLESS_ABANDONED
);
const REWRITES_HISTORY = [
  new RegExp(GIT + String.raw`rebase` + SUBCOMMAND_END + UNLESS_ABANDONED),
  new RegExp(GIT + String.raw`reset` + SUBCOMMAND_END + String.raw`[^\n;&|]*\s--hard(?![\w-])`),
];
const MUTATES = [ADVANCES_BRANCH, ...REWRITES_HISTORY];

function registerRoot() {
  return process.env.CLAUDE_PROJECT_DIR || path.resolve(__dirname, '..', '..');
}

function protectedBranches() {
  let register;
  try {
    register = fs.readFileSync(path.join(registerRoot(), REGISTER_FILE), 'utf8');
  } catch {
    return new Set(FALLBACK_BRANCHES);
  }
  const entry = register.match(new RegExp(String.raw`^\s*[-*]\s*\*\*${REGISTER_KEY}\*\*:\s*(.+)$`, 'm'));
  const names = entry
    ? entry[1]
        .split(',')
        .map((name) => name.replace(/`/g, '').trim())
        .filter((name) => name && !REGISTER_UNFILLED.test(name))
    : [];
  return new Set(names.length ? names : FALLBACK_BRANCHES);
}

function occurrences(text, char) {
  let count = 0;
  for (const ch of text) if (ch === char) count += 1;
  return count;
}

function named(match) {
  return match[2] != null ? match[2] : match[3];
}

function withoutTrailingClosers(word) {
  let out = word;
  while (out.length) {
    const last = out[out.length - 1];
    if (last === TERMINATOR) {
      out = out.slice(0, -1);
      continue;
    }
    const opener = CLOSERS[last];
    if (!opener || occurrences(out, opener) >= occurrences(out, last)) return out;
    out = out.slice(0, -1);
  }
  return out;
}

function words(text) {
  return Array.from(text.matchAll(WORD), (match) =>
    match[1] != null ? match[1] : match[2] != null ? match[2] : withoutTrailingClosers(match[3])
  );
}

function branchTarget(segment) {
  const head = segment.match(BRANCH_OP);
  if (!head) return null;
  let created = false;
  let name = null;
  for (const word of words(segment.slice(head[0].length))) {
    const create = word.match(CREATE_OPTION);
    if (create) {
      if (create[1] != null) return { name: create[1], created: true };
      created = true;
    } else if (word === OPTIONS_END) return null;
    else if (word === PREVIOUS_BRANCH || !word.startsWith('-')) {
      if (created) return { name: word, created };
      if (name != null) return null;
      name = word;
    }
  }
  return name != null ? { name, created } : null;
}

function expandHome(target) {
  const home = target.match(HOME_PREFIX);
  return home ? path.join(os.homedir(), target.slice(home[0].length)) : target;
}

function into(dir, target) {
  return path.resolve(dir, expandHome(target));
}

function unquotedValue(value) {
  const quoted = value.match(QUOTED_VALUE);
  return quoted ? quoted[2] : value;
}

function gitRelocation(segment) {
  const head = segment.match(GIT_HEAD);
  if (!head) return null;
  const rest = words(segment.slice(head[0].length));
  const relocation = { chdir: null, workTree: null, gitDir: null };
  let index = 0;
  while (index < rest.length && rest[index].startsWith('-')) {
    const word = rest[index];
    const split = word.indexOf('=');
    const name = split === -1 ? word : word.slice(0, split);
    const attached = split === -1 ? null : unquotedValue(word.slice(split + 1));
    const separate = attached === null && GIT_VALUE_OPTION.has(name);
    const value = attached !== null ? attached : separate ? rest[index + 1] : null;
    if (value != null) {
      if (name === CHDIR_OPTION) relocation.chdir = value;
      else if (name === WORK_TREE_OPTION) relocation.workTree = value;
      else if (name === GIT_DIR_OPTION) relocation.gitDir = value;
    }
    index += separate ? 2 : 1;
  }
  return relocation;
}

function worktreeOf(gitDir) {
  return path.basename(gitDir) === DOT_GIT ? path.dirname(gitDir) : gitDir;
}

function gitTarget(dir, segment) {
  const relocation = gitRelocation(segment);
  if (relocation === null) return dir;
  const base = relocation.chdir != null ? into(dir, relocation.chdir) : dir;
  if (relocation.workTree != null) return into(base, relocation.workTree);
  if (relocation.gitDir != null) return worktreeOf(into(base, relocation.gitDir));
  return base;
}

function landings(cmd, baseDir) {
  let dir = baseDir;
  let createdBranch = null;
  let switchedBranch = null;
  let branchDir = null;
  const enclosing = [];
  const found = [];
  const parts = cmd.split(SEPARATOR);
  for (let index = 0; index < parts.length; index += 2) {
    const segment = parts[index];
    const backgrounded = parts[index + 1] === '&';
    const bare = unquoted(segment);
    for (let open = occurrences(bare, '('); open > 0; open -= 1) enclosing.push(dir);
    const cd = segment.match(CD);
    if (cd && !backgrounded) dir = into(dir, named(cd));
    if (MUTATES.some((pattern) => pattern.test(bare))) {
      const target = gitTarget(dir, segment);
      const carried = target === branchDir;
      found.push({
        dir: target,
        createdBranch: carried ? createdBranch : null,
        switchedBranch: carried ? switchedBranch : null,
      });
    }
    const branch = branchTarget(segment);
    if (branch) {
      createdBranch = branch.created ? branch.name : null;
      switchedBranch = branch.created ? null : branch.name;
      branchDir = gitTarget(dir, segment);
    }
    for (let close = occurrences(bare, ')'); close > 0 && enclosing.length; close -= 1) dir = enclosing.pop();
  }
  return found;
}

function branchExists(cwd, branch) {
  try {
    execFileSync('git', ['rev-parse', '--verify', '--quiet', 'refs/heads/' + branch], {
      cwd,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    });
    return true;
  } catch {
    return false;
  }
}

function resolvedBranch(cwd, branch) {
  const ref = branch === PREVIOUS_BRANCH ? PREVIOUS_BRANCH_REF : branch;
  if (!NUMBERED_PREVIOUS_BRANCH.test(ref)) return branch;
  try {
    return execFileSync('git', ['rev-parse', '--abbrev-ref', ref], {
      cwd,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
  } catch {
    return '';
  }
}

function currentBranch(cwd) {
  try {
    return execFileSync('git', ['rev-parse', '--abbrev-ref', 'HEAD'], {
      cwd,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
  } catch {
    return '';
  }
}

function landedBranch(landing, base, guarded) {
  const switched = landing.switchedBranch != null ? resolvedBranch(landing.dir, landing.switchedBranch) : '';
  const switchedTo =
    switched && (guarded.has(switched) || branchExists(landing.dir, switched)) ? switched : null;
  const landed = landing.createdBranch != null ? landing.createdBranch : switchedTo;
  return landed != null ? landed : currentBranch(landing.dir) || currentBranch(base);
}

(async () => {
  const payload = await readPayload();
  if ((payload.tool_name || '') !== 'Bash') return allow();

  const raw = String((payload.tool_input && payload.tool_input.command) || '');
  const cmd = withoutHeredocBodies(raw).replace(CONTINUATION, ' ');
  const base = payload.cwd || process.cwd();
  const found = landings(cmd, base);
  if (found.length === 0) return allow();

  const guarded = protectedBranches();
  for (const landing of found) {
    const branch = landedBranch(landing, base, guarded);
    if (guarded.has(branch)) {
      return block(
        `You are on '${branch}', which CLAUDE.md registers under **${REGISTER_KEY}** — no commits, ` +
          `merges, or history rewrites here. Every change lands via a PR from its own branch. Create ` +
          `one first, named per **Branch Name** in CLAUDE.md, and work there.`
      );
    }
  }
  return allow();
})();
