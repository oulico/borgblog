# borgblog

> AI가 실수하고 배운 걸 기술 블로그로 자동 발행한다. CLI로 수동 생성하거나, OpenCode 플러그인으로 세션 종료 시 자동 발행.

Turn AI agent session logs into Jekyll blog posts — automatically or on demand. Claude writes the narrative, GitHub Pages hosts it.

```
session.jsonl → [redact] → [classify] → [Claude] → _posts/*.md → git push → 🌐
```

---

## Install

```bash
npm install -g borgblog
```

Zero dependencies. Node.js 18.3+.  
LLM narrative needs an Anthropic API key:

```bash
mkdir -p ~/.borgblog
echo '{"anthropic_api_key":"sk-ant-..."}' > ~/.borgblog/config.json
chmod 600 ~/.borgblog/config.json
```

---

## Quick Start — CLI

```bash
borgblog init                                    # scaffold Jekyll site
borgblog generate --log session.jsonl --llm      # create post (Claude writes it)
borgblog publish --push                          # git commit + git push
```

### GitHub Pages (first time only)

```bash
borgblog init
gh repo create my-retro-blog --public --source=. --push
```

Then in repo Settings → Pages: `Deploy from a branch` → `main` → `/`.  
Edit `_config.yml`, set `baseurl: "/my-retro-blog"` and `url`, push once more.

---

## Quick Start — OpenCode Plugin

The plugin auto-generates retrospectives whenever an OpenCode session ends with significant events.

```bash
opencode plugin add borgblog-opencode-plugin
```

Or manually in `~/.config/opencode/opencode.jsonc`:
```json
{ "plugin": ["borgblog-opencode-plugin"] }
```

**What triggers a post:**
- A tool call failed (exit code, permission denied, crash)
- The agent retried the same action multiple times
- The session used more than 5,000 tokens

**What happens:**
1. Session goes idle → plugin collects all messages
2. Converts to JSONL → runs `borgblog generate --llm`
3. Claude analyzes the failure and writes the narrative
4. `borgblog publish --push` → live on GitHub Pages

The blog lives at `~/my-retro-blog/`. Set it up once:

```bash
mkdir ~/my-retro-blog && cd ~/my-retro-blog
git init && borgblog init
gh repo create my-retro-blog --public --source=. --push
```

---

## Commands

| Command | |
|---------|-|
| `borgblog init` | Scaffold Jekyll + GitHub Pages config |
| `borgblog generate --log <file>` | JSONL → validate → redact → classify → render |
| `borgblog generate --log <file> --llm` | Same, but Claude writes the TL;DR, lessons, and root cause |
| `borgblog generate --log <file> --output <dir>` | Write `_posts/` to a custom directory |
| `borgblog publish` | `git add _posts/` + `git commit` |
| `borgblog publish --push` | Also `git push` |

---

## Input Format (JSONL)

One JSON object per line. The adapter normalizes camelCase/snake_case variations.

```json
{"timestamp":"2026-05-16T14:02:00+09:00","type":"tool_call","session_id":"ses_abc","agent_name":"my-bot","error_message":"ENOENT","tool_name":"bash","tool_args":{"command":"npm test"},"token_count":4200,"duration":"45s"}
```

### Fields

| Field | Required | Notes |
|-------|----------|-------|
| `timestamp` | Yes | ISO 8601 |
| `type` | Yes | Any string (`tool_call`, `error`, `edit`, etc.) |
| `session_id` | Yes | `ses_*` pattern |
| `agent_name` | No | Model or agent identifier |
| `user_input` | No | Task description or prompt |
| `tool_name` | No | Tool that was invoked |
| `tool_args` | No | Tool arguments (object) |
| `tool_result` | No | Tool output or error (object or string) |
| `error_message` | No | Diagnostic text — **events without this are skipped** |
| `token_count` | No | Token usage |
| `duration` | No | e.g. `"45s"` |

Only events with `error_message` or `tool_result.error` generate retrospective posts.

---

## Output

Jekyll-compatible `_posts/YYYY-MM-DD-session-id.md`.

### Without `--llm` (rule-based)
Classification + template filled with raw data.

### With `--llm` (Claude)
Claude reads the full session, diagnoses the real failure, and writes:

| Section | Source |
|---------|--------|
| **TL;DR** | Claude summarizes the session in one sentence |
| **Classification** | Claude labels the failure type (e.g. `dependency-rule-violation`) |
| **Root Cause** | Claude diagnoses what actually went wrong |
| **Lessons Learned** | Actionable, specific to the failure pattern |
| **Skills** | Tags like `port-adapter-pattern`, `di-container-setup` |

Every post includes:
- YAML frontmatter (`layout: post`, `categories: [ai-agents, failures]`)
- Execution timeline table
- Redacted tool output / error log
- Trust footer: redaction count, session SHA-256, generation timestamp

---

## Redaction

Sensitive data is masked before it reaches the blog post.

| Layer | What | Example |
|-------|------|---------|
| **Fields** | Value replaced, key kept | `api_key`, `token`, `password`, `authorization` |
| **Keys** | Entire key-value deleted | `*_token`, `*_secret`, `auth*` |
| **Patterns** | Regex in any string value | JWT, Bearer tokens, emails, AWS keys, file paths, IPs |

Customize in `src/config/redaction-policy.js`.

---

## Failure Classification

The rule-based classifier detects 8 patterns. `--llm` overrides with a custom label.

| Type | Signal |
|------|--------|
| `tool_loop` | Repeated retries, same tool |
| `timeout` | Deadline exceeded, ETIMEDOUT |
| `permission_denied` | 403, EACCES, forbidden |
| `parse_error` | SyntaxError, invalid JSON, ENOENT |
| `agent_crash` | Segfault, panic, non-zero exit |
| `hallucination` | File not found, invalid path |
| `model_refusal` | "I cannot", refusal |
| `incorrect_action` | Wrong result, mismatch |
| `unknown` | No pattern matched |

---

## Tone Guide

Engineering-blog voice enforced. 14 banned AI-slop words: delve, robust, comprehensive, showcase, foster, pivotal, moreover, furthermore, additionally, crucial, vibrant, intricate, significant, multifaceted.

Quality checks: active voice, ≤30 words per sentence, concrete numbers required.

---

## Architecture

```
cli.js
├── init        → src/commands/init.js      Jekyll scaffold
├── generate    → src/commands/generate.js   Pipeline orchestrator
│   ├── adapter.js      JSONL parse + normalize
│   ├── validator.js    Schema validation (fail-fast)
│   ├── redacter.js     Allowlist masking
│   ├── classifier.js   FailureType detection
│   ├── llm.js          Claude API (--llm)
│   ├── template.js     Conclusion-first markdown
│   └── renderer.js     _posts/*.md writer
└── publish     → src/commands/publish.js    git add + commit + push

plugin/
└── index.js            OpenCode plugin (event hook → auto-generate)
```

---

## Test

```bash
node --test test/*.test.js
```

---

## License

MIT
