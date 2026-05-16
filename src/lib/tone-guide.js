/**
 * Tone enforcement for AI-generated retrospective posts.
 * Prevents AI-slop vocabulary and enforces engineering-blog voice.
 */

/**
 * Banned word/phrase patterns → replacement suggestions.
 * Applied as regex word-boundary matches.
 * @type {Array<{pattern: RegExp, label: string}>}
 */
export const BANNED_PATTERNS = [
  { pattern: /\bdelve\b/gi,           label: 'delve' },
  { pattern: /\brobust\b/gi,          label: 'robust' },
  { pattern: /\bcomprehensive\b/gi,   label: 'comprehensive' },
  { pattern: /\bshowcase\b/gi,        label: 'showcase' },
  { pattern: /\bfoster\b/gi,          label: 'foster' },
  { pattern: /\bpivotal\b/gi,         label: 'pivotal' },
  { pattern: /\bmoreover\b/gi,        label: 'moreover' },
  { pattern: /\bfurthermore\b/gi,     label: 'furthermore' },
  { pattern: /\badditionally\b/gi,    label: 'additionally' },
  { pattern: /\bcrucial\b/gi,         label: 'crucial' },
  { pattern: /\bvibrant\b/gi,         label: 'vibrant' },
  { pattern: /\bintricate\b/gi,       label: 'intricate' },
  { pattern: /\bsignificant\b/gi,     label: 'significant' },
  { pattern: /\bmultifaceted\b/gi,    label: 'multifaceted' },
];

/**
 * Tone quality rules.
 * Each returns { pass: boolean, message: string }.
 */
export const TONE_RULES = [
  {
    name: 'active-voice',
    check(text) {
      const passive = /\b(was|were|has been|have been|is being|are being) \w+ed\b/gi;
      const matches = text.match(passive) || [];
      return { pass: matches.length < 3, message: `${matches.length} passive voice phrases found` };
    },
  },
  {
    name: 'sentence-length',
    check(text) {
      const sentences = text.split(/[.!?]+/).filter(s => s.trim());
      const long = sentences.filter(s => s.trim().split(/\s+/).length > 30);
      return { pass: long.length < 3, message: `${long.length} sentences exceed 30 words` };
    },
  },
  {
    name: 'concrete-numbers',
    check(text) {
      const hasNumbers = /\d+/.test(text);
      return { pass: hasNumbers, message: 'No concrete numbers found — add durations, token counts, retry counts' };
    },
  },
];

/**
 * Audit text for tone violations.
 * @param {string} text
 * @returns {{ violations: Array<{type: string, label: string, count: number}>, rules: Array<{name: string, pass: boolean, message: string}>, score: number }}
 */
export function audit(text) {
  /** @type {Array<{type: string, label: string, count: number}>} */
  const violations = [];

  for (const { pattern, label } of BANNED_PATTERNS) {
    const matches = text.match(pattern);
    if (matches) {
      violations.push({ type: 'banned-word', label, count: matches.length });
    }
  }

  const ruleResults = TONE_RULES.map(rule => {
    const result = rule.check(text);
    return { name: rule.name, pass: result.pass, message: result.message };
  });

  const totalIssues = violations.length + ruleResults.filter(r => !r.pass).length;
  const score = Math.max(0, 10 - totalIssues);

  return { violations, rules: ruleResults, score };
}
