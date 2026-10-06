'use strict';

const { BLOCKED, ALLOWED, runHook, createSuite } = require('./_assert.cjs');

const { ok, done } = createSuite('block-secrets');

function write(filePath, content, env) {
  return runHook('block-secrets.cjs', { tool_name: 'Write', tool_input: { file_path: filePath, content } }, env);
}

function edit(filePath, newString) {
  return runHook('block-secrets.cjs', {
    tool_name: 'Edit',
    tool_input: { file_path: filePath, new_string: newString },
  });
}

function editNotebook(notebookPath, newSource) {
  return runHook('block-secrets.cjs', {
    tool_name: 'NotebookEdit',
    tool_input: { notebook_path: notebookPath, new_source: newSource },
  });
}

const AWS_ACCESS_KEY_ID = 'AKIA' + '1234567890ABCDEF';
const AWS_SECRET = 'aws_secret_access_key = "' + 'abcdefghij0123456789abcdefghij0123456789"';
const PRIVATE_KEY = '-----BEGIN RSA ' + 'PRIVATE KEY-----\nMIIabc\n-----END RSA ' + 'PRIVATE KEY-----';
const GITHUB_TOKEN = 'ghp_' + '0123456789abcdefABCDEF0123456789abcdef';
const ANTHROPIC_KEY = 'sk-ant-' + '0123456789abcdefghijABCDEF';
const SLACK_TOKEN = 'xoxb-' + '0123456789-0123456789-abcdefghij';
const GOOGLE_KEY = 'AIza' + 'SyA0123456789abcdefghijklmnopqrstuv';
const STRIPE_KEY = 'sk_live_' + '0123456789abcdefghij';
const JSON_WEB_TOKEN = 'eyJ' + 'hbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.dBjftJeZ4CVPmB92K27uhbUJU1p1r';
const SECRET_ASSIGNMENT = 'password = "' + 'hunter2hunter2"';

ok(write('src/a.js', `const key = "${AWS_ACCESS_KEY_ID}";`) === BLOCKED, 'AWS access key id is blocked');
ok(write('config.ini', AWS_SECRET) === BLOCKED, 'AWS secret access key is blocked');
ok(write('id_rsa', PRIVATE_KEY) === BLOCKED, 'private key block is blocked');
ok(write('src/a.js', GITHUB_TOKEN) === BLOCKED, 'GitHub token is blocked');
ok(write('src/a.js', ANTHROPIC_KEY) === BLOCKED, 'Anthropic API key is blocked');
ok(write('src/a.js', SLACK_TOKEN) === BLOCKED, 'Slack token is blocked');
ok(write('src/a.js', GOOGLE_KEY) === BLOCKED, 'Google API key is blocked');
ok(write('src/a.js', STRIPE_KEY) === BLOCKED, 'Stripe secret key is blocked');
ok(write('src/a.js', JSON_WEB_TOKEN) === BLOCKED, 'JWT is blocked');
ok(write('config.py', SECRET_ASSIGNMENT) === BLOCKED, 'generic secret assignment is blocked');
ok(edit('src/a.js', GITHUB_TOKEN) === BLOCKED, 'a secret arriving through Edit is blocked');
ok(editNotebook('analysis.ipynb', GITHUB_TOKEN) === BLOCKED, 'a secret arriving through NotebookEdit is blocked');
ok(
  editNotebook('analysis.ipynb', `client = Client(api_key="${ANTHROPIC_KEY}")`) === BLOCKED,
  'a secret in a notebook cell is blocked'
);

const PLACEHOLDER_TOKEN = 'ghp_' + 'exampleexampleexampleexampleexample1';
const PLACEHOLDER_ASSIGNMENT = 'password = "' + 'your-password-here"';

ok(
  write('src/a.js', `const shown = "${PLACEHOLDER_TOKEN}";\nconst used = "${GITHUB_TOKEN}";`) === BLOCKED,
  'a real token below a placeholder of the same shape is blocked'
);
ok(
  write('config.py', `${PLACEHOLDER_ASSIGNMENT}\n${SECRET_ASSIGNMENT}`) === BLOCKED,
  'a real assignment below a placeholder assignment is blocked'
);
ok(
  write('src/a.js', `const a = "${PLACEHOLDER_TOKEN}";\nconst b = "${PLACEHOLDER_TOKEN}";`) === ALLOWED,
  'two placeholders of the same shape are allowed'
);

ok(write('src/a.js', 'AKIAIOSFODNN7EXAMPLE') === ALLOWED, 'a key containing EXAMPLE is allowed');
ok(write('config.py', 'api_key = "your-api-key-here"') === ALLOWED, 'a your-* placeholder is allowed');
ok(write('config.py', 'password = "${DB_PASSWORD}"') === ALLOWED, 'shell interpolation is allowed');
ok(write('src/a.js', 'const token = process.env.API_TOKEN') === ALLOWED, 'process.env indirection is allowed');
ok(
  write('src/a.js', 'const token = import.meta.env.VITE_TOKEN') === ALLOWED,
  'import.meta.env indirection is allowed'
);
ok(write('config.py', 'token = os.environ["API_TOKEN"]') === ALLOWED, 'os.environ indirection is allowed');

const BARE_ASSIGNMENT = 'password=' + 'hunter2hunter2';
const BARE_PREFIXED = 'DB_PASSWORD=' + 'hunter2hunter2';

