const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';
const MODEL = 'claude-sonnet-4-20250514';
const MAX_TOKENS = 1024;

import { readFileSync, existsSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

function getApiKey() {
  if (process.env.ANTHROPIC_API_KEY) return process.env.ANTHROPIC_API_KEY;
  const configPath = join(homedir(), '.borgblog', 'config.json');
  if (existsSync(configPath)) {
    try {
      const config = JSON.parse(readFileSync(configPath, 'utf-8'));
      return config.anthropic_api_key || '';
    } catch { /* ignore */ }
  }
  return '';
}

const SYSTEM_PROMPT = `You are an engineering retrospective writer. Given a list of AI agent session events, produce a structured failure analysis.

Respond ONLY with valid JSON — no preamble, no markdown fences:
{
  "tldr": "1-sentence summary of what happened and what was learned",
  "classification": "short label for the failure type (e.g. dependency-rule-violation, missing-config, race-condition)",
  "root_cause": "1-2 sentence root cause diagnosis",
  "lessons": ["actionable lesson 1", "actionable lesson 2"],
  "skills": ["skill-tag-1", "skill-tag-2"]
}

Rules:
- Be specific. Name the actual pattern, tool, or mistake.
- No banned words: delve, robust, comprehensive, showcase, foster, pivotal, moreover, furthermore, additionally, crucial, vibrant, intricate, significant, multifaceted.
- Use concrete details from the events (file names, error messages, fix applied).
- Lessons must be actionable — something another agent or developer can use to avoid this failure.
- Skills should be kebab-case tags like "port-adapter-pattern" or "di-container-setup".`;

export async function analyzeFailures(events, errorEvents) {
  const apiKey = getApiKey();
  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY environment variable is not set');
  }

  const eventSummary = events.map((e, i) => {
    const time = e.timestamp ? e.timestamp.slice(11, 19) : '--:--:--';
    const action = e.user_input || e.error_message || e.type || '';
    const tool = e.tool_name ? ` [${e.tool_name}]` : '';
    return `${i + 1}. ${time}${tool} ${action}`;
  }).join('\n');

  const errorSummary = errorEvents.map(e => {
    const msg = e.error_message || '';
    const tool = e.tool_name ? `[${e.tool_name}] ` : '';
    return `- ${tool}${msg}`;
  }).join('\n');

  const userMessage = `Session events (${events.length} total, ${errorEvents.length} failures):

${eventSummary}

Errors encountered:
${errorSummary}

Produce the retrospective JSON.`;

  const response = await fetch(ANTHROPIC_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: MAX_TOKENS,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userMessage }],
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Anthropic API error ${response.status}: ${err.slice(0, 200)}`);
  }

  const data = await response.json();
  const text = data.content?.[0]?.text || '';

  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error(`LLM response is not valid JSON: ${text.slice(0, 200)}`);
  }

  return JSON.parse(jsonMatch[0]);
}
