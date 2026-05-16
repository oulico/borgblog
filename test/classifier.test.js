import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { classify } from '../src/lib/classifier.js';
import { FailureType } from '../src/lib/failure-schema.js';

describe('classifier', () => {
  it('detects timeout', () => {
    const result = classify({ error_message: 'connection timed out after 30s' });
    assert.equal(result.type, FailureType.TIMEOUT);
    assert.ok(result.confidence > 0);
  });

  it('detects permission denied', () => {
    const result = classify({ error_message: '403 Forbidden — insufficient permissions' });
    assert.equal(result.type, FailureType.PERMISSION_DENIED);
  });

  it('detects tool loop', () => {
    const result = classify({
      error_message: 'retry limit exceeded',
      type: 'tool_call',
    });
    assert.equal(result.type, FailureType.TOOL_LOOP);
  });

  it('detects parse error', () => {
    const result = classify({ error_message: 'SyntaxError: Unexpected token at line 42' });
    assert.equal(result.type, FailureType.PARSE_ERROR);
  });

  it('returns UNKNOWN for no match', () => {
    const result = classify({ error_message: 'everything is fine' });
    assert.equal(result.type, FailureType.UNKNOWN);
    assert.equal(result.confidence, 0);
  });

  it('includes evidence in result', () => {
    const result = classify({ error_message: 'timeout', type: 'tool_call' });
    assert.ok(Array.isArray(result.evidence));
    assert.ok(result.evidence.length > 0);
  });
});
