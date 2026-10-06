'use strict';

const GIT_OPTION_VALUE = String.raw`(?:'[^']*'|"[^"]*"|[^-\s]\S*)`;
const GIT_VALUE_OPTION = String.raw`(?:-[Cc]|--(?:git-dir|work-tree|namespace|exec-path|super-prefix|config-env))`;
const GIT_OPTION =
  String.raw`(?:` + GIT_VALUE_OPTION + String.raw`\s+` + GIT_OPTION_VALUE +
  String.raw`|--?[\w][\w-]*(?:=\S*)?)`;
const GIT = String.raw`\bgit\s+(?:` + GIT_OPTION + String.raw`\s+)*`;
const SHELL = String.raw`(?:\S*\/)?(?:ba|z|da|k)?sh`;
const SHELL_C = String.raw`-[A-Za-z]*c`;
const EVAL = 'eval';
const DOUBLE_QUOTE_ESCAPE = /\\(["\\$`])/g;
const DOUBLE_QUOTE_SPECIAL = /["\\$`]/;
const HEREDOC_START = /^<<(-?)\s*(?:'([^']*)'|"([^"]*)"|([A-Za-z_][\w.-]*))/;
const SEGMENT_BREAK = /[;&|(){}]/;
const SHELL_KEYWORD = /^(?:if|then|elif|else|fi|while|until|do|done|for|in|!)$/;
const ORDINARY_WORD = /^[\w./:@=+~-]+$/;
const LEADING_TABS = /^\t+/;
const READS_PAYLOAD_AS_COMMAND = new RegExp(
  String.raw`(?:^|[\s;&|(){])(?:` +
    SHELL + String.raw`\s+(?:-[A-Za-z]+\s+)*` + SHELL_C + String.raw`|` + EVAL +
    String.raw`)\s*$`
);

function readStdin() {
  return new Promise((resolve) => {
    let data = '';
    process.stdin.setEncoding('utf8');
    process.stdin.on('data', (c) => (data += c));
    process.stdin.on('end', () => resolve(data));
    if (process.stdin.isTTY) resolve('');
  });
}

async function readPayload() {
  const raw = await readStdin();
  try {
    return JSON.parse(raw || '{}');
  } catch {
    return {};
  }
}

function block(reason) {
  process.stderr.write(`[blocked by hook] ${reason}\n`);
  process.exit(2);
}

function allow(note) {
  if (note) {
    process.stdout.write(
      JSON.stringify({
        hookSpecificOutput: { hookEventName: 'PreToolUse', additionalContext: note },
      })
    );
  }
  process.exit(0);
}

function permit(reason) {
  process.stdout.write(
    JSON.stringify({
      hookSpecificOutput: {
        hookEventName: 'PreToolUse',
        permissionDecision: 'allow',
        permissionDecisionReason: reason,
      },
    })
  );
  process.exit(0);
}

function surfaceToModel(note) {
  process.stderr.write(note + '\n');
  process.exit(2);
}

const RUNNER_OPTIONS = {
  sudo: {
    short: 'CDghprRtTuU',
    long: ['user', 'group', 'prompt', 'chdir', 'host', 'role', 'type', 'other-user', 'close-from', 'command-timeout'],
  },
  env: { short: 'CSu', long: ['chdir', 'unset', 'split-string', 'block-signal', 'default-signal', 'ignore-signal'] },
  xargs: {
    short: 'adEeIiLlnPs',
    long: ['arg-file', 'delimiter', 'eof', 'replace', 'max-lines', 'max-args', 'max-procs', 'max-chars', 'process-slot-var'],
  },
  time: { short: 'fo', long: ['format', 'output'] },
  command: { short: '', long: [] },
  nohup: { short: '', long: [] },
};
const RUNNER = new RegExp('^(?:' + Object.keys(RUNNER_OPTIONS).join('|') + ')$');
const ASSIGNMENT = /^[A-Za-z_][A-Za-z0-9_]*=/;
const OPTION = /^-./;
const LONG_OPTION = /^--(.+)$/;
const SHELL_COMMAND = new RegExp('^' + SHELL + '$');
const SHELL_C_OPTION = new RegExp('^' + SHELL_C + '$');

function takesSeparateValue(runner, token) {
  const grammar = RUNNER_OPTIONS[runner];
  const long = token.match(LONG_OPTION);
  if (long) return !long[1].includes('=') && grammar.long.includes(long[1]);
  const letters = token.slice(1);
  for (let i = 0; i < letters.length; i += 1) {
    if (grammar.short.includes(letters[i])) return i === letters.length - 1;
  }
  return false;
}

function commandStart(argv) {
  let index = 0;
  let runner = '';
  while (index < argv.length) {
    const token = argv[index];
    if (ASSIGNMENT.test(token) || SHELL_KEYWORD.test(token)) index += 1;
    else if (RUNNER.test(token)) {
      runner = token;
      index += 1;
    } else if (runner && OPTION.test(token)) index += takesSeparateValue(runner, token) ? 2 : 1;
    else break;
  }
  return index;
}

function closingQuote(cmd, quote, from) {
  const escapes = quote === '"';
  for (let i = from; i < cmd.length; i += 1) {
    if (escapes && cmd[i] === '\\' && i + 1 < cmd.length) {
      i += 1;
      continue;
    }
    if (cmd[i] === quote) return i;
  }
  return -1;
}

function quotedBody(cmd, quote, from, close) {
  const body = close === -1 ? cmd.slice(from) : cmd.slice(from, close);
  return quote === '"' ? body.replace(DOUBLE_QUOTE_ESCAPE, '$1') : body;
}

function unquoted(cmd) {
  let out = '';
  for (let i = 0; i < cmd.length; i += 1) {
    const ch = cmd[i];
    if (ch === '\\' && i + 1 < cmd.length) {
      out += ch + cmd[i + 1];
      i += 1;
      continue;
    }
    if (ch !== "'" && ch !== '"') {
      out += ch;
      continue;
    }
    const close = closingQuote(cmd, ch, i + 1);
    const body = quotedBody(cmd, ch, i + 1, close);
    out += READS_PAYLOAD_AS_COMMAND.test(out) || ORDINARY_WORD.test(body) ? body : ' ';
    if (close === -1) break;
    i = close;
  }
  return out;
}

function heredocsOnLine(line) {
  const found = [];
  let quote = '';
  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    if (quote) {
      if (quote === '"' && ch === '\\') i += 1;
      else if (ch === quote) quote = '';
      continue;
    }
    if (ch === "'" || ch === '"') {
      quote = ch;
      continue;
    }
    if (ch === '\\') {
      i += 1;
      continue;
    }
    if (ch !== '<' || line[i + 1] !== '<' || line[i + 2] === '<') continue;
    const intro = line.slice(i).match(HEREDOC_START);
    if (!intro) continue;
    const quoted = intro[2] != null ? intro[2] : intro[3];
    found.push({
      delimiter: quoted != null ? quoted : intro[4],
      indented: intro[1] === '-',
      before: line.slice(0, i),
    });
    i += intro[0].length - 1;
  }
  return found;
}

function readsStdinAsCommands(before) {
  const segment = unquoted(before).split(SEGMENT_BREAK).pop();
  const words = segment.trim().split(/\s+/).filter(Boolean);
  const name = words[commandStart(words)] || '';
  return SHELL_COMMAND.test(name) || name === EVAL;
}

function terminatesHeredoc(line, heredoc) {
  return (heredoc.indented ? line.replace(LEADING_TABS, '') : line) === heredoc.delimiter;
}

function withoutHeredocBodies(cmd) {
  const lines = cmd.split('\n');
  const kept = [];
  let index = 0;
  while (index < lines.length) {
    const line = lines[index];
    kept.push(line);
    index += 1;
    for (const heredoc of heredocsOnLine(line)) {
      const body = readsStdinAsCommands(heredoc.before);
      while (index < lines.length && !terminatesHeredoc(lines[index], heredoc)) {
        if (body) kept.push(lines[index]);
        index += 1;
      }
      if (index < lines.length) {
        kept.push(lines[index]);
        index += 1;
      }
    }
  }
  return kept.join('\n');
}

function extractFileEdit(payload) {
  const ti = payload.tool_input || {};
  const filePath = ti.file_path || ti.path || ti.notebook_path || '';
  const content = ti.content || ti.new_string || ti.new_source || '';
  return { filePath: String(filePath).replace(/\\/g, '/'), content: String(content) };
}

module.exports = {
  readPayload,
  block,
  allow,
  permit,
  surfaceToModel,
  unquoted,
  closingQuote,
  quotedBody,
  commandStart,
  withoutHeredocBodies,
  extractFileEdit,
  DOUBLE_QUOTE_SPECIAL,
  SHELL_COMMAND,
  SHELL_C_OPTION,
  GIT_OPTION,
  GIT,
  SHELL,
  EVAL,
};
