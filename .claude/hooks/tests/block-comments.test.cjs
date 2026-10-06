'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');
const {
  javaComments,
  jsComments,
  yamlComments,
  shellComments,
  addedCommentLines,
  isGated,
  lexerFor,
} = require('../_comment-lexers.cjs');

const HOOK = path.join(__dirname, '..', 'block-comments.cjs');
const CHECK = path.join(__dirname, '..', '..', '..', 'scripts', 'check-added-comments.cjs');

let passed = 0,
  failed = 0;
function ok(cond, msg) {
  if (cond) passed++;
  else {
    failed++;
    console.error(`  FAIL: ${msg}`);
  }
}

function same(actual, expected, msg) {
  ok(JSON.stringify(actual) === JSON.stringify(expected), `${msg} (got ${JSON.stringify(actual)})`);
}

same(javaComments('int a = 1; // trailing'), [1], 'java: a line comment is found');
same(javaComments('/** doc */\nclass A {}'), [1], 'java: a javadoc line is found');
same(javaComments('/*\n a\n */\nint x;'), [1, 2, 3], 'java: every line a block comment touches is found');
same(javaComments('int a;\nint b; /* c */ int d;\nint e;'), [2], 'java: a block comment closed on its own line marks that line only');
same(javaComments('String u = "https://a/b"; int c = 1;'), [], 'java: a URL inside a string is not a comment');
same(javaComments('String s = "a \\" // b"; int x;'), [], 'java: an escaped quote keeps a string open');
same(javaComments('String t = """\n  // inside a text block\n  """;'), [], 'java: slashes inside a text block are not a comment');
same(javaComments('String t = """\n  x \\""" // still inside\n  """;'), [], 'java: an escaped triple quote does not end a text block');
same(javaComments("char q = '\"'; // after a quote literal"), [1], 'java: a comment after a char literal holding a quote is found');
same(javaComments("char q = '\\''; int d = a / b;"), [], 'java: an escaped single quote and a division are not comments');

same(jsComments('const a = 1; // why'), [1], 'js: a line comment is found');
same(jsComments('/*\n doc\n */\nconst a = 1;'), [1, 2, 3], 'js: every line of a block comment is found');
same(jsComments('#!/usr/bin/env node\nconst a = 1;'), [], 'js: a bare shebang is not a comment');
same(jsComments('#!/usr/bin/env node\nconst a = 1; // why'), [2], 'js: a comment below a shebang is still found');
same(jsComments('const re = /a\\/\\/b/;'), [], 'js: slashes inside a regex literal are not a comment');
same(jsComments("const p = String(f).replace(/\\\\/g, '/');"), [], 'js: a regex of escaped backslashes followed by a string is not a comment');
same(jsComments('const s = `a // b`;'), [], 'js: slashes inside a template literal are not a comment');
same(jsComments('const s = `${x} // y`;'), [], 'js: slashes after an interpolation are still template text');
same(jsComments('const s = `${ { a: 1 }.a } // y`;'), [], 'js: a braced object inside an interpolation does not end the template early');
same(jsComments('const d = a / b; const e = c / d;'), [], 'js: division is not a comment');
same(jsComments('function f(s) { return /x/.test(s); }'), [], 'js: a regex after return is not division');
same(jsComments('const u = "https://x/y";'), [], 'js: a URL inside a string is not a comment');

