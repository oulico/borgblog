/**
 * Structured error codes + user-facing messages.
 * All output goes to stderr (reserve stdout for pipeable content).
 */

/** @enum {string} */
export const ErrorCode = Object.freeze({
  E001: 'E001', // parse error
  E002: 'E002', // schema validation failure
  E003: 'E003', // redaction failure
  E004: 'E004', // classification failure
  E005: 'E005', // template render failure
  E006: 'E006', // file write failure
  E007: 'E007', // git not available
  E008: 'E008', // not a git repo
  E009: 'E009', // nothing to publish
  E010: 'E010', // input file not found
  E011: 'E011', // _posts dir not found (run init first)
  E012: 'E012', // empty log (no failure events)
});

const MESSAGES = {
  [ErrorCode.E001]: 'Failed to parse log entry',
  [ErrorCode.E002]: 'Schema validation failed',
  [ErrorCode.E003]: 'Redaction processing error',
  [ErrorCode.E004]: 'Failure classification error',
  [ErrorCode.E005]: 'Template rendering failed',
  [ErrorCode.E006]: 'Cannot write output file',
  [ErrorCode.E007]: 'git is not available. Install git and try again.',
  [ErrorCode.E008]: 'Current directory is not a git repository. Run `borgblog init` first.',
  [ErrorCode.E009]: 'No new posts to publish. Run `borgblog generate` first.',
  [ErrorCode.E010]: 'Input log file not found',
  [ErrorCode.E011]: '_posts directory not found. Run `borgblog init` first.',
  [ErrorCode.E012]: 'No failure events found in log. Nothing to generate.',
};

/**
 * @param {string} code - ErrorCode value
 * @param {string} [detail] - additional context
 */
export function logError(code, detail = '') {
  const msg = MESSAGES[code] || code;
  const detailStr = detail ? ` (${detail})` : '';
  console.error(`\x1b[31m❌ ${msg}${detailStr}\x1b[0m`);
}

/**
 * @param {string} message
 */
export function logInfo(message) {
  console.error(`\x1b[36mℹ ${message}\x1b[0m`);
}

/**
 * @param {string} message
 */
export function logSuccess(message) {
  console.error(`\x1b[32m✅ ${message}\x1b[0m`);
}

/**
 * @param {string} message
 */
export function logWarn(message) {
  console.error(`\x1b[33m⚠ ${message}\x1b[0m`);
}

/**
 * @param {string} message
 */
export function logPlain(message) {
  console.error(message);
}
