import { createReadStream } from 'node:fs';
import { createInterface } from 'node:readline';

export async function* readSessionLog(filepath) {
  const rl = createInterface({
    input: createReadStream(filepath, 'utf-8'),
    crlfDelay: Infinity,
  });

  let lineNumber = 0;
  for await (const line of rl) {
    lineNumber++;
    if (!line.trim()) continue;

    let parsed;
    try {
      parsed = JSON.parse(line);
    } catch {
      yield { error: true, code: 'E001', detail: `Line ${lineNumber}: invalid JSON`, raw: line.slice(0, 200) };
      continue;
    }

    if (!parsed.timestamp && !parsed.type) {
      yield {
        error: true,
        code: 'E002',
        detail: `Line ${lineNumber}: missing required field (timestamp or type)`,
        raw: parsed,
      };
      continue;
    }

    yield { error: false, event: parsed, line: lineNumber };
  }
}

export function normalizeEvent(raw) {
  return {
    timestamp: raw.timestamp || '',
    type: raw.type || '',
    session_id: raw.session_id || raw.sessionId || '',
    agent_name: raw.agent_name || raw.agentName || raw.model || '',
    user_input: raw.user_input || raw.userInput || raw.task || raw.prompt || '',
    tool_name: raw.tool_name || raw.toolName || raw.tool || null,
    tool_args: raw.tool_args || raw.toolArgs || raw.args || null,
    tool_result: raw.tool_result || raw.toolResult || raw.result || null,
    error_message: raw.error_message || raw.errorMessage || raw.error || '',
    agent_state: raw.agent_state || raw.agentState || raw.state || {},
    context: raw.context || raw.metadata || {},
    messages: raw.messages || [],
    token_count: raw.token_count || raw.tokenCount || raw.tokens || 0,
    duration: raw.duration || raw.elapsed || '',
  };
}
