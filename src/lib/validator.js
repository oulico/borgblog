const ISO_REGEX = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})$/;
const SESSION_ID_REGEX = /^ses_[a-zA-Z0-9_-]+$/;

const REQUIRED_FIELDS = ['timestamp', 'type'];
const FIELD_TYPES = {
  timestamp: 'string',
  type: 'string',
  session_id: 'string',
  agent_name: 'string',
  user_input: 'string',
  error_message: 'string',
  tool_name: ['string', 'null'],
  tool_args: ['object', 'null'],
  tool_result: ['object', 'string', 'null'],
  agent_state: 'object',
  context: 'object',
};

export function validate(event) {
  const errors = [];

  for (const field of REQUIRED_FIELDS) {
    if (!event[field]) {
      errors.push(`Missing required field: ${field}`);
    }
  }

  for (const [field, expected] of Object.entries(FIELD_TYPES)) {
    if (event[field] === undefined || event[field] === null) {
      if (Array.isArray(expected) && expected.includes('null')) continue;
      if (!REQUIRED_FIELDS.includes(field)) continue;
      errors.push(`Field ${field} is null but required`);
      continue;
    }

    const actual = Array.isArray(event[field]) ? 'object' : typeof event[field];
    const allowed = Array.isArray(expected) ? expected : [expected];
    if (!allowed.includes(actual)) {
      errors.push(`Field ${field}: expected ${allowed.join('|')}, got ${actual}`);
    }
  }

  if (event.timestamp && !ISO_REGEX.test(event.timestamp)) {
    errors.push(`Invalid timestamp format: ${event.timestamp} (expected ISO 8601)`);
  }

  if (event.session_id && !SESSION_ID_REGEX.test(event.session_id)) {
    errors.push(`Invalid session_id format: ${event.session_id} (expected ses_* pattern)`);
  }

  return { valid: errors.length === 0, errors };
}
