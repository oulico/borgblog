import { execSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { logError, logSuccess, logInfo, logWarn, ErrorCode } from '../lib/logger.js';

function gitAvailable() {
  try {
    execSync('git --version', { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

function isGitRepo() {
  try {
    execSync('git rev-parse --git-dir', { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

function hasStagedPosts() {
  try {
    const status = execSync('git status --porcelain _posts/', { encoding: 'utf-8' });
    return status.trim().length > 0;
  } catch {
    return false;
  }
}

export function run(options = {}) {
  if (!gitAvailable()) {
    logError(ErrorCode.E007);
    process.exit(1);
  }

  if (!isGitRepo()) {
    logError(ErrorCode.E008);
    process.exit(1);
  }

  if (!existsSync('_posts')) {
    logError(ErrorCode.E011);
    process.exit(1);
  }

  execSync('git add _posts/', { stdio: 'ignore' });

  if (!hasStagedPosts()) {
    logError(ErrorCode.E009);
    process.exit(1);
  }

  try {
    const diff = execSync('git diff --cached --name-only _posts/', { encoding: 'utf-8' }).trim();
    const files = diff.split('\n').filter(Boolean);
    const sessionIds = files.map(f => f.replace('_posts/', '').replace(/^\d{4}-\d{2}-\d{2}-/, '').replace('.md', ''));
    const message = `retro: ${sessionIds.join(', ')}`;

    execSync(`git commit -m "${message}"`, { stdio: 'inherit' });
    logSuccess(`Committed ${files.length} post(s)`);

    if (options.push) {
      try {
        execSync('git push', { stdio: 'inherit' });
        logSuccess('Pushed to remote');
      } catch (err) {
        logWarn(`Push failed: ${err.message}. Push manually: git push`);
      }
    } else {
      logInfo('Push manually: git push origin main');
    }
  } catch (err) {
    logError('E999', err.message);
    process.exit(1);
  }
}
