import { FIELDS, KEY_PATTERNS, PATTERNS, SETTINGS } from '../config/redaction-policy.js';
import { createHash } from 'node:crypto';

function loadPolicy() {
  return {
    fields: FIELDS,
    key_patterns: KEY_PATTERNS,
    patterns: PATTERNS,
    settings: SETTINGS,
  };
}

function stablePlaceholder(label) {
  const hash = createHash('sha256').update(label).digest('hex').slice(0, 8);
  return `[REDACTED:${label}:${hash}]`;
}

function simplePlaceholder(label) {
  return `[REDACTED:${label}]`;
}

function redactValue(value, patterns, useStable) {
  if (typeof value !== 'string') return value;
  let result = value;
  for (const { name, regex, replacement } of patterns) {
    const re = new RegExp(regex, 'g');
    result = result.replace(re, useStable ? stablePlaceholder(name) : (replacement || simplePlaceholder(name)));
  }
  return result;
}

export function redact(event) {
  const policy = loadPolicy();
  const useStable = policy?.settings?.stable_placeholders !== false;

  const sensitiveFields = new Set(policy?.fields || []);
  const keyPatterns = policy?.key_patterns || [];
  const patterns = policy?.patterns || [];

  const redacted = { ...event };
  let fieldCount = 0;
  let keyCount = 0;
  let patternCount = 0;

  const keysToDelete = new Set();

  for (const [key, value] of Object.entries(redacted)) {
    if (value === null || value === undefined) continue;

    if (sensitiveFields.has(key) || sensitiveFields.has(key.toLowerCase())) {
      redacted[key] = useStable ? stablePlaceholder(key) : simplePlaceholder(key);
      fieldCount++;
      continue;
    }

    let matchedKey = false;
    for (const kp of keyPatterns) {
      const regex = new RegExp('^' + kp.replace(/\*/g, '.*') + '$', 'i');
      if (regex.test(key)) {
        keysToDelete.add(key);
        matchedKey = true;
        break;
      }
    }
    if (matchedKey) { keyCount++; continue; }

    if (typeof value === 'string') {
      const before = value;
      const after = redactValue(value, patterns, useStable);
      if (after !== before) {
        redacted[key] = after;
        patternCount++;
      }
    } else if (typeof value === 'object' && !Array.isArray(value)) {
      const str = JSON.stringify(value);
      const redactedStr = redactValue(str, patterns, useStable);
      if (redactedStr !== str) {
        try { redacted[key] = JSON.parse(redactedStr); } catch { redacted[key] = redactedStr; }
        patternCount++;
      }
    }
  }

  for (const key of keysToDelete) {
    delete redacted[key];
  }

  return {
    redacted,
    stats: {
      fields: fieldCount,
      keys: keyCount,
      patterns: patternCount,
      total: fieldCount + keyCount + patternCount,
    },
  };
}
