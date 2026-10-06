#!/usr/bin/env node
'use strict';

const path = require('path');

const { readPayload, block, allow, extractFileEdit } = require('./_util.cjs');

const SECRET_KEY = String.raw`(?:[\w-]{0,32}[_-])?(?:api[_-]?key|secret|password|passwd|token|client[_-]?secret)(?:[_-][\w-]{0,32})?\s*['"]?\s*[:=]\s*`;
const SECRET_VALUE = String.raw`[^'"\s]{12,}`;

const PATTERNS = [
  ['private key block', /-----BEGIN (?:RSA |EC |OPENSSH |DSA |PGP )?PRIVATE KEY-----/g],
  ['AWS access key id', /\bAKIA[0-9A-Z]{16}\b/g],
  ['AWS secret access key', /\baws_secret_access_key\s*[:=]\s*['"]?[A-Za-z0-9/+]{40}\b/gi],
  ['GitHub token', /\bgh[pousr]_[A-Za-z0-9]{36,}\b/g],
  ['Anthropic API key', /\bsk-ant-[A-Za-z0-9_-]{20,}\b/g],
  ['Slack token', /\bxox[baprs]-[A-Za-z0-9-]{10,}\b/g],
  ['Google API key', /\bAIza[0-9A-Za-z_-]{35}\b/g],
  ['Stripe secret key', /\bsk_(?:live|test)_[0-9A-Za-z]{16,}\b/g],
  ['JWT', /\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b/g],
  ['generic secret assignment', new RegExp(SECRET_KEY + String.raw`['"]` + SECRET_VALUE + String.raw`['"]`, 'gi')],
];

const CONFIG_PATTERNS = [
  ['generic secret assignment', new RegExp(SECRET_KEY + SECRET_VALUE, 'gi')],
];

const PLACEHOLDER =
  /(your[_-]?|example|placeholder|changeme|dummy|fake|xxxx|<[^>]+>|\$\{|\benv\.|process\.env|import\.meta\.env|os\.environ|getenv)/i;

const EXEMPT_FILE = /\.env\.(example|sample|template)$/;
const CONFIG_FILE = /(?:^|\/)(?:\.env[\w.-]*|[^/]+\.(?:ya?ml|ini|cfg|conf|properties|toml|env))$/i;
const REVIEW_BODY = 'REVIEW_BODY_FILE';

(async () => {
  const payload = await readPayload();
  const { filePath, content } = extractFileEdit(payload);
  if (!content) return allow();
  if (EXEMPT_FILE.test(filePath)) return allow();

  const reviewBody = process.env[REVIEW_BODY];
  if (reviewBody && filePath && path.resolve(filePath) === path.resolve(reviewBody)) return allow();

  const patterns = CONFIG_FILE.test(filePath) ? [...PATTERNS, ...CONFIG_PATTERNS] : PATTERNS;
  for (const [label, pattern] of patterns) {
    for (const match of content.matchAll(pattern)) {
      if (PLACEHOLDER.test(match[0])) continue;
      return block(
        `Looks like a real ${label} is being written to ${filePath || 'a file'}: ` +
          `"${match[0].slice(0, 24)}...". Do not hardcode secrets. Read them from the environment ` +
          `or a secret store, and use a placeholder in committed files (e.g. .env.example). If this ` +
          `is a false positive, rename it to an obvious placeholder.`
      );
    }
  }
  return allow();
})();
