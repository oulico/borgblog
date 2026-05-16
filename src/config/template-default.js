export const FRONTMATTER = {
  layout: 'post',
  categories: ['ai-agents', 'failures'],
};

export const SECTIONS = [
  'tldr',
  'lessons',
  'skills',
  'root_cause',
  'timeline',
  'what_failed',
  'how_fixed',
  'code_evidence',
];

export const TRUST_INDICATORS = [
  'redaction_count',
  'redaction_detail',
  'log_hash',
  'generation_timestamp',
  'approver',
  'git_diff_link',
];

export const METADATA = [
  'agent_name',
  'session_id',
  'date',
  'duration',
  'token_count',
  'token_cost',
];

export const SEVERITY_COLORS = {
  low: '#6b7280',
  medium: '#f59e0b',
  high: '#ef4444',
  critical: '#7f1d1d',
};
