'use strict';

const CODE = 0;
const STRING = 1;
const CHAR = 2;
const TEXT_BLOCK = 3;
const LINE_COMMENT = 4;
const BLOCK_COMMENT = 5;

function tripleQuoteAt(source, i) {
  return source[i] === '"' && source[i + 1] === '"' && source[i + 2] === '"';
}

function sorted(lines) {
  return [...lines].sort((a, b) => a - b);
}

function javaComments(source) {
  const lines = new Set();
  let state = CODE;
  let line = 1;
  for (let i = 0; i < source.length; i++) {
    const c = source[i];
    const next = source[i + 1];
    if (c === '\n') {
      line++;
      if (state === LINE_COMMENT || state === STRING || state === CHAR) state = CODE;
      else if (state === BLOCK_COMMENT) lines.add(line);
      continue;
    }
    switch (state) {
      case CODE:
        if (c === '/' && next === '/') {
          state = LINE_COMMENT;
          lines.add(line);
          i++;
        } else if (c === '/' && next === '*') {
          state = BLOCK_COMMENT;
          lines.add(line);
          i++;
        } else if (tripleQuoteAt(source, i)) {
          state = TEXT_BLOCK;
          i += 2;
        } else if (c === '"') {
          state = STRING;
        } else if (c === "'") {
          state = CHAR;
        }
        break;
      case STRING:
        if (c === '\\') i++;
        else if (c === '"') state = CODE;
        break;
      case CHAR:
        if (c === '\\') i++;
        else if (c === "'") state = CODE;
        break;
      case TEXT_BLOCK:
        if (c === '\\') i++;
        else if (tripleQuoteAt(source, i)) {
          state = CODE;
          i += 2;
        }
        break;
      case BLOCK_COMMENT:
        if (c === '*' && next === '/') {
          state = CODE;
          i++;
        }
        break;
      default:
        break;
    }
  }
  return sorted(lines);
}

const REGEX_MAY_FOLLOW = '([{,;:=!&|?+-*%~<>^';
const REGEX_MAY_FOLLOW_WORD = new Set([
  'return',
  'typeof',
  'case',
  'in',
  'of',
  'delete',
  'void',
  'instanceof',
  'do',
  'else',
  'yield',
  'await',
  'new',
]);

function isWordChar(c) {
  return /[A-Za-z0-9_$]/.test(c);
}

function jsComments(source) {
  const lines = new Set();
  const enclosingTemplates = [];
  let line = 1;
  let i = 0;
  let prevSig = '';
  let prevWord = '';
  let braceDepth = 0;
  let inTemplate = false;

  if (source.startsWith('#!')) {
    while (i < source.length && source[i] !== '\n') i++;
  }

  const skipString = (quote) => {
    i++;
    while (i < source.length && source[i] !== quote) {
      if (source[i] === '\\') {
        i++;
      } else if (source[i] === '\n') {
        line++;
      }
      i++;
    }
    i++;
  };

  while (i < source.length) {
    const c = source[i];
    const next = source[i + 1];

    if (inTemplate) {
      if (c === '\\') {
        i += 2;
        continue;
      }
      if (c === '\n') {
        line++;
        i++;
        continue;
      }
      if (c === '`') {
        inTemplate = false;
        prevSig = '`';
        prevWord = '';
        i++;
        continue;
      }
      if (c === '$' && next === '{') {
        enclosingTemplates.push(braceDepth);
        braceDepth = 0;
        inTemplate = false;
        prevSig = '{';
        prevWord = '';
        i += 2;
        continue;
      }
      i++;
      continue;
    }

    if (c === '\n') {
      line++;
      i++;
      continue;
    }
    if (c === '/' && next === '/') {
      lines.add(line);
      while (i < source.length && source[i] !== '\n') i++;
      continue;
    }
    if (c === '/' && next === '*') {
      lines.add(line);
      i += 2;
      while (i < source.length && !(source[i] === '*' && source[i + 1] === '/')) {
        if (source[i] === '\n') {
          line++;
          lines.add(line);
        }
        i++;
      }
      i += 2;
      prevSig = ')';
      prevWord = '';
      continue;
    }
    if (c === '"' || c === "'") {
      skipString(c);
      prevSig = c;
      prevWord = '';
      continue;
    }
    if (c === '`') {
      inTemplate = true;
      i++;
      continue;
    }
    if (c === '{') {
      braceDepth++;
      prevSig = c;
      prevWord = '';
      i++;
      continue;
    }
    if (c === '}') {
      if (braceDepth === 0 && enclosingTemplates.length > 0) {
        braceDepth = enclosingTemplates.pop();
        inTemplate = true;
        i++;
        continue;
      }
      if (braceDepth > 0) braceDepth--;
      prevSig = c;
      prevWord = '';
      i++;
      continue;
    }
    if (c === '/') {
      const afterWord = isWordChar(prevSig) && REGEX_MAY_FOLLOW_WORD.has(prevWord);
      if (prevSig === '' || REGEX_MAY_FOLLOW.includes(prevSig) || afterWord) {
        i++;
        let inClass = false;
        while (i < source.length) {
          const d = source[i];
          if (d === '\\') {
            i += 2;
            continue;
          }
          if (d === '\n') {
            line++;
            break;
          }
          if (d === '[') inClass = true;
          else if (d === ']') inClass = false;
          else if (d === '/' && !inClass) {
            i++;
            break;
          }
          i++;
        }
        prevSig = '/';
        prevWord = '';
        continue;
      }
    }
    if (!/\s/.test(c)) {
      prevSig = c;
      prevWord = isWordChar(c) ? prevWord + c : '';
    }
    i++;
  }
  return sorted(lines);
}

