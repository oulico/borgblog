import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readSessionLog, normalizeEvent } from '../src/lib/adapter.js';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

describe('adapter', () => {
  const fixturePath = resolve(__dirname, 'fixtures/sample-session.jsonl');

  it('reads and parses valid JSONL', async () => {
    const events = [];
    for await (const item of readSessionLog(fixturePath)) {
      events.push(item);
    }
    assert.ok(events.length >= 4, `Expected >=4 events, got ${events.length}`);
    const okEvents = events.filter(e => !e.error);
    assert.ok(okEvents.length >= 4);
  });

  it('normalizes event fields', () => {
    const raw = {
      timestamp: '2026-05-11T09:42:00+09:00',
      type: 'tool_call',
      session_id: 'ses_c83a1f2b',
      agentName: 'pdf-generator-v2',
      userInput: 'Generate PDF',
      tool: 'bash',
      args: { command: 'node x.js' },
      errorMessage: 'ENOENT',
      tokens: 4200,
      elapsed: '45s',
    };
    const n = normalizeEvent(raw);
    assert.equal(n.timestamp, '2026-05-11T09:42:00+09:00');
    assert.equal(n.agent_name, 'pdf-generator-v2');
    assert.equal(n.user_input, 'Generate PDF');
    assert.equal(n.tool_name, 'bash');
    assert.deepEqual(n.tool_args, { command: 'node x.js' });
    assert.equal(n.error_message, 'ENOENT');
    assert.equal(n.token_count, 4200);
    assert.equal(n.duration, '45s');
  });
});