ok(write('.env', BARE_ASSIGNMENT) === BLOCKED, 'an unquoted secret in a .env file is blocked');
ok(write('.env', BARE_PREFIXED) === BLOCKED, 'an unquoted secret under a prefixed key is blocked');
ok(write('deploy/.env.local', BARE_ASSIGNMENT) === BLOCKED, 'an unquoted secret in a .env.local file is blocked');
ok(write('app.yaml', 'db:\n  password: ' + 'hunter2hunter2') === BLOCKED, 'an unquoted secret in a YAML file is blocked');
ok(write('k8s/secret.yml', 'api_key: ' + 'sk-abcdefghijklmnop') === BLOCKED, 'an unquoted secret in a .yml file is blocked');
ok(write('config.ini', 'DB_TOKEN=' + 'abcdefghijklmno') === BLOCKED, 'an unquoted secret in an .ini file is blocked');
ok(write('settings.toml', 'client_secret = ' + 'abcdefghijklmno') === BLOCKED, 'an unquoted secret in a .toml file is blocked');
ok(write('config.py', 'DB_PASSWORD = "' + 'hunter2hunter2"') === BLOCKED, 'a quoted secret under a prefixed key is blocked');
ok(write('config.json', '{ "password": "' + 'Prod!ClusterPass2024" }') === BLOCKED, 'a quoted key in a JSON file is blocked');
ok(write('app.yaml', '"api_key": ' + 'abcdefghijklmno') === BLOCKED, 'a quoted key in a YAML file is blocked');
ok(write('settings.toml', "'client_secret' = " + 'abcdefghijklmno') === BLOCKED, 'a single-quoted key in a TOML file is blocked');

ok(write('.env', 'password=${DB_PASSWORD}') === ALLOWED, 'shell interpolation in a .env file is allowed');
ok(write('.env', 'password=your-password-here') === ALLOWED, 'a your-* placeholder in a .env file is allowed');
ok(write('app.yaml', 'password: short') === ALLOWED, 'a value below the length floor is allowed');
ok(write('app.yaml', 'password: {{ .Values.password }}') === ALLOWED, 'a template placeholder in YAML is allowed');
ok(write('src/a.js', 'const p = localStorage.getItem("pw");') === ALLOWED, 'an unquoted expression in source is allowed');
ok(write('src/a.js', 'password: this.form.password,') === ALLOWED, 'a password read from a form field is allowed');
ok(write('src/a.js', 'apiKey: configuration.apiKey,') === ALLOWED, 'an api key read from configuration is allowed');
ok(write('src/models.py', 'password = models.CharField(max_length=128)') === ALLOWED, 'a password column definition is allowed');
ok(write('src/a.ts', 'token: authService.currentToken,') === ALLOWED, 'a token read from a service is allowed');

const REVIEW_BODY = '/tmp/pr-review/review-body.md';
const atReview = { REVIEW_BODY_FILE: REVIEW_BODY };
const REPORTED_KEY = `A live key ${AWS_ACCESS_KEY_ID} is committed in cfg.py.`;

ok(write(REVIEW_BODY, REPORTED_KEY, atReview) === ALLOWED, 'a review body may report the credential it found');
ok(write(REVIEW_BODY, GITHUB_TOKEN, atReview) === ALLOWED, 'a review body may quote a committed token');
ok(write('/tmp/pr-review/notes.md', REPORTED_KEY, atReview) === BLOCKED, 'another file in the review directory is still guarded');
ok(write(REVIEW_BODY, REPORTED_KEY) === BLOCKED, 'the body path is only exempt while the environment names it');

ok(write('.env.example', AWS_ACCESS_KEY_ID) === ALLOWED, '.env.example is exempt');
ok(write('config/db.env.sample', SECRET_ASSIGNMENT) === ALLOWED, 'a .env.sample file is exempt');
ok(write('deploy/.env.template', GITHUB_TOKEN) === ALLOWED, 'a .env.template file is exempt');

ok(write('src/a.js', '') === ALLOWED, 'empty content is allowed');
ok(write('src/a.js', 'export const sum = (a, b) => a + b;') === ALLOWED, 'ordinary code is allowed');
ok(
  editNotebook('analysis.ipynb', 'client = Client(api_key=os.environ["ANTHROPIC_API_KEY"])') === ALLOWED,
  'a notebook cell reading a key from the environment is allowed'
);

const DJANGO_SECRET_KEY = 'SECRET_KEY = "' + 'Pr0dClusterKey2024x"';
const TRAILING_SEGMENT_KEY = 'API_TOKEN_VALUE = "' + 'Pr0dClusterKey2024x"';

ok(write('settings.py', DJANGO_SECRET_KEY) === BLOCKED, 'a key name that ends with the secret word is blocked');
ok(write('settings.py', TRAILING_SEGMENT_KEY) === BLOCKED, 'a key name with a segment on each side of the secret word is blocked');
ok(write('app.yml', 'client_secret_id: ' + 'Pr0dClusterKey2024x') === BLOCKED, 'a trailing segment in a config file is blocked');
ok(write('settings.py', 'SECRET_KEY = "' + 'your-secret-key-here"') === ALLOWED, 'a placeholder under a trailing segment is allowed');
ok(write('src/a.ts', 'const tokenize = "' + 'splitOnWhitespace";') === ALLOWED, 'a word that merely starts with the secret word is allowed');

const LONG_TOKEN = 'const blob = "' + 'a'.repeat(200000) + '";';
const startedAt = Date.now();
const longTokenStatus = write('src/blob.js', LONG_TOKEN);
const elapsed = Date.now() - startedAt;

ok(longTokenStatus === ALLOWED, 'a long unbroken token carries no secret and is allowed');
ok(elapsed < 2000, `a long unbroken token is scanned in linear time (took ${elapsed}ms)`);

done();