same(yamlComments('key: value # trailing'), [1], 'yaml: a trailing comment is found');
same(yamlComments('# leading\nkey: value'), [1], 'yaml: a leading comment is found');
same(yamlComments('url: "http://x#y"'), [], 'yaml: a hash inside a quoted scalar is not a comment');
same(yamlComments("name: 'a # b'"), [], 'yaml: a hash inside a single-quoted scalar is not a comment');
same(yamlComments('ref: ${{ github.base_ref }}'), [], 'yaml: an actions expression is not a comment');
same(yamlComments('script: |\n  # payload, not code\n  x\n'), [], 'yaml: a non-run block scalar is data');
same(yamlComments('run: |\n  echo hi # why\n'), [2], 'yaml: a run block is lexed as shell');
same(yamlComments('  run: |\n    echo hi\n  name: x # trailing\n'), [3], 'yaml: a run block ends at the dedent');
same(yamlComments("run: |\n  cat > x.sh <<'S'\n  # real code\n  S\n"), [3], 'yaml: a heredoc writing a script inside a run block is lexed');
same(yamlComments('run: |\n  cat > x.conf <<EOF\n  # payload\n  EOF\n'), [], 'yaml: a heredoc writing config inside a run block is data');
same(yamlComments('{{- if .Values.x }}\nkey: v\n{{- end }}'), [], 'yaml: a go-template conditional is not a comment');

same(shellComments('#!/usr/bin/env bash\nset -e'), [], 'shell: a bare shebang is not a comment');
same(shellComments('#!/usr/bin/env bash\nset -e # why'), [2], 'shell: a trailing comment is found');
same(shellComments("echo 'a # b'"), [], 'shell: a hash inside single quotes is not a comment');
same(shellComments('echo "a # b"'), [], 'shell: a hash inside double quotes is not a comment');
same(shellComments('echo "${#list[@]}"'), [], 'shell: a parameter expansion is not a comment');
same(shellComments('echo $#'), [], 'shell: the argument count is not a comment');
same(shellComments('cat > x.conf <<EOF\n# payload\nEOF\n'), [], 'shell: a data heredoc is not lexed');
same(shellComments("cat > x.sh <<'S'\n# real code\nS\n"), [2], 'shell: a heredoc writing a shell script is lexed');
same(shellComments("cat > x.sh <<'S'\n#!/bin/bash\nS\n"), [], "shell: a script heredoc's own shebang is permitted");
same(shellComments('cat > "$DIR/x.sh" <<FETCH\n# real code\nFETCH\n'), [2], 'shell: a quoted script path still selects the shell lexer');


same(addedCommentLines('// keep\nint a;', '// keep\nint b;', 'backend/src/main/java/A.java'), [], 'a re-included comment is not an addition');
same(addedCommentLines('  // keep\nint a;', '// keep\nint a;', 'backend/src/main/java/A.java'), [], 'a re-indented comment is not an addition');
same(addedCommentLines('int a;', 'int a; // why', 'backend/src/main/java/A.java').map((l) => l.line), [1], 'a new trailing comment is an addition');
same(addedCommentLines('', '/**\n * doc\n */\nclass A {}', 'backend/src/main/java/A.java').map((l) => l.line), [1, 2, 3], 'every line of a new javadoc is an addition');
same(addedCommentLines('a: 1\n', 'a: 1\n# new\n', '.github/workflows/ci.yml').map((l) => l.line), [2], 'a comment added to a workflow is an addition');
same(addedCommentLines('# keep\na: 1\n', '# keep\na: 2\n', '.github/workflows/ci.yml'), [], "a workflow's existing comment is not an addition");
same(addedCommentLines('set -e\n', 'set -e # why\n', 'scripts/deploy.sh').map((l) => l.line), [1], 'a comment added to a script is an addition');
same(addedCommentLines('a: 1\n', 'a: 1\n# new\n', 'src/main/resources/application.yml'), [], 'an ungated path yields no additions');

ok(isGated('backend/src/main/java/com/practice/app/x/A.java'), 'backend/src/main/java is gated');
ok(isGated('backend/src/test/java/com/practice/app/x/ATest.java'), 'backend/src/test/java is gated');
ok(isGated('C:\\repo\\backend\\src\\test\\java\\ATest.java'), 'a backslash path is gated');
ok(isGated('C:\\repo\\frontend\\src\\App.jsx'), 'a backslash frontend path is gated');
ok(!isGated('src/main/java/A.java'), 'a java file outside backend/ is not gated');
ok(isGated('.claude/hooks/block-comments.cjs'), 'a hook is gated');
ok(isGated('.claude/hooks/tests/run-all.cjs'), 'a hook test is gated');
ok(isGated('scripts/validate-versions.sh'), 'a shell script is gated');
ok(isGated('scripts/check-added-comments.cjs'), 'a script in cjs is gated');
ok(isGated('.github/workflows/ci.yml'), 'a workflow is gated');

