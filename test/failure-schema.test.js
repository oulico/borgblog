import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { FailureType, FailureTypeLabel, FailureSeverity, FailureEvent } from '../src/lib/failure-schema.js';

describe('FailureType', () => {
  it('has unique values', () => {
    const values = Object.values(FailureType);
    const unique = new Set(values);
    assert.equal(unique.size, values.length);
  });

  it('includes all expected types', () => {
    assert.ok(FailureType.INTENT_DETECTION);
    assert.ok(FailureType.INCORRECT_ACTION);
    assert.ok(FailureType.UNSAFE_ACTION);
    assert.ok(FailureType.CONVERSATION_BREAKDOWN);
    assert.ok(FailureType.TOOL_LOOP);
    assert.ok(FailureType.TIMEOUT);
    assert.ok(FailureType.PERMISSION_DENIED);
    assert.ok(FailureType.UNKNOWN);
  });
});

describe('FailureTypeLabel', () => {
  it('has labels for all types', () => {
    for (const type of Object.values(FailureType)) {
      assert.ok(FailureTypeLabel[type], `Missing label for ${type}`);
    }
  });
});

describe('FailureSeverity', () => {
  it('orders correctly by risk', () => {
    const sevs = Object.values(FailureSeverity);
    assert.equal(sevs[0], 'low');
    assert.equal(sevs[3], 'critical');
  });
});

describe('FailureEvent', () => {
  it('creates with required fields', () => {
    const ev = new FailureEvent({
      failure_type: FailureType.TIMEOUT,
      user_input: 'test input',
      error_message: 'timed out',
    });
    assert.equal(ev.failure_type, FailureType.TIMEOUT);
    assert.equal(ev.user_input, 'test input');
    assert.equal(ev.error_message, 'timed out');
  });

  it('defaults optional fields', () => {
    const ev = new FailureEvent({
      failure_type: FailureType.UNKNOWN,
      user_input: '',
      error_message: '',
    });
    assert.equal(ev.tool_name, null);
    assert.equal(ev.tool_args, null);
    assert.equal(ev.tool_result, null);
    assert.ok(ev.timestamp);
  });

  it('is frozen (immutable)', () => {
    const ev = new FailureEvent({
      failure_type: FailureType.PARSE_ERROR,
      user_input: 'test',
      error_message: 'parse error',
    });
    assert.throws(() => { ev.failure_type = 'other'; });
  });

  it('returns correct severity', () => {
    const crash = new FailureEvent({ failure_type: FailureType.AGENT_CRASH, user_input: '', error_message: '' });
    assert.equal(crash.severity, FailureSeverity.CRITICAL);

    const timeout = new FailureEvent({ failure_type: FailureType.TIMEOUT, user_input: '', error_message: '' });
    assert.equal(timeout.severity, FailureSeverity.HIGH);

    const loop = new FailureEvent({ failure_type: FailureType.TOOL_LOOP, user_input: '', error_message: '' });
    assert.equal(loop.severity, FailureSeverity.MEDIUM);

    const unknown = new FailureEvent({ failure_type: FailureType.UNKNOWN, user_input: '', error_message: '' });
    assert.equal(unknown.severity, FailureSeverity.LOW);
  });
});
