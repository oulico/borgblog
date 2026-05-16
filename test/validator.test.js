import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { validate } from '../src/lib/validator.js';

describe('validator', () => {
  const validEvent = {
    timestamp: '2026-05-11T09:42:00+09:00',
    type: 'tool_call',
    session_id: 'ses_c83a1f2b',
    agent_name: 'pdf-generator-v2',
    user_input: 'Generate PDF',
    error_message: 'ENOENT',
    tool_name: 'bash',
    tool_args: { command: 'node pdf-generate.js' },
    tool_result: { error: 'ENOENT' },
    agent_state: {},
    context: {},
  };

  it('passes a valid event', () => {
    const result = validate(validEvent);
    assert.ok(result.valid);
    assert.equal(result.errors.length, 0);
  });

  it('fails on missing required fields', () => {
    const result = validate({});
    assert.ok(!result.valid);
    assert.ok(result.errors.some(e => e.includes('timestamp')));
    assert.ok(result.errors.some(e => e.includes('type')));
  });

  it('fails on invalid timestamp', () => {
    const result = validate({ ...validEvent, timestamp: 'not-a-date' });
    assert.ok(!result.valid);
    assert.ok(result.errors.some(e => e.includes('timestamp')));
  });

  it('fails on invalid session_id', () => {
    const result = validate({ ...validEvent, session_id: 'bad-format' });
    assert.ok(!result.valid);
    assert.ok(result.errors.some(e => e.includes('session_id')));
  });

  it('passes with null optional fields', () => {
    const result = validate({ ...validEvent, tool_name: null, tool_args: null, tool_result: null });
    assert.ok(result.valid);
  });

  it('fails on wrong field type', () => {
    const result = validate({ ...validEvent, tool_args: 'not-an-object' });
    assert.ok(!result.valid);
    assert.ok(result.errors.some(e => e.includes('tool_args')));
  });
});