ok(!isGated('backend/src/main/resources/db/changelog/X.java'), 'src/main/resources is not gated');
ok(!isGated('backend/src/main/resources/application.yml'), 'application.yml is not gated');
ok(!isGated('backend/pom.xml'), 'the pom is not gated');
ok(!isGated('backend/.mvn/wrapper/MavenWrapperDownloader.java'), 'the vendored wrapper is not gated');
ok(!isGated('backend/mvnw') && !isGated('/repo/backend/mvnw.cmd'), 'the vendored wrapper scripts are not gated');

ok(lexerFor('.github/workflows/ci.yml') === yamlComments, 'a workflow routes to the yaml lexer');
ok(lexerFor('scripts/x.sh') === shellComments, 'a shell script routes to the shell lexer');
ok(lexerFor('.claude/hooks/x.cjs') === jsComments, 'a hook routes to the js lexer');
ok(lexerFor('backend/src/main/java/A.java') === javaComments, 'a java file routes to the java lexer');
ok(isGated('frontend/src/features/task/TaskList.jsx'), 'frontend/src jsx is gated');
ok(isGated('frontend/src/lib/apiClient.js'), 'frontend/src js is gated');
ok(!isGated('frontend/vite.config.js'), 'frontend config outside src is not gated');
ok(!isGated('frontend/node_modules/x/src/index.js'), 'a dependency under node_modules is not gated');
ok(!isGated('frontend/src/index.css'), 'a stylesheet is not gated');
ok(lexerFor('frontend/src/App.jsx') === jsComments, 'a frontend component routes to the js lexer');
same(addedCommentLines('', 'export const A = () => <div>{/* why */}</div>;', 'frontend/src/A.jsx').map((l) => l.line), [1], 'a jsx comment is an addition');
same(addedCommentLines('', 'export const A = () => <a href="https://x/y">x</a>;', 'frontend/src/A.jsx'), [], 'a url in a jsx attribute is not a comment');
ok(lexerFor('README.md') === null, 'an ungated path has no lexer');

function run(toolName, toolInput) {
  const payload = { tool_name: toolName, tool_input: toolInput };
  return spawnSync(process.execPath, [HOOK], { input: JSON.stringify(payload), encoding: 'utf8' }).status;
}