function hashCommentColumn(raw, startState) {
  let quote = startState.quote;
  for (let i = 0; i < raw.length; i++) {
    const c = raw[i];
    if (quote) {
      if (quote === '"' && c === '\\') {
        i++;
        continue;
      }
      if (c === quote) quote = null;
      continue;
    }
    if (c === '"' || c === "'") {
      quote = c;
      continue;
    }
    if (c === '#' && (i === 0 || /\s/.test(raw[i - 1]))) {
      startState.quote = null;
      return i;
    }
  }
  startState.quote = quote;
  return -1;
}

function heredocTagOn(code) {
  const m = code.match(/<<[-~]?\s*(?:'([A-Za-z_][A-Za-z0-9_]*)'|"([A-Za-z_][A-Za-z0-9_]*)"|([A-Za-z_][A-Za-z0-9_]*))\s*$/);
  if (!m) return null;
  return m[1] || m[2] || m[3];
}

const SCRIPT_HEREDOC = /(>>?\s*(?:"[^"]*\.sh"|'[^']*\.sh'|\S+\.sh)\s*<<)|(\|\s*(?:ba|z|k)?sh\b)/;

function shellComments(source, lineOffset = 0) {
  const lines = new Set();
  const rows = source.split('\n');
  const state = { quote: null };
  let heredoc = null;

  const closeHeredoc = () => {
    if (heredoc && heredoc.lexAsScript) {
      for (const n of shellComments(heredoc.rows.join('\n'), heredoc.start)) lines.add(n);
    }
    heredoc = null;
  };

  for (let idx = 0; idx < rows.length; idx++) {
    const raw = rows[idx].replace(/\r$/, '');
    const lineNo = idx + 1 + lineOffset;
    if (heredoc !== null) {
      if (raw.trim() === heredoc.tag) closeHeredoc();
      else if (heredoc.lexAsScript) heredoc.rows.push(raw);
      continue;
    }
    if (idx === 0 && raw.trimStart().startsWith('#!')) continue;
    const at = hashCommentColumn(raw, state);
    if (at >= 0) lines.add(lineNo);
    const code = at >= 0 ? raw.slice(0, at) : raw;
    const tag = heredocTagOn(code);
    if (tag) heredoc = { tag, lexAsScript: SCRIPT_HEREDOC.test(code), rows: [], start: lineNo };
  }
  closeHeredoc();
  return sorted(lines);
}

function hclComments(source) {
  const lines = new Set();
  const rows = source.split('\n');
  const state = { quote: null };
  let heredoc = null;
  let inBlock = false;
  for (let idx = 0; idx < rows.length; idx++) {
    const raw = rows[idx].replace(/\r$/, '');
    const lineNo = idx + 1;
    if (heredoc !== null) {
      if (raw.trim() === heredoc) heredoc = null;
      continue;
    }
    if (inBlock) {
      lines.add(lineNo);
      const end = raw.indexOf('*/');
      if (end >= 0) inBlock = false;
      continue;
    }
    let at = -1;
    let quote = state.quote;
    for (let i = 0; i < raw.length; i++) {
      const c = raw[i];
      if (quote) {
        if (c === '\\') {
          i++;
          continue;
        }
        if (c === quote) quote = null;
        continue;
      }
      if (c === '"') {
        quote = c;
        continue;
      }
      if (c === '#' && (i === 0 || /\s/.test(raw[i - 1]))) {
        at = i;
        break;
      }
      if (c === '/' && raw[i + 1] === '/') {
        at = i;
        break;
      }
      if (c === '/' && raw[i + 1] === '*') {
        at = i;
        inBlock = raw.indexOf('*/', i + 2) < 0;
        break;
      }
    }
    state.quote = at >= 0 ? null : quote;
    if (at >= 0) lines.add(lineNo);
    const code = at >= 0 ? raw.slice(0, at) : raw;
    const tag = heredocTagOn(code);
    if (tag) heredoc = tag;
  }
  return sorted(lines);
}

function yamlComments(source) {
  const lines = new Set();
  const rows = source.split('\n');
  let block = null;
  let goComment = false;

  const flush = () => {
    if (block && block.isRun) {
      for (const n of shellComments(block.rows.join('\n'), block.start)) lines.add(n);
    }
    block = null;
  };

  for (let idx = 0; idx < rows.length; idx++) {
    const raw = rows[idx].replace(/\r$/, '');
    const lineNo = idx + 1;
    const indent = raw.length - raw.trimStart().length;

    if (block) {
      if (raw.trim() === '' || indent > block.indent) {
        block.rows.push(raw);
        continue;
      }
      flush();
    }

    if (goComment) {
      lines.add(lineNo);
      if (raw.includes('*/}}')) goComment = false;
      continue;
    }

    const goStart = raw.indexOf('{{/*');
    if (goStart >= 0) {
      lines.add(lineNo);
      if (!raw.includes('*/}}', goStart)) goComment = true;
      continue;
    }

    if (raw.trim() === '') continue;

    const at = hashCommentColumn(raw, { quote: null });
    if (at >= 0) lines.add(lineNo);

    const code = at >= 0 ? raw.slice(0, at) : raw;
    const scalar = code.match(/(^|\s)([A-Za-z0-9_.-]+):\s*[|>][-+]?\d*\s*$/);
    if (scalar) block = { indent, isRun: scalar[2] === 'run', rows: [], start: lineNo };
  }
  flush();
  return sorted(lines);
}

const VENDORED_PATH = /(^|\/)(mvnw|mvnw\.cmd)$|(^|\/)\.mvn\/wrapper\/|(^|\/)node_modules\//;

const GATED = [
  { pattern: /(^|\/)backend\/src\/(main|test)\/java\/.+\.java$/, lexer: javaComments },
  { pattern: /(^|\/)frontend\/src\/.+\.(js|jsx|ts|tsx)$/, lexer: jsComments },
  { pattern: /(^|\/)\.claude\/hooks\/.+\.cjs$/, lexer: jsComments },
  { pattern: /(^|\/)scripts\/.+\.(cjs|js)$/, lexer: jsComments },
  { pattern: /(^|\/)scripts\/.+\.sh$/, lexer: shellComments },
  { pattern: /(^|\/)\.github\/workflows\/.+\.ya?ml$/, lexer: yamlComments },
];

const GATED_PATHSPECS = [
  'backend/src/main/java',
  'backend/src/test/java',
  'frontend/src',
  '.claude/hooks',
  'scripts',
  '.github/workflows',
];

const GATED_LABEL = 'backend/src/main/java, backend/src/test/java, frontend/src, .claude/hooks, scripts or .github/workflows';

function lexerFor(filePath) {
  const p = String(filePath).replace(/\\/g, '/');
  if (VENDORED_PATH.test(p)) return null;
  const hit = GATED.find((g) => g.pattern.test(p));
  return hit ? hit.lexer : null;
}

function isGated(filePath) {
  return lexerFor(filePath) !== null;
}

function commentLines(source, filePath) {
  const lexer = lexerFor(filePath);
  if (!lexer) return [];
  const split = source.split('\n');
  return lexer(source).map((n) => ({ line: n, text: split[n - 1] === undefined ? '' : split[n - 1] }));
}

function addedCommentLines(oldSource, newSource, filePath) {
  const existing = new Set(commentLines(oldSource, filePath).map((l) => l.text.trim()));
  return commentLines(newSource, filePath).filter((l) => !existing.has(l.text.trim()));
}

module.exports = {
  javaComments,
  jsComments,
  yamlComments,
  shellComments,
  hclComments,
  lexerFor,
  commentLines,
  addedCommentLines,
  isGated,
  GATED_PATHSPECS,
  GATED_LABEL,
};
