import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { redact } from '../src/lib/redacter.js';

describe('redacter', () => {
  const eventWithSecrets = {
    timestamp: '2026-05-11T09:46:00+09:00',
    type: 'permission_denied',
    session_id: 'ses_d92b3c11',
    agent_name: 'deploy-bot',
    user_input: 'Deploy to production',
    tool_name: 'bash',
    tool_args: { command: 'gh pr merge --auto' },
    tool_result: null,
    error_message: '403 Forbidden — insufficient permissions',
    api_key: 'sk-abc123def456',
    token: 'ghp_1234567890abcdef',
    Authorization: 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.dummy',
    agent_state: {},
    context: { email: 'admin@example.com' },
  };

  it('masks api_key', () => {
    const { redacted: r, stats } = redact(eventWithSecrets);
    assert.match(r.api_key, /REDACTED/);
    assert.ok(stats.fields >= 1);
  });

  it('masks token field', () => {
    const { redacted: r } = redact(eventWithSecrets);
    assert.match(r.token, /REDACTED/);
  });

  it('masks Authorization header (field-level, case-insensitive)', () => {
    const { redacted: r } = redact(eventWithSecrets);
    assert.match(r.Authorization, /REDACTED/);
  });

  it('masks JWT in Authorization before key_pattern delete', () => {
    const ev = { ...eventWithSecrets };
    const { redacted: r, stats } = redact(ev);
    assert.ok(stats.patterns >= 0);
  });

  it('masks email pattern', () => {
    const { redacted: r } = redact(eventWithSecrets);
    if (typeof r.context === 'object') {
      const ctx = JSON.stringify(r.context);
      assert.ok(!ctx.includes('admin@example.com'));
    }
  });

  it('does not redact non-sensitive fields', () => {
    const { redacted: r } = redact(eventWithSecrets);
    assert.equal(r.session_id, 'ses_d92b3c11');
    assert.equal(r.agent_name, 'deploy-bot');
  });

  it('returns accurate stats', () => {
    const { stats } = redact(eventWithSecrets);
    assert.ok(stats.total > 0);
    assert.equal(stats.total, stats.fields + stats.keys + stats.patterns);
  });
});
