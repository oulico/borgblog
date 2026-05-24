import { writeFileSync, mkdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import { execSync } from "node:child_process";
import { tool } from "@opencode-ai/plugin";

const PROCESSED = new Set();
const BLOG_DIR = join(process.env.HOME, "my-retro-blog");

function borgblog(args) {
  return execSync(`borgblog ${args}`, { encoding: "utf-8", cwd: BLOG_DIR });
}

function eventToJSONL(messages) {
  const lines = [];
  for (const msg of messages) {
    if (!msg.time?.created) continue;
    const entry = {
      timestamp: msg.time.created,
      type: msg.role === "assistant" ? "tool_call" : "user_input",
      session_id: msg.sessionID || "",
      agent_name: msg.modelID || msg.providerID || "",
      user_input: msg.role === "user" ? (msg.parts?.[0]?.text || "") : "",
      tool_name: msg.tool?.name || "",
      tool_args: msg.tool?.args || null,
      tool_result: msg.tool?.result || null,
      error_message: msg.error?.data?.message || msg.error?.message || "",
      token_count: (msg.tokens?.input || 0) + (msg.tokens?.output || 0),
      duration: msg.time.completed
        ? `${Math.round((new Date(msg.time.completed) - new Date(msg.time.created)) / 1000)}s`
        : "",
    };
    lines.push(JSON.stringify(entry));
  }
  return lines.join("\n");
}

function isSignificant(messages) {
  if (!messages || messages.length === 0) return false;

  let errorCount = 0;
  let retryCount = 0;
  let totalTokens = 0;

  for (const msg of messages) {
    if (msg.error?.data?.message || msg.error?.message) errorCount++;
    if (msg.tool?.result?.error) errorCount++;
    if (msg.tool?.result?.includes?.("retry")) retryCount++;
    totalTokens += (msg.tokens?.input || 0) + (msg.tokens?.output || 0);
  }

  return errorCount >= 1 || retryCount >= 2 || totalTokens > 5000;
}

async function generateRetrospective(sessionID, ctx) {
  if (PROCESSED.has(sessionID)) return;
  PROCESSED.add(sessionID);

  try {
    const response = await ctx.client.session.messages({ path: { id: sessionID } });
    const messages = response.data || [];

    if (!isSignificant(messages)) return;

    const jsonl = eventToJSONL(messages);
    const filepath = join(BLOG_DIR, `session-${sessionID}.jsonl`);
    writeFileSync(filepath, jsonl, "utf-8");

    const result = borgblog(`generate --log ${filepath} --llm`);
    console.error(`[borgblog] ${result.trim()}`);

    try { borgblog("publish --push"); } catch {}
  } catch (err) {
    console.error(`[borgblog] Failed for session ${sessionID}: ${err.message}`);
  }
}

export default async function BorgblogPlugin(ctx) {
  if (!existsSync(BLOG_DIR)) {
    mkdirSync(BLOG_DIR, { recursive: true });
    borgblog("init");
  }

  return {
    tool: {
      borgblog: tool({
        description: "Generate a retrospective blog post from this session. Uses Claude to write the narrative and publishes to GitHub Pages.",
        args: {
          force: tool.schema.boolean().optional().describe("Skip significance check — generate even if no errors were found"),
          sessionId: tool.schema.string().optional().describe("Session ID (defaults to current session)"),
        },
        async execute(args, context) {
          const sessionID = args.sessionId || context.sessionID;
          if (!sessionID) return "No session ID available. Wait for the session to be created first.";

          try {
            const response = await ctx.client.session.messages({ path: { id: sessionID } });
            const messages = response.data || [];

            if (!args.force && !isSignificant(messages)) {
              return `Session ${sessionID}: nothing significant found (${messages.length} messages, 0 errors). Use --force to generate anyway.`;
            }

            if (messages.length === 0) {
              return `Session ${sessionID}: no messages yet.`;
            }

            const jsonl = eventToJSONL(messages);
            const filepath = join(BLOG_DIR, `session-${sessionID}.jsonl`);
            writeFileSync(filepath, jsonl, "utf-8");

            const result = borgblog(`generate --log ${filepath} --llm`);
            try { borgblog("publish --push"); } catch {}

            const postPath = join(BLOG_DIR, "_posts");
            return `Retrospective generated and published.\nBlog: https://oulico.github.io/my-retro-blog/\nOutput: ${result.trim()}`;
          } catch (err) {
            return `Failed to generate retrospective: ${err.message}`;
          }
        },
      }),
    },

    event: async ({ event }) => {
      const { type, properties } = event || {};
      const sessionID = properties?.sessionID || properties?.info?.id;
      if (!sessionID) return;

      if (type === "session.idle") {
        await generateRetrospective(sessionID, ctx);
      }

      if (type === "session.compacted") {
        await generateRetrospective(sessionID, ctx);
      }

      if (type === "session.error") {
        PROCESSED.delete(sessionID);
      }
    },
  };
}
