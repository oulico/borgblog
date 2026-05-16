import { FailureType } from './failure-schema.js';

const PATTERNS = [
  {
    type: FailureType.TOOL_LOOP,
    signals: [
      { field: 'error_message', match: /retry|loop|already|repeated/i, weight: 2 },
      { field: 'type', match: /tool_call/, weight: 1 },
    ],
  },
  {
    type: FailureType.TIMEOUT,
    signals: [
      { field: 'error_message', match: /timeout|timed out|deadline exceeded|ETIMEDOUT/i, weight: 3 },
    ],
  },
  {
    type: FailureType.PERMISSION_DENIED,
    signals: [
      { field: 'error_message', match: /permission denied|EACCES|EPERM|forbidden|unauthorized|401|403/i, weight: 3 },
    ],
  },
  {
    type: FailureType.PARSE_ERROR,
    signals: [
      { field: 'error_message', match: /parse|syntax|unexpected token|invalid json|ENOENT/i, weight: 2 },
      { field: 'type', match: /parse_error/, weight: 3 },
    ],
  },
  {
    type: FailureType.AGENT_CRASH,
    signals: [
      { field: 'error_message', match: /crash|segfault|panic|fatal|uncaught|signal/i, weight: 3 },
      { field: 'error_message', match: /exit code [1-9]|non-zero exit/i, weight: 2 },
    ],
  },
  {
    type: FailureType.HALLUCINATION,
    signals: [
      { field: 'error_message', match: /not found|no such file|invalid path|does not exist/i, weight: 1 },
      { field: 'tool_result', match: /error|not found|invalid/i, weight: 1 },
    ],
  },
  {
    type: FailureType.MODEL_REFUSAL,
    signals: [
      { field: 'error_message', match: /refus|cannot|unable to|I can't|I cannot/i, weight: 2 },
    ],
  },
  {
    type: FailureType.INCORRECT_ACTION,
    signals: [
      { field: 'error_message', match: /wrong|incorrect|unexpected|mismatch|failed/i, weight: 1 },
      { field: 'tool_result', match: /error|fail/i, weight: 1 },
    ],
  },
];

export function classify(event) {
  const scores = new Map();

  for (const { type, signals } of PATTERNS) {
    let score = 0;
    let evidence = [];

    for (const { field, match, weight } of signals) {
      const value = event[field];
      const text = typeof value === 'string' ? value
        : (typeof value === 'object' && value !== null) ? JSON.stringify(value)
        : '';

      if (match.test(text)) {
        score += weight;
        evidence.push(field);
      }
    }

    if (score > 0) {
      scores.set(type, { score, evidence });
    }
  }

  if (scores.size === 0) return { type: FailureType.UNKNOWN, confidence: 0, evidence: [] };

  let bestType = FailureType.UNKNOWN;
  let bestScore = 0;
  let bestEvidence = [];

  for (const [type, { score, evidence }] of scores) {
    if (score > bestScore) {
      bestScore = score;
      bestType = type;
      bestEvidence = evidence;
    }
  }

  const confidence = Math.min(1, bestScore / 5);

  return { type: bestType, confidence, evidence: bestEvidence };
}
