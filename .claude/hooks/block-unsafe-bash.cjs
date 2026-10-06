#!/usr/bin/env node
'use strict';

const {
  readPayload,
  block,
  allow,
  unquoted,
  withoutHeredocBodies,
  closingQuote,
  quotedBody,
  commandStart,
  EVAL,
  DOUBLE_QUOTE_SPECIAL,
  SHELL_COMMAND,
  SHELL_C_OPTION,
  SHELL,
} = require('./_util.cjs');

const NETWORK_PIPE = /\b(?:curl|wget)\b[^\n|]*\|(?!\|)/i;
const PIPELINE_END = /;|\n|&&|\|\||[()`]/;
const NETWORK_PROCESS_SUBSTITUTION = new RegExp(
  String.raw`(?:^|[\s;&|(){])(?:` + SHELL + String.raw`|source|\.)\s+(?:-\S+\s+)*<\([^)]*\b(?:curl|wget)\b`,
  'i'
);
const SECRETS_TO_NETWORK = /\b(?:cat|type)\b[^\n]*\.(?:env|pem|key)\b[^\n]*\|\s*(?:curl|wget|nc)\b/i;

const GIT_COMMAND = /(?:^|\/)git$/i;
const CHMOD_COMMAND = /(?:^|\/)chmod$/i;
const CURL_COMMAND = /(?:^|\/)curl$/;
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
const SHORT_BUNDLE = /^-[A-Za-z]+$/;
const LEASED_FORCE = /^--force-(?:with-lease|if-includes)(?:=|$)/;
const SSL_VERIFY_OFF = /^http\.sslverify=(?:false|0|no|off)$/i;
const NUMERIC_MODE = /^[0-7]{3,4}$/;
const SYMBOLIC_MODE = /^([ugoa]*)([-+=])([rwxXst]*)$/;
const WORLD_WRITE_BIT = 2;

const DANGEROUS_TARGETS = new Set(['/', '/*', '$HOME', '.', '*']);
const HOME_PREFIX = /^(?:~|\$\{HOME\}|\$HOME)(?=\/|$)/;
const COMMAND_SEPARATOR = new Set([';', '&', '|', '\n', '(', ')', '{', '}', '`']);
function readsPayloadAsCommand(argv) {
  const name = argv[commandStart(argv)] || '';
  if (name === EVAL) return true;
  return SHELL_COMMAND.test(name) && SHELL_C_OPTION.test(argv[argv.length - 1] || '');
}

function commandSubstitution(cmd, from) {
  if (cmd[from] === '`') {
    const close = cmd.indexOf('`', from + 1);
    const end = close === -1 ? cmd.length : close;
    return { body: cmd.slice(from + 1, end), end };
  }
  if (cmd[from] !== '$' || cmd[from + 1] !== '(') return null;
  let depth = 0;
  for (let i = from + 1; i < cmd.length; i += 1) {
    if (cmd[i] === '(') depth += 1;
    else if (cmd[i] === ')') {
      depth -= 1;
      if (depth === 0) return { body: cmd.slice(from + 2, i), end: i };
    }
  }
  return { body: cmd.slice(from + 2), end: cmd.length };
}

function invocations(cmd) {
  const commands = [[]];
  const nested = [];
  let word = null;
  let quote = '';
  const pushWord = () => {
    if (word !== null) commands[commands.length - 1].push(word);
    word = null;
  };
  for (let i = 0; i < cmd.length; i += 1) {
    const ch = cmd[i];
    if (quote) {
      if (quote === '"' && ch === '\\' && DOUBLE_QUOTE_SPECIAL.test(cmd[i + 1] || '')) {
        word += cmd[i + 1];
        i += 1;
        continue;
      }
      if (quote === '"') {
        const substitution = commandSubstitution(cmd, i);
        if (substitution) {
          nested.push(...invocations(substitution.body));
          i = substitution.end;
          continue;
        }
      }
      if (ch === quote) quote = '';
      else word += ch;
      continue;
    }
    if (ch === "'" || ch === '"') {
      const argv = commands[commands.length - 1];
      if (word === null && readsPayloadAsCommand(argv)) {
        const close = closingQuote(cmd, ch, i + 1);
        commands.push(...invocations(quotedBody(cmd, ch, i + 1, close)), []);
        if (close === -1) break;
        i = close;
        continue;
      }
      quote = ch;
      if (word === null) word = '';
      continue;
    }
    if (ch === '\\' && i + 1 < cmd.length) {
      word = (word === null ? '' : word) + cmd[i + 1];
      i += 1;
      continue;
    }
    if (ch === '$' && cmd[i + 1] === '{') {
      const close = cmd.indexOf('}', i + 2);
      const end = close === -1 ? cmd.length : close + 1;
      word = (word === null ? '' : word) + cmd.slice(i, end);
      i = end - 1;
      continue;
    }
    if (COMMAND_SEPARATOR.has(ch)) {
      pushWord();
      commands.push([]);
      continue;
    }
    if (/\s/.test(ch)) {
      pushWord();
      continue;
    }
    word = (word === null ? '' : word) + ch;
  }
  pushWord();
  return commands.map((argv) => argv.slice(commandStart(argv))).concat(nested);
}

function normalizedTarget(token) {
  const home = token.match(HOME_PREFIX);
  let target = home ? '$HOME' + token.slice(home[0].length) : token;
  while (target.startsWith('./') && target.length > 2) target = target.slice(2);
  while (target.length > 1 && target.endsWith('/')) target = target.slice(0, -1);
  return target;
}

function isDangerousTarget(token) {
  const target = normalizedTarget(token);
  return DANGEROUS_TARGETS.has(target) || target.startsWith('$HOME/');
}

function isRecursiveForcedRemoval(argv) {
  if (!/(?:^|\/)rm$/i.test(argv[0] || '')) return false;
  let recursive = false;
  let force = false;
  const targets = [];
  for (const token of argv.slice(1)) {
    if (token === '--recursive') recursive = true;
    else if (token === '--force') force = true;
    else if (/^--/.test(token)) continue;
    else if (/^-[A-Za-z]+$/.test(token)) {
      if (/r/i.test(token)) recursive = true;
      if (/f/i.test(token)) force = true;
    } else targets.push(token);
  }
  return recursive && force && targets.some(isDangerousTarget);
}

function shortBundle(word) {
  return SHORT_BUNDLE.test(word) ? word.slice(1) : '';
}

function gitInvocation(argv) {
  if (!GIT_COMMAND.test(argv[0] || '')) return null;
  const options = [];
  let index = 1;
  while (index < argv.length && argv[index].startsWith('-')) {
    const option = argv[index];
    options.push(option);
    index += 1;
    if (GIT_VALUE_OPTION.has(option) && index < argv.length) {
      options.push(argv[index]);
      index += 1;
    }
  }
  const words = argv.slice(index);
  return { options, subcommand: (words[0] || '').toLowerCase(), words: words.slice(1) };
}

function forcesPush(git) {
  if (git.subcommand !== 'push') return false;
  return git.words.some((word) => {
    if (LEASED_FORCE.test(word)) return false;
    if (word === '--force') return true;
    if (shortBundle(word).includes('f')) return true;
    return word.startsWith('+') && word.length > 1;
  });
}

function bypassesGitHooks(git) {
  if (git.subcommand === 'commit') {
    return git.words.some((word) => word === '--no-verify' || shortBundle(word).includes('n'));
  }
  if (git.subcommand === 'push') return git.words.some((word) => word === '--no-verify');
  return false;
}

function rewritesHistory(git) {
  if (git.subcommand === 'filter-branch') return true;
  return git.subcommand === 'reflog' && (git.words[0] || '').toLowerCase() === 'expire';
}

function disablesGitTls(git) {
  return git.options.some((option) => SSL_VERIFY_OFF.test(option));
}

function symbolicWorldWritable(word) {
  const mode = word.match(SYMBOLIC_MODE);
  if (!mode) return false;
  const [, who, operator, permissions] = mode;
  if (operator === '-') return false;
  return /[ao]/.test(who) && permissions.includes('w');
}

function numericWorldWritable(word) {
  if (!NUMERIC_MODE.test(word)) return false;
  return (Number(word[word.length - 1]) & WORLD_WRITE_BIT) !== 0;
}

function grantsWorldWritable(argv) {
  if (!CHMOD_COMMAND.test(argv[0] || '')) return false;
  const mode = argv.slice(1).find((word) => !word.startsWith('-')) || '';
  return numericWorldWritable(mode) || mode.split(',').some(symbolicWorldWritable);
}

function disablesCurlTls(argv) {
  if (!CURL_COMMAND.test(argv[0] || '')) return false;
  return argv.slice(1).some((word) => word === '--insecure' || shortBundle(word).includes('k'));
}

function onGit(test) {
  return (argv) => {
    const git = gitInvocation(argv);
    return git !== null && test(git);
  };
}

const RULES = [
  ['force push', onGit(forcesPush), 'Use --force-with-lease, and never against a protected branch.'],
  ['bypassing git hooks', onGit(bypassesGitHooks), 'Hooks exist to catch bad changes early. Fix the cause instead.'],
  ['irreversible history rewrite', onGit(rewritesHistory), 'This permanently rewrites history; prefer a new commit.'],
  ['world-writable chmod', grantsWorldWritable, 'Grant the narrowest permissions that work.'],
  ['disabling TLS verification', disablesCurlTls, null],
  ['disabling TLS verification', onGit(disablesGitTls), null],
];

function pipesToNetworkShell(cmd) {
  const pipe = NETWORK_PIPE.exec(cmd);
  if (!pipe) return false;
  const rest = cmd.slice(pipe.index + pipe[0].length);
  const end = rest.search(PIPELINE_END);
  const stages = (end === -1 ? rest : rest.slice(0, end)).split('|');
  return stages.some((stage) =>
    invocations(stage.replace(/^\s*&/, '')).some((argv) => SHELL_COMMAND.test(argv[0] || ''))
  );
}

(async () => {
  const payload = await readPayload();
  const raw = String((payload.tool_input && payload.tool_input.command) || '');
  if (!raw.trim()) return allow();
  const source = withoutHeredocBodies(raw);
  const cmd = unquoted(source);
  const argvs = invocations(source);

  if (argvs.some(isRecursiveForcedRemoval)) {
    return block(
      `Refusing 'rm -rf' against a root/home/glob target in: ${raw.slice(0, 120)}. ` +
        `Scope the delete to an explicit project subdirectory.`
    );
  }

  if (pipesToNetworkShell(cmd) || NETWORK_PROCESS_SUBSTITUTION.test(cmd)) {
    return block(
      `Blocked unsafe command (pipe-to-shell from the network): ${raw.slice(0, 120)}. ` +
        `Download to a file, inspect it, then run it.`
    );
  }

  if (SECRETS_TO_NETWORK.test(cmd)) {
    return block(`Blocked unsafe command (piping secrets to the network): ${raw.slice(0, 120)}.`);
  }

  for (const [label, test, hint] of RULES) {
    if (argvs.some(test)) {
      return block(`Blocked unsafe command (${label}): ${raw.slice(0, 120)}.${hint ? ' ' + hint : ''}`);
    }
  }
  return allow();
})();