const gated = 'C:/repo/backend/src/main/java/com/practice/app/x/A.java';
ok(run('Write', { file_path: gated, content: 'class A {} // c' }) === 2, 'a Write adding a line comment under src/main/java is blocked');
ok(run('Write', { file_path: gated, content: 'class A {\n  /** doc */\n  void a() {}\n}' }) === 2, 'a Write adding javadoc is blocked');
ok(run('Write', { file_path: gated, content: 'class A { String u = "https://x/y"; }' }) === 0, 'a URL in a string is allowed');
ok(run('Write', { file_path: '/repo/backend/src/test/java/ATest.java', content: 'class ATest {} // c' }) === 2, 'a Write adding a comment under src/test/java is blocked');
ok(
  run('Edit', {
    file_path: '/repo/backend/src/test/java/TenantServiceTest.java',
    old_string: 'void renewLease() {}',
    new_string: 'void renewLease_LeavesTheSupersededTenantActive() {}',
  }) === 0,
  'a relocation edit that only renames a test is allowed'
);
ok(run('Write', { file_path: '/repo/backend/.mvn/wrapper/MavenWrapperDownloader.java', content: '// vendored' }) === 0, 'a vendored Java file is not gated');
ok(run('Write', { file_path: '/repo/frontend/src/App.jsx', content: 'export const App = () => null; // why' }) === 2, 'a Write adding a comment to a frontend component is blocked');
ok(run('Write', { file_path: '/repo/frontend/src/App.jsx', content: 'export const App = () => null;' }) === 0, 'a Write of a frontend component without comments is allowed');
ok(run('Write', { file_path: '/repo/.claude/hooks/x.cjs', content: '// c' }) === 2, 'a Write adding a comment to a hook is blocked');
ok(run('Write', { file_path: '/repo/.github/workflows/ci.yml', content: 'on: push\n# why\n' }) === 2, 'a Write adding a comment to a workflow is blocked');
ok(run('Write', { file_path: '/repo/scripts/deploy.sh', content: '#!/usr/bin/env bash\nset -e\n' }) === 0, 'a Write of a script with only a shebang is allowed');
ok(run('Write', { file_path: '/repo/scripts/deploy.sh', content: '#!/usr/bin/env bash\nset -e # why\n' }) === 2, 'a Write adding a comment to a script is blocked');
ok(run('Write', { file_path: '/repo/backend/src/main/resources/application.yml', content: 'a: 1\n# why\n' }) === 0, 'a Write adding a comment to resources is allowed');
ok(run('Write', { file_path: gated, content: '' }) === 0, 'empty content is allowed');
ok(run('Edit', { file_path: gated, old_string: '// keep\nint a;', new_string: '// keep\nint b;' }) === 0, 'an Edit that re-includes an existing comment is allowed');
ok(run('Edit', { file_path: gated, old_string: 'int a;', new_string: 'int a; // why' }) === 2, 'an Edit adding a comment is blocked');

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'practice-block-comments-'));
try {
  const onDisk = path.join(tmp, 'backend', 'src', 'main', 'java', 'B.java');
  fs.mkdirSync(path.dirname(onDisk), { recursive: true });
  fs.writeFileSync(onDisk, '// old\nclass B {}\n');
  ok(run('Write', { file_path: onDisk, content: '// old\nclass B {\n  int x;\n}\n' }) === 0, "a Write keeping the file's existing comment is allowed");
  ok(run('Write', { file_path: onDisk, content: '// old\n// new\nclass B {}\n' }) === 2, 'a Write adding a comment to an existing file is blocked');

  const repo = path.join(tmp, 'repo');
  const javaDir = path.join(repo, 'backend', 'src', 'main', 'java');
  const javaFile = (name) => path.join(javaDir, name);
  fs.mkdirSync(javaDir, { recursive: true });
  const git = (...args) =>
    spawnSync('git', ['-c', 'user.name=t', '-c', 'user.email=t@t', ...args], { cwd: repo, encoding: 'utf8' });
  const check = (ref = 'HEAD') => spawnSync(process.execPath, [CHECK, ref], { cwd: repo, encoding: 'utf8' });
  git('init', '-q');
  fs.writeFileSync(javaFile('A.java'), '// base\nclass A {}\n');
  git('add', '.');
  git('commit', '-q', '-m', 'base');

  fs.writeFileSync(javaFile('A.java'), '// base\nclass A {\n  int x; // new\n}\n');
  let r = check();
  ok(r.status === 1 && r.stdout.includes('A.java:3'), 'the CI check fails on a comment line added since the base');

  fs.writeFileSync(javaFile('A.java'), '// base\nclass A {\n  int x;\n}\n');
  r = check();
  ok(r.status === 0, 'the CI check passes when only code changed');

  fs.writeFileSync(javaFile('A.java'), '// base\nclass A {}\n');
  git('mv', path.join('backend', 'src', 'main', 'java', 'A.java'), path.join('backend', 'src', 'main', 'java', 'B.java'));
  r = check();
  ok(r.status === 0, 'a renamed file keeps its existing comment without failing the check');

  fs.writeFileSync(javaFile('C.java'), 'class C {} /* new */\n');
  git('add', '.');
  r = check();
  ok(r.status === 1 && r.stdout.includes('C.java:1'), 'a new file with a comment fails the check');

  git('commit', '-q', '-m', 'snapshot');
  const trunk = git('rev-parse', '--abbrev-ref', 'HEAD').stdout.trim();
  fs.writeFileSync(javaFile('D.java'), '// doomed\nclass D {}\n');
  git('add', '.');
  git('commit', '-q', '-m', 'trunk adds D');
  git('checkout', '-q', '-b', 'feature');
  fs.writeFileSync(javaFile('B.java'), '// base\nclass B {\n  int y;\n}\n');
  git('add', '.');
  git('commit', '-q', '-m', 'feature changes code only');
  git('checkout', '-q', trunk);
  fs.writeFileSync(javaFile('D.java'), 'class D {}\n');
  git('add', '.');
  git('commit', '-q', '-m', 'trunk sweeps the comment out of D');
  git('checkout', '-q', 'feature');
  r = check(trunk);
  ok(r.status === 0, 'a comment the base deleted after the branch was cut is not counted as an addition');

  fs.writeFileSync(javaFile('B.java'), '// base\nclass B {\n  int y; // late\n}\n');
  r = check(trunk);
  ok(r.status === 1 && r.stdout.includes('B.java:3') && !r.stdout.includes('D.java'), 'a comment the branch adds is reported against the moved base, and only that one');
  git('checkout', '-q', '--', path.join('backend', 'src', 'main', 'java', 'B.java'));

  const testDir = path.join(repo, 'backend', 'src', 'test', 'java');
  fs.mkdirSync(testDir, { recursive: true });
  fs.writeFileSync(path.join(testDir, 'BTest.java'), '// Given\nclass BTest {}\n');
  git('add', '.');
  r = check(trunk);
  ok(r.status === 1 && r.stdout.includes('BTest.java:1'), 'a comment added under src/test/java fails the check');
  fs.rmSync(path.join(testDir, 'BTest.java'));

  const workflowDir = path.join(repo, '.github', 'workflows');
  fs.mkdirSync(workflowDir, { recursive: true });
  fs.writeFileSync(path.join(workflowDir, 'ci.yml'), 'on: push\njobs:\n  a:\n    runs-on: x\n');
  git('add', '.');
  r = check(trunk);
  ok(r.status === 0, 'a workflow added without comments passes the check');

  fs.writeFileSync(path.join(workflowDir, 'ci.yml'), 'on: push\n# why\njobs:\n  a:\n    runs-on: x\n');
  git('add', '.');
  r = check(trunk);
  ok(r.status === 1 && r.stdout.includes('ci.yml:2'), 'a comment added to a workflow fails the check');
  git('rm', '-q', '-r', '--cached', path.join('.github'));
  fs.rmSync(path.join(repo, '.github'), { recursive: true, force: true });

  const resourceDir = path.join(repo, 'backend', 'src', 'main', 'resources');
  fs.mkdirSync(resourceDir, { recursive: true });
  fs.writeFileSync(path.join(resourceDir, 'application.yml'), 'a: 1\n# tuning note\n');
  git('add', '.');
  r = check(trunk);
  ok(r.status === 0, 'a comment added under src/main/resources does not fail the check');

  git('checkout', '-q', '--orphan', 'unrelated');
  git('commit', '-q', '-m', 'no shared history');
  r = check(trunk);
  ok(r.status === 2 && r.stderr.includes('merge-base'), 'an unresolvable merge-base fails loudly instead of passing');
} finally {
  fs.rmSync(tmp, { recursive: true, force: true });
}

console.log(`\nblock-comments: ${passed} passed, ${failed} failed`);
process.exit(failed === 0 ? 0 : 1);
