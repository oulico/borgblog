import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync, unlinkSync, mkdirSync, rmdirSync } from 'node:fs';
import { renderToFile } from '../src/lib/renderer.js';
import { FailureType, FailureEvent } from '../src/lib/failure-schema.js';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

describe('renderer', () => {
  const session = {
    failure_type: FailureType.PERMISSION_DENIED,
    user_input: 'Deploy to production',
    error_message: '403 Forbidden',
    session_id: 'ses_d92b3c11',
    agent_name: 'deploy-bot',
    timestamp: '2026-05-11T09:46:00+09:00',
    token_count: 1500,
    duration: '3s',
    redaction_stats: { total: 3, fields: 1, keys: 0, patterns: 2 },
    skills: ['failure-analysis', 'permission_denied'],
    classifier_confidence: 0.8,
    severity: 'high',
    session_hash: 'abc123',
    tool_result: null,
  };

  const events = [
    {
      timestamp: '2026-05-11T09:46:00+09:00',
      type: 'permission_denied',
      error_message: '403 Forbidden',
      user_input: 'Deploy to production',
    },
  ];

  before(() => {
    mkdirSync('_posts', { recursive: true });
  });

  after(() => {
    try { rmdirSync('_posts', { recursive: true }); } catch {}
  });

  it('creates output file', () => {
    const filepath = renderToFile(session, events);
    assert.ok(existsSync(filepath));
  });

  it('output has YAML frontmatter', () => {
    const filepath = renderToFile(session, events);
    const content = readFileSync(filepath, 'utf-8');
    assert.ok(content.startsWith('---'));
    assert.ok(content.includes('layout: post'));
  });

  it('has conclusion-first structure', () => {
    const filepath = renderToFile(session, events);
    const content = readFileSync(filepath, 'utf-8');
    const tldrIdx = content.indexOf('TL;DR');
    const rootCauseIdx = content.indexOf('Root Cause');
    assert.ok(tldrIdx < rootCauseIdx, 'TL;DR should come before Root Cause');
  });

  it('contains trust footer', () => {
    const filepath = renderToFile(session, events);
    const content = readFileSync(filepath, 'utf-8');
    assert.ok(content.includes('borgblog v0.1.0'));
    assert.ok(content.includes('Redacted:'));
    assert.ok(content.includes('sha256:'));
  });

  it('filename follows Jekyll convention', () => {
    const filepath = renderToFile(session, events);
    const match = filepath.match(/_posts\/(\d{4})-(\d{2})-(\d{2})-.+\.md$/);
    assert.ok(match, `Filename ${filepath} does not match YYYY-MM-DD-slug.md`);
  });
});
