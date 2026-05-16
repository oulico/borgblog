export const FIELDS = [
  'api_key', 'apikey', 'secret', 'password', 'passwd',
  'token', 'access_token', 'refresh_token', 'id_token',
  'private_key', 'authorization',
];

export const KEY_PATTERNS = [
  '*_token',
  '*_secret',
  '*_key',
  '*_password',
  'auth*',
];

export const PATTERNS = [
  {
    name: 'jwt',
    regex: 'eyJ[A-Za-z0-9_-]+\\.[A-Za-z0-9_-]+\\.[A-Za-z0-9_-]+',
    replacement: '[REDACTED:jwt]',
  },
  {
    name: 'bearer-token',
    regex: 'Bearer\\s+[A-Za-z0-9_\\-\\.]+',
    replacement: '[REDACTED:bearer-token]',
  },
  {
    name: 'email',
    regex: '[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}',
    replacement: '[EMAIL]',
  },
  {
    name: 'aws-access-key',
    regex: 'AKIA[0-9A-Z]{16}',
    replacement: '[REDACTED:aws-key]',
  },
  {
    name: 'absolute-path',
    regex: '/(?:[A-Za-z0-9_.-]+/)+[A-Za-z0-9_.-]+',
    replacement: '[REDACTED:path]',
  },
  {
    name: 'ip-address',
    regex: '\\b(?:\\d{1,3}\\.){3}\\d{1,3}\\b',
    replacement: '[REDACTED:ip]',
  },
  {
    name: 'github-token',
    regex: 'gh[pousr]_[A-Za-z0-9_]{20,}',
    replacement: '[REDACTED:github-token]',
  },
];

export const SETTINGS = {
  stable_placeholders: true,
  log_redaction_stats: true,
};
