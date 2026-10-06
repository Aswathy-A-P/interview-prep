#!/usr/bin/env node
'use strict';

const fs = require('fs');
const { readPayload, block, allow } = require('./_util.cjs');
const { addedCommentLines, isGated } = require('./_comment-lexers.cjs');

function previousText(toolInput, filePath) {
  if (typeof toolInput.old_string === 'string') return toolInput.old_string;
  try {
    return fs.readFileSync(filePath, 'utf8');
  } catch {
    return '';
  }
}

(async () => {
  const payload = await readPayload();
  const toolInput = payload.tool_input || {};
  const filePath = String(toolInput.file_path || toolInput.path || '').replace(/\\/g, '/');
  const content = String(toolInput.content || toolInput.new_string || '');
  if (!content || !isGated(filePath)) return allow();

  const added = addedCommentLines(previousText(toolInput, filePath), content, filePath);
  if (added.length === 0) return allow();

  const shown = added
    .slice(0, 3)
    .map((l) => `"${l.text.trim().slice(0, 80)}"`)
    .join(', ');
  return block(
    `${filePath} would gain ${added.length} comment line(s): ${shown}. ` +
      `.claude/conventions/comment-conventions.md bans every comment in a source file, javadoc included. ` +
      `A cause or constraint goes in the CHANGELOG entry, a guarantee in a test name, deferred work in a ` +
      `tracked issue; then write the change without the comment.`
  );
})();
