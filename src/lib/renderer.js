import { writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { render as buildMarkdown } from './template.js';
import { FailureTypeLabel } from './failure-schema.js';
import { logSuccess, logWarn, logError, ErrorCode } from './logger.js';

const POSTS_DIR = '_posts';

function ensurePostsDir(outputDir) {
  const dir = outputDir || '_posts';
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
    logWarn(`Created ${dir}/ directory`);
  }
  return dir;
}

function postFilename(timestamp, sessionId, outputDir) {
  const d = new Date(timestamp || Date.now());
  const pad = n => String(n).padStart(2, '0');
  const dateStr = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const slug = (sessionId || 'unknown').replace(/[^a-z0-9-]/gi, '-').toLowerCase();
  return join(ensurePostsDir(outputDir), `${dateStr}-${slug}.md`);
}

export function renderToFile(session, events = [], outputDir = null) {
  if (!session.session_hash) {
    const raw = JSON.stringify({ session_id: session.session_id, timestamp: session.timestamp });
    session.session_hash = createHash('sha256').update(raw).digest('hex');
  }

  const markdown = buildMarkdown(session, events);

  const filepath = postFilename(session.timestamp, session.session_id, outputDir);
  try {
    writeFileSync(filepath, markdown, 'utf-8');
  } catch (err) {
    logError(ErrorCode.E006, err.message);
    throw err;
  }

  logSuccess(`Generated ${filepath}`);
  return filepath;
}
