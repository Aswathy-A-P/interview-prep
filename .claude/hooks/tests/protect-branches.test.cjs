'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');

const { BLOCKED, ALLOWED, runHook, createSuite } = require('./_assert.cjs');

const suite = createSuite('protect-branches');
const { ok } = suite;

const REGISTER_KEY = 'Protected Branches';

function registerLine(...branches) {
  return `- **${REGISTER_KEY}**: ` + branches.map((branch) => `\`${branch}\``).join(', ');
}

function unfilledRegisterLine() {
  return `- **${REGISTER_KEY}**: <comma-separated list>`;
}

function git(args, cwd) {
  execFileSync('git', args, { cwd, encoding: 'utf8', stdio: 'pipe' });
}

function writeRegister(dir, line) {
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'CLAUDE.md'), ['## Project-specific', '', line, ''].join('\n'));
  return dir;
}

function bash(command, cwd, registerDir, env) {
  return runHook(
    'protect-branches.cjs',
    { tool_name: 'Bash', cwd, tool_input: { command } },
    { CLAUDE_PROJECT_DIR: registerDir, ...env }
  );
}

function main(root) {
  const repo = path.join(root, 'repo');
  const worktree = path.join(root, 'feature-worktree');
  fs.mkdirSync(repo, { recursive: true });

  git(['init', '-b', 'main'], repo);
  git(['-c', 'user.email=t@t', '-c', 'user.name=t', 'commit', '--allow-empty', '-m', 'init'], repo);
  git(['branch', 'develop'], repo);
  git(['branch', 'release'], repo);
  git(['worktree', 'add', '-b', 'feat/x', worktree, 'HEAD'], repo);

  const register = writeRegister(path.join(root, 'register'), registerLine('main', 'master', 'develop'));

  ok(bash('git commit -m x', repo, register) === BLOCKED, 'a commit on main is blocked');
  ok(bash('git merge feat/x', repo, register) === BLOCKED, 'a merge on main is blocked');
  ok(bash('git rebase feat/x', repo, register) === BLOCKED, 'a rebase on main is blocked');
  ok(bash('git reset --hard HEAD', repo, register) === BLOCKED, 'a hard reset on main is blocked');
  ok(bash('git reset HEAD~1 --hard', repo, register) === BLOCKED, 'a hard reset with the flag after the commit is blocked');
  ok(bash('git reset --quiet HEAD~1 --hard', repo, register) === BLOCKED, 'a hard reset with an option before the commit is blocked');
  ok(bash('git revert HEAD', repo, register) === BLOCKED, 'a revert on main is blocked');
  ok(bash('git cherry-pick feat/x', repo, register) === BLOCKED, 'a cherry-pick on main is blocked');
  ok(bash('git -c core.hooksPath=/x commit -m x', repo, register) === BLOCKED, 'a commit behind git -c is blocked');
  ok(bash('git -c "core.hooksPath=/x" commit -m x', repo, register) === BLOCKED, 'a commit behind a quoted git -c value is blocked');
  ok(bash(`git -C "${repo}" commit -m x`, worktree, register) === BLOCKED, 'a commit sent to main by git -C is blocked');
  ok(bash(`git -C "${worktree}" status && git commit -m x`, repo, register) === BLOCKED, 'an earlier git -C does not relocate a later commit');
  ok(bash(`(cd "${worktree}" && git status) && git commit -m x`, repo, register) === BLOCKED, 'a cd inside a subshell ends at the closing bracket');
  ok(bash(`(cd "${worktree}" && git status) ; git rebase main`, repo, register) === BLOCKED, 'a rebase after a closed subshell cd is blocked');
  ok(bash(`cd "${worktree}" & git commit -m x`, repo, register) === BLOCKED, 'a backgrounded cd leaves the commit in the current directory');
  ok(bash(`cd "${worktree}" & cd "${worktree}" & git commit -m x`, repo, register) === BLOCKED, 'two backgrounded cds leave the commit in the current directory');
  ok(bash('git \\\n  commit -m x', repo, register) === BLOCKED, 'a commit split over a backslash line continuation is blocked');
  ok(bash(`cd "${worktree}" \\\n  && cd "${repo}" && git commit -m x`, worktree, register) === BLOCKED, 'a cd chain split over a line continuation is read');
  ok(bash('git switch \\\n  main && git commit -m x', worktree, register) === BLOCKED, 'a switch split over a line continuation is read');

  ok(bash('git am patch.mbox', repo, register) === BLOCKED, 'applying a patch on main is blocked');
  ok(bash('git am --3way patch.mbox', repo, register) === BLOCKED, 'a three-way patch application on main is blocked');
  ok(bash('git am --continue', repo, register) === BLOCKED, 'continuing a patch application on main is blocked');
  ok(bash('git am --abort', repo, register) === ALLOWED, 'aborting a patch application on main is allowed');
  ok(bash('git am --quit', repo, register) === ALLOWED, 'quitting a patch application on main is allowed');
  ok(bash('git ambiguous-subcommand', repo, register) === ALLOWED, 'a subcommand that merely starts with am is allowed');
  ok(bash('git status', repo, register) === ALLOWED, 'git status on main is allowed');
  ok(bash('git log --oneline', repo, register) === ALLOWED, 'git log on main is allowed');
  ok(bash(`git -C "${worktree}" status`, repo, register) === ALLOWED, 'git -C status on a worktree is allowed');
  ok(bash('git merge-base main HEAD', repo, register) === ALLOWED, 'git merge-base on main is allowed');
  ok(bash('git rebase-todo-nonsense', repo, register) === ALLOWED, 'a subcommand that merely starts with a git op is allowed');
  ok(bash('git reset-x --hard HEAD', repo, register) === ALLOWED, 'a subcommand that merely starts with reset is allowed');
  ok(bash('git reset --soft HEAD~1', repo, register) === ALLOWED, 'a soft reset on main is allowed');
  ok(bash('git reset HEAD~1 --hardly', repo, register) === ALLOWED, 'a flag that merely starts with --hard is allowed');
  ok(bash('git cherry-picker --list', repo, register) === ALLOWED, 'a subcommand that merely starts with cherry-pick is allowed');
  ok(bash('git merge --abort', repo, register) === ALLOWED, 'aborting a merge on main is allowed');
  ok(bash('git rebase --abort', repo, register) === ALLOWED, 'aborting a rebase on main is allowed');
  ok(bash('git rebase --quit', repo, register) === ALLOWED, 'quitting a rebase on main is allowed');
  ok(bash('git cherry-pick --abort', repo, register) === ALLOWED, 'aborting a cherry-pick on main is allowed');
  ok(bash('git revert --abort', repo, register) === ALLOWED, 'aborting a revert on main is allowed');
  ok(bash('git rebase --continue', repo, register) === BLOCKED, 'continuing a rebase on main is blocked');
  ok(bash('git merge --abort && git merge feat/x', repo, register) === BLOCKED, 'a merge after an abort is blocked');
  ok(bash('git commit -m "then git merge --abort"', repo, register) === BLOCKED, 'a message naming an abort is blocked');

  ok(bash(`cd "${worktree}" && git commit -m x`, repo, register) === ALLOWED, 'a commit after cd to a worktree is allowed');
  ok(bash(`{ cd "${repo}"; git commit -m x; }`, worktree, register) === BLOCKED, 'a cd to main inside a brace group is read');
  ok(bash(`{ cd "${worktree}" && git commit -m x; }`, repo, register) === ALLOWED, 'a cd to a worktree inside a brace group is read');
  ok(bash(`cd "${worktree}" ; git commit -m x`, repo, register) === ALLOWED, 'a commit after a semicolon-separated cd is allowed');
  ok(bash(`cd "${worktree}" && git rebase main`, repo, register) === ALLOWED, 'a rebase after cd to a worktree is allowed');
  ok(bash(`cd "${worktree}" && git revert HEAD`, repo, register) === ALLOWED, 'a revert on a feature branch is allowed');
  ok(bash(`cd "${worktree}" && git cherry-pick main`, repo, register) === ALLOWED, 'a cherry-pick on a feature branch is allowed');
  ok(bash(`(cd "${worktree}" && git commit -m x)`, repo, register) === ALLOWED, 'a commit inside a subshell cd is allowed');
  ok(bash(`cd "${worktree}" && git status & git commit -m x`, worktree, register) === ALLOWED, 'a backgrounded segment does not relocate a later commit');
  ok(bash('git \\\n  commit -m x', worktree, register) === ALLOWED, 'a continued commit on a feature branch is allowed');
  ok(bash(`git -C "${worktree}" commit -m x`, repo, register) === ALLOWED, 'a commit sent to a worktree by git -C is allowed');
  ok(bash('git commit -m x', worktree, register) === ALLOWED, 'a commit with the cwd already on a feature branch is allowed');

  ok(bash(`pushd "${repo}" && git commit -m x`, worktree, register) === BLOCKED, 'a pushd to main is followed');
  ok(bash(`cd -P "${repo}" && git commit -m x`, worktree, register) === BLOCKED, 'a cd -P to main is followed');
  ok(bash(`cd -L "${repo}" && git commit -m x`, worktree, register) === BLOCKED, 'a cd -L to main is followed');
  ok(bash(`cd -- "${repo}" && git commit -m x`, worktree, register) === BLOCKED, 'a cd -- to main is followed');
  ok(bash(`cd -P -- "${repo}" && git commit -m x`, worktree, register) === BLOCKED, 'a cd with an option and -- is followed');
  ok(bash(`pushd -P "${repo}" && git commit -m x`, worktree, register) === BLOCKED, 'a pushd with an option is followed');
  ok(bash(`pushd "${worktree}" && git commit -m x`, repo, register) === ALLOWED, 'a pushd to a worktree is followed');
  ok(bash(`cd -P "${worktree}" && git commit -m x`, repo, register) === ALLOWED, 'a cd -P to a worktree is followed');
  ok(bash(`cd -- "${worktree}" && git commit -m x`, repo, register) === ALLOWED, 'a cd -- to a worktree is followed');

  ok(bash(`git --git-dir="${repo}/.git" --work-tree="${repo}" commit -m x`, worktree, register) === BLOCKED, 'a commit sent to main by --git-dir and --work-tree is blocked');
  ok(bash(`git --git-dir "${repo}/.git" --work-tree "${repo}" commit -m x`, worktree, register) === BLOCKED, 'the spaced spelling of --git-dir and --work-tree is read');
  ok(bash(`git --work-tree="${repo}" commit -m x`, worktree, register) === BLOCKED, 'a commit sent to main by --work-tree alone is blocked');
  ok(bash(`git --git-dir="${repo}/.git" commit -m x`, worktree, register) === BLOCKED, 'a commit sent to main by --git-dir alone is blocked');
  ok(bash(`git --git-dir "${repo}/.git" commit -m x`, worktree, register) === BLOCKED, 'the spaced spelling of --git-dir alone is read');
  ok(bash(`git -C "${worktree}" --git-dir="${repo}/.git" commit -m x`, worktree, register) === BLOCKED, 'a --git-dir beside a -C still names the repository');
  ok(bash(`git --git-dir="${worktree}/.git" --work-tree="${worktree}" commit -m x`, repo, register) === ALLOWED, 'a commit sent to a worktree by --git-dir and --work-tree is allowed');
  ok(bash(`git --work-tree="${worktree}" commit -m x`, repo, register) === ALLOWED, 'a commit sent to a worktree by --work-tree alone is allowed');
  ok(bash(`git --git-dir "${worktree}/.git" --work-tree "${worktree}" commit -m x`, repo, register) === ALLOWED, 'the spaced spelling pointing at a worktree is allowed');
  ok(bash(`git --git-dir="${worktree}/.git" status && git commit -m x`, repo, register) === BLOCKED, 'an earlier --git-dir does not relocate a later commit');

  const atHome = { HOME: root };
  ok(bash('cd ~/repo && git commit -m x', worktree, register, atHome) === BLOCKED, 'a commit after cd to a tilde path on main is blocked');
  ok(bash('cd $HOME/repo && git commit -m x', worktree, register, atHome) === BLOCKED, 'a commit after cd to a $HOME path on main is blocked');
  ok(bash('git -C ~/repo commit -m x', worktree, register, atHome) === BLOCKED, 'a commit sent to a tilde path by git -C is blocked');
  ok(bash('cd ~ && git commit -m x', repo, register, atHome) === BLOCKED, 'a commit after cd to a directory holding no branch falls back to the cwd branch');
  ok(bash('cd /no/such/directory && git commit -m x', repo, register) === BLOCKED, 'a commit after cd to a directory that does not resolve is blocked');
  ok(bash('cd $(mktemp -d) && git commit -m x', repo, register) === BLOCKED, 'a commit after cd to an unparseable target is blocked');
  ok(bash('cd ~/feature-worktree && git commit -m x', repo, register, atHome) === ALLOWED, 'a commit after cd to a tilde path on a feature branch is allowed');
  ok(bash('git -C ~/feature-worktree commit -m x', repo, register, atHome) === ALLOWED, 'a commit sent to a tilde worktree path by git -C is allowed');
  ok(bash('cd ${HOME}/repo && git commit -m x', worktree, register, atHome) === BLOCKED, 'a commit after cd to a braced home path on main is blocked');
  ok(bash('cd ${HOME}/feature-worktree && git commit -m x', repo, register, atHome) === ALLOWED, 'a commit after cd to a braced home path on a feature branch is allowed');
  ok(bash('git -C ${HOME}/feature-worktree commit -m x', repo, register, atHome) === ALLOWED, 'a commit sent to a braced home worktree path by git -C is allowed');

  git(['switch', 'develop'], repo);
  ok(bash('git commit -m x', repo, register) === BLOCKED, 'a commit on develop is blocked');
  ok(bash('git merge feat/x', repo, register) === BLOCKED, 'a merge on develop is blocked');
  ok(bash('git status', repo, register) === ALLOWED, 'git status on develop is allowed');

  ok(bash('git switch main && git commit -m x', worktree, register) === BLOCKED, 'a commit after switching to main is blocked');
  ok(bash('git checkout develop && git commit -m x', worktree, register) === BLOCKED, 'a commit after checking out develop is blocked');
  ok(bash('git switch "main" ; git rebase feat/x', worktree, register) === BLOCKED, 'a rebase after switching to a quoted main is blocked');
  ok(bash('git switch feat/x && git commit -m x', repo, register) === ALLOWED, 'a commit after switching to a feature branch is allowed');
  ok(bash('git checkout README.md && git commit -m x', repo, register) === BLOCKED, 'a checkout of a path leaves the branch as it was');
  ok(bash('git switch no-such-branch && git commit -m x', repo, register) === BLOCKED, 'a switch to a branch that does not exist leaves the branch as it was');

  const clone = path.join(root, 'clone');
  git(['clone', '--quiet', '--branch', 'develop', repo, clone], root);
  git(['switch', '-c', 'feat/y'], clone);
  ok(bash('git switch main && git commit -m x', clone, register) === BLOCKED, 'a switch to a protected branch that has no local ref yet is blocked');
  ok(bash('git switch feat/y && git commit -m x', clone, register) === ALLOWED, 'a switch to a feature branch in a fresh clone is allowed');

  ok(bash('git commit -m a && git switch main && git merge feat/x', worktree, register) === BLOCKED, 'a merge on main after an allowed commit is blocked');
  ok(bash('git commit -m a && git switch main && git commit -m b', worktree, register) === BLOCKED, 'a second commit on main after an allowed commit is blocked');
  ok(bash('git commit -m a ; git switch develop ; git rebase feat/x', worktree, register) === BLOCKED, 'a rebase on develop after an allowed commit is blocked');
  ok(bash(`git commit -m a && git -C "${repo}" commit -m b`, worktree, register) === BLOCKED, 'a later commit relocated to main by git -C is blocked');
  ok(bash(`git commit -m a && git --work-tree="${repo}" commit -m b`, worktree, register) === BLOCKED, 'a later commit relocated to main by --work-tree is blocked');
  ok(bash(`cd "${repo}" && git status && git commit -m x`, worktree, register) === BLOCKED, 'a commit two segments after a cd to main is blocked');
  ok(bash('git commit -m a && git commit -m b', worktree, register) === ALLOWED, 'two commits on a feature branch are allowed');
  ok(bash(`git commit -m a && git -C "${worktree}" commit -m b`, worktree, register) === ALLOWED, 'two commits sent to a worktree are allowed');
  ok(bash('git merge --abort && git switch feat/x && git commit -m x', repo, register) === ALLOWED, 'a commit after an abort and a switch to a feature branch is allowed');

  const fromProtected = path.join(root, 'previous-protected');
  git(['init', '-b', 'main', fromProtected], root);
  git(['-c', 'user.email=t@t', '-c', 'user.name=t', 'commit', '--allow-empty', '-m', 'init'], fromProtected);
  git(['switch', '-c', 'feat/z'], fromProtected);
  ok(bash('git commit -m x', fromProtected, register) === ALLOWED, 'a commit on the feature branch it switched to is allowed');
  ok(bash('git switch - && git commit -m x', fromProtected, register) === BLOCKED, 'a commit after switching back to main is blocked');
  ok(bash('git checkout - && git commit -m x', fromProtected, register) === BLOCKED, 'a commit after checking out the previous branch main is blocked');
  ok(bash('git switch @{-1} && git commit -m x', fromProtected, register) === BLOCKED, 'a commit after switching to @{-1} naming main is blocked');
  ok(bash('git switch - && git merge feat/z', fromProtected, register) === BLOCKED, 'a merge after switching back to main is blocked');

  const fromFeature = path.join(root, 'previous-feature');
  git(['init', '-b', 'main', fromFeature], root);
  git(['-c', 'user.email=t@t', '-c', 'user.name=t', 'commit', '--allow-empty', '-m', 'init'], fromFeature);
  git(['switch', '-c', 'feat/w'], fromFeature);
  git(['switch', 'main'], fromFeature);
  ok(bash('git commit -m x', fromFeature, register) === BLOCKED, 'a commit on main is blocked before any switch');
  ok(bash('git switch - && git commit -m x', fromFeature, register) === ALLOWED, 'a commit after switching back to a feature branch is allowed');
  ok(bash('git switch @{-1} && git commit -m x', fromFeature, register) === ALLOWED, 'a commit after switching to @{-1} naming a feature branch is allowed');

  ok(bash('git switch -c 178-slug && git commit -m x', repo, register) === ALLOWED, 'a commit after switch -c is allowed');
  ok(bash('git checkout -b 178-slug ; git commit -m x', repo, register) === ALLOWED, 'a commit after checkout -b is allowed');
  ok(bash("git switch -c '178 with spaces' && git commit -m x", repo, register) === ALLOWED, 'a quoted new branch name is allowed');
  ok(bash('git switch -c main && git commit -m x', repo, register) === BLOCKED, 'switch -c to a protected branch is still blocked');
  ok(bash('git checkout -b develop && git commit -m x', worktree, register) === BLOCKED, 'checkout -b to a protected branch is still blocked');
  ok(bash('git checkout -f main && git commit -m x', worktree, register) === BLOCKED, 'an option before the branch name does not hide the switch');
  ok(bash('git switch --discard-changes main && git commit -m x', worktree, register) === BLOCKED, 'a long option before the branch name does not hide the switch');
  ok(bash('git switch -C main && git commit -m x', repo, register) === BLOCKED, 'switch -C to a protected branch is blocked');
  ok(bash('git checkout -B develop && git commit -m x', repo, register) === BLOCKED, 'checkout -B to a protected branch is blocked');
  ok(bash('git switch --create main && git commit -m x', repo, register) === BLOCKED, 'switch --create to a protected branch is blocked');
  ok(bash('git switch --create=main && git commit -m x', repo, register) === BLOCKED, 'a branch name attached to --create is read');
  ok(bash('git checkout -f feat/x && git commit -m x', repo, register) === ALLOWED, 'an option before a feature branch name is allowed');
  ok(bash('git checkout -q -b 178-slug && git commit -m x', repo, register) === ALLOWED, 'an option before checkout -b is allowed');
  ok(bash('git switch -C 178-slug && git commit -m x', repo, register) === ALLOWED, 'a commit after switch -C is allowed');
  ok(bash('git switch --orphan 178-slug && git commit -m x', repo, register) === ALLOWED, 'a commit after switch --orphan is allowed');
  ok(bash('git checkout -- main && git commit -m x', worktree, register) === ALLOWED, 'a path after -- is not read as the landing branch');
  ok(bash('git checkout main -- README.md && git commit -m x', worktree, register) === ALLOWED, 'a path taken from main with -- is not read as a switch');
  ok(bash('git checkout main README.md && git commit -m x', worktree, register) === ALLOWED, 'a path taken from main without -- is not read as a switch');
  ok(bash('git checkout main && git commit -m x', worktree, register) === BLOCKED, 'a bare checkout of main is still read as a switch');
  ok(bash('git checkout -b 178-slug main && git commit -m x', repo, register) === ALLOWED, 'a start point after checkout -b is not read as the landing branch');

  ok(bash('(git switch main); git commit -m x', worktree, register) === BLOCKED, 'a closing bracket does not stick to the switched branch name');
  ok(bash('{ git switch main; }; git commit -m x', worktree, register) === BLOCKED, 'a closing brace does not stick to the switched branch name');
  ok(bash('git switch main; git commit -m x', worktree, register) === BLOCKED, 'a semicolon does not stick to the switched branch name');
  ok(bash('(git switch feat/x); git commit -m x', repo, register) === ALLOWED, 'a bracketed switch to a feature branch is allowed');

  ok(bash(`git switch feat/x && cd "${repo}" && git commit -m x`, worktree, register) === BLOCKED, 'a switch in one directory does not carry into another');
  ok(bash(`git switch -c 178-slug && cd "${repo}" && git commit -m x`, worktree, register) === BLOCKED, 'a branch created in one directory does not carry into another');
  ok(bash(`git switch main && cd "${worktree}" && git commit -m x`, repo, register) === ALLOWED, 'a switch to main in one directory does not follow the op into another');
  ok(bash(`cd "${repo}" && git switch feat/x && git commit -m x`, worktree, register) === ALLOWED, 'a switch read after the cd applies to the directory it lands in');

  git(['switch', 'main'], repo);
  ok(bash('grep -rn "git commit" .', repo, register) === ALLOWED, 'a search for a git op in quotes is allowed');
  ok(bash('echo "run git merge later"', repo, register) === ALLOWED, 'a git op echoed in quotes is allowed');
  ok(bash('gh pr comment 1 --body "then git rebase main"', repo, register) === ALLOWED, 'a git op named in quoted prose is allowed');
  ok(bash('bash -c "git commit -m x"', repo, register) === BLOCKED, 'a commit in a bash -c payload is blocked');
  ok(bash('git commit -m "git -C /tmp/x commit"', repo, register) === BLOCKED, 'a message containing git -C is blocked');
  ok(bash('git commit -m "a git -C <dir> relocates the op"', repo, register) === BLOCKED, 'prose mentioning git -C is blocked');
  ok(bash('git commit -m "git switch -c 178 fixes it"', repo, register) === BLOCKED, 'a message containing switch -c is blocked');
  ok(bash('git commit -m "git switch feat/x first"', repo, register) === BLOCKED, 'a message containing a plain switch is blocked');
  ok(bash('"git" commit -m x', repo, register) === BLOCKED, 'a quoted command name is still read as git');
  ok(bash('git "commit" -m x', repo, register) === BLOCKED, 'a quoted subcommand is still read');
  ok(bash('"git" "merge" feat/x', repo, register) === BLOCKED, 'a quoted git op is read word by word');
  ok(bash('grep -rn "commit" .', repo, register) === ALLOWED, 'a quoted word that is not a git op is allowed');

  const manyLongOptions = 'git ' + '--paginate '.repeat(40);
  const manyConfigOptions = 'git ' + '-c -x '.repeat(40);
  ok(bash(manyLongOptions + 'status', repo, register) === ALLOWED, 'a run of long git options is answered rather than explored forever');
  ok(bash(manyConfigOptions + 'status', repo, register) === ALLOWED, 'a run of git -c options whose values look like options is answered');
  ok(bash(manyLongOptions + 'commit -m x', repo, register) === BLOCKED, 'a commit behind a run of long git options is still blocked');
  ok(bash(manyConfigOptions + 'commit -m x', repo, register) === BLOCKED, 'a commit behind a run of git -c options is still blocked');

  ok(bash('bash -c "git commit -m \\"x\\""', repo, register) === BLOCKED, 'a commit behind an escaped quote inside a payload is blocked');
  ok(bash('echo "he said \\"git commit\\" once"', repo, register) === ALLOWED, 'an escaped quote does not spill quoted prose into the command');

  const lines = (...parts) => parts.join('\n');
  ok(bash(lines('cat > note.md <<EOF', 'Run git commit after review.', 'EOF'), repo, register) === ALLOWED, 'a note whose body names a git op is allowed');
  ok(bash(lines("cat > note.md <<'EOF'", 'Then git merge feat/x.', 'EOF'), repo, register) === ALLOWED, 'a quoted heredoc delimiter still marks the body as data');
  ok(bash(lines('cat > note.md <<-EOF', '\tgit rebase main first', '\tEOF'), repo, register) === ALLOWED, 'an indented heredoc body is data');
  ok(bash(lines('cat <<EOF > note.md', 'git commit -m x', 'EOF'), repo, register) === ALLOWED, 'a heredoc whose redirect follows the delimiter is data');
  ok(bash(lines('bash <<EOF', 'git commit -m x', 'EOF'), repo, register) === BLOCKED, 'a commit in a heredoc fed to a shell is blocked');
  ok(bash(lines('sudo bash <<EOF', 'git commit -m x', 'EOF'), repo, register) === BLOCKED, 'a commit in a heredoc fed to a shell behind a runner is blocked');
  ok(bash(lines('sh <<-EOF', '\tgit merge feat/x', '\tEOF'), repo, register) === BLOCKED, 'a merge in an indented heredoc fed to a shell is blocked');
  ok(bash(lines('cat > note.md <<EOF', 'notes', 'EOF', 'git commit -m x'), repo, register) === BLOCKED, 'a commit after a heredoc terminator is still read');

  const canary = path.join(root, 'branch-name-injection');
  ok(bash(`git switch "x$(touch ${canary})" && git commit -m y`, repo, register) === BLOCKED, 'a branch name carrying a command substitution does not decide the branch');
  ok(!fs.existsSync(canary), 'a branch name is never handed to a shell');

  git(['switch', 'release'], repo);
  ok(bash('git commit -m x', repo, register) === ALLOWED, 'a branch the register omits is not protected');

  const registerWithRelease = writeRegister(path.join(root, 'register-release'), registerLine('main', 'release'));
  ok(bash('git commit -m x', repo, registerWithRelease) === BLOCKED, 'a branch the register adds becomes protected');

  const unfilled = writeRegister(path.join(root, 'register-unfilled'), unfilledRegisterLine());
  ok(bash('git commit -m x', repo, unfilled) === ALLOWED, 'an unfilled register does not protect release');
  git(['switch', 'main'], repo);
  ok(bash('git commit -m x', repo, unfilled) === BLOCKED, 'an unfilled register falls back to protecting main');

  const empty = path.join(root, 'no-register');
  fs.mkdirSync(empty, { recursive: true });
  ok(bash('git commit -m x', repo, empty) === BLOCKED, 'a missing register falls back to protecting main');
}

const root = fs.mkdtempSync(path.join(os.tmpdir(), 'harness-hooktest-'));
try {
  main(root);
} catch (err) {
  suite.fail(`harness error - ${err.message}`);
} finally {
  fs.rmSync(root, { recursive: true, force: true });
}

suite.done();
