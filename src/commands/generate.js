import { createHash } from 'node:crypto';
import { readSessionLog, normalizeEvent } from '../lib/adapter.js';
import { validate } from '../lib/validator.js';
import { redact } from '../lib/redacter.js';
import { classify } from '../lib/classifier.js';
import { renderToFile } from '../lib/renderer.js';
import { logError, logInfo, logSuccess, logWarn, ErrorCode } from '../lib/logger.js';
import { existsSync } from 'node:fs';

export async function run(options = {}) {
  const logPath = options.log;
  if (!logPath) {
    logError(ErrorCode.E010, '--log <file> is required');
    process.exit(1);
  }

  if (!existsSync(logPath)) {
    logError(ErrorCode.E010, logPath);
    process.exit(1);
  }

  const events = [];
  const failures = [];
  let totalEvents = 0;
  let totalFailures = 0;
  let totalRedactedFields = 0;
  let totalRedactedKeys = 0;
  let totalRedactedPatterns = 0;

  logInfo(`Reading ${logPath}...`);

  for await (const item of readSessionLog(logPath)) {
    totalEvents++;

    if (item.error) {
      logWarn(`Skipping line ${item.line || '?'}: ${item.detail}`);
      continue;
    }

    const normalized = normalizeEvent(item.event);
    events.push(normalized);

    const validation = validate(normalized);
    if (!validation.valid) {
      logWarn(`Validation failed: ${validation.errors.join(', ')}`);
      continue;
    }

    const { redacted: cleanEvent, stats } = redact(normalized);
    totalRedactedFields += stats.fields;
    totalRedactedKeys += stats.keys;
    totalRedactedPatterns += stats.patterns;

    const isError = cleanEvent.error_message || cleanEvent.tool_result?.error;
    if (!isError) continue;

    totalFailures++;

    const classification = classify(cleanEvent);

    const failure = {
      failure_type: classification.type,
      user_input: cleanEvent.user_input || '',
      agent_state: cleanEvent.agent_state || {},
      tool_name: cleanEvent.tool_name,
      tool_args: cleanEvent.tool_args,
      tool_result: cleanEvent.tool_result,
      error_message: cleanEvent.error_message || '',
      context: cleanEvent.context || {},
      timestamp: cleanEvent.timestamp,
      session_id: cleanEvent.session_id,
      agent_name: cleanEvent.agent_name,
      classifier_confidence: classification.confidence,
      redaction_stats: stats,
      severity: null,
      skills: [],
      token_count: cleanEvent.token_count,
      duration: cleanEvent.duration,
    };
    failure.severity = (failure.failure_type === 'agent_crash') ? 'critical'
      : (failure.failure_type === 'unsafe_action') ? 'critical'
      : (failure.failure_type === 'permission_denied') ? 'high'
      : (failure.failure_type === 'timeout') ? 'high'
      : (failure.failure_type === 'tool_loop') ? 'medium'
      : (failure.failure_type === 'parse_error') ? 'medium'
      : 'low';
    failures.push(failure);
  }

  if (failures.length === 0) {
    logError(ErrorCode.E012);
    process.exit(1);
  }

  logInfo(`Processed ${totalEvents} events, found ${totalFailures} failures`);

  let llmContent = null;
  if (options.llm) {
    logInfo('Calling Claude for narrative analysis...');
    try {
      const { analyzeFailures } = await import('../lib/llm.js');
      llmContent = await analyzeFailures(events, failures);
      logSuccess('LLM analysis complete');
    } catch (err) {
      logWarn(`LLM unavailable: ${err.message}. Falling back to rule-based.`);
    }
  }

  const sessionHash = createHash('sha256')
    .update(JSON.stringify(failures.map(f => f.session_id)))
    .digest('hex');

  const session = {
    ...failures[0],
    session_hash: sessionHash,
    failure_count: failures.length,
    events,
    skills: llmContent?.skills || ['failure-analysis', failures[0].failure_type].filter(Boolean),
    llm_tldr: llmContent?.tldr || null,
    llm_root_cause: llmContent?.root_cause || null,
    llm_lessons: llmContent?.lessons || null,
    llm_classification: llmContent?.classification || null,
  };

  const aggregatedStats = {
    total: totalRedactedFields + totalRedactedKeys + totalRedactedPatterns,
    fields: totalRedactedFields,
    keys: totalRedactedKeys,
    patterns: totalRedactedPatterns,
  };

  session.redaction_stats = aggregatedStats;

  const filepath = renderToFile(session, events, options.output);
  logSuccess(`Generated ${filepath} (${failures.length} failure(s), ${aggregatedStats.total} redaction(s))`);

  return filepath;
}
