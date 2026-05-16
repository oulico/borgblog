/**
 * Port of potebot FailureEvent/FailureType schema.
 * @see /Users/jhlee/Documents/Projects/potebot/potebot-app/src/reachy_mini_conversation_app/development/failure_logger.py
 */

/** @enum {string} */
export const FailureType = Object.freeze({
  INTENT_DETECTION:        'intent_detection',
  INCORRECT_ACTION:        'incorrect_action',
  UNSAFE_ACTION:           'unsafe_action',
  CONVERSATION_BREAKDOWN:  'conversation_breakdown',
  TOOL_LOOP:               'tool_loop',
  HALLUCINATION:           'hallucination',
  TIMEOUT:                 'timeout',
  PERMISSION_DENIED:       'permission_denied',
  MODEL_REFUSAL:           'model_refusal',
  PARSE_ERROR:             'parse_error',
  AGENT_CRASH:             'agent_crash',
  UNKNOWN:                 'unknown',
});

/** Human-readable labels */
export const FailureTypeLabel = Object.freeze({
  [FailureType.INTENT_DETECTION]:        'Intent Detection Failure',
  [FailureType.INCORRECT_ACTION]:        'Incorrect Action',
  [FailureType.UNSAFE_ACTION]:           'Unsafe Action',
  [FailureType.CONVERSATION_BREAKDOWN]:  'Conversation Breakdown',
  [FailureType.TOOL_LOOP]:               'Tool Loop',
  [FailureType.HALLUCINATION]:           'Hallucination',
  [FailureType.TIMEOUT]:                 'Timeout',
  [FailureType.PERMISSION_DENIED]:       'Permission Denied',
  [FailureType.MODEL_REFUSAL]:           'Model Refusal',
  [FailureType.PARSE_ERROR]:             'Parse Error',
  [FailureType.AGENT_CRASH]:             'Agent Crash',
  [FailureType.UNKNOWN]:                 'Unknown Failure',
});

/** @enum {string} */
export const FailureSeverity = Object.freeze({
  LOW:    'low',
  MEDIUM: 'medium',
  HIGH:   'high',
  CRITICAL: 'critical',
});

/**
 * Immutable failure event record.
 * Mirrors potebot FailureEvent dataclass with extensions for agentic context.
 */
export class FailureEvent {
  /**
   * @param {Object} opts
   * @param {string} opts.failure_type - FailureType enum value
   * @param {string} opts.user_input - raw user utterance / task description
   * @param {Object} [opts.agent_state] - agent context (serialized)
   * @param {string|null} [opts.tool_name] - tool that failed
   * @param {Object|null} [opts.tool_args] - tool arguments
   * @param {Object|null} [opts.tool_result] - tool output (or error)
   * @param {string} opts.error_message - diagnostic / error text
   * @param {Object} [opts.context] - ambient context
   * @param {string} [opts.timestamp] - ISO 8601
   * @param {string} [opts.session_id] - agent session identifier
   * @param {string} [opts.agent_name] - agent / model name
   * @param {Object} [opts.metadata] - extra metadata
   */
  constructor({
    failure_type,
    user_input,
    agent_state = {},
    tool_name = null,
    tool_args = null,
    tool_result = null,
    error_message,
    context = {},
    timestamp = new Date().toISOString(),
    session_id = '',
    agent_name = '',
    metadata = {},
  }) {
    this.failure_type = failure_type;
    this.user_input = user_input;
    this.agent_state = Object.freeze({ ...agent_state });
    this.tool_name = tool_name;
    this.tool_args = tool_args ? Object.freeze({ ...tool_args }) : null;
    this.tool_result = tool_result ? Object.freeze({ ...tool_result }) : null;
    this.error_message = error_message;
    this.context = Object.freeze({ ...context });
    this.timestamp = timestamp;
    this.session_id = session_id;
    this.agent_name = agent_name;
    this.metadata = Object.freeze({ ...metadata });
    Object.freeze(this);
  }

  /** @returns {string} */
  get severity() {
    if (this.failure_type === FailureType.AGENT_CRASH) return FailureSeverity.CRITICAL;
    if (this.failure_type === FailureType.UNSAFE_ACTION) return FailureSeverity.CRITICAL;
    if (this.failure_type === FailureType.PERMISSION_DENIED) return FailureSeverity.HIGH;
    if (this.failure_type === FailureType.TIMEOUT) return FailureSeverity.HIGH;
    if (this.failure_type === FailureType.TOOL_LOOP) return FailureSeverity.MEDIUM;
    if (this.failure_type === FailureType.PARSE_ERROR) return FailureSeverity.MEDIUM;
    return FailureSeverity.LOW;
  }
}
