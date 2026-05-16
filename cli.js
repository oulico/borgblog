#!/usr/bin/env node
import { parseArgs } from 'node:util';
import { logPlain } from './src/lib/logger.js';

const HELP = `borgblog — AI agent failure retrospective blog generator

Usage:
  borgblog init [--theme <name>]
  borgblog publish [--push]
  borgblog generate --log <file> [--output <dir>] [--llm]

Commands:
  init       Scaffold a Jekyll + GitHub Pages blog
  generate   Parse session log → generate _posts/*.md
  publish    git add _posts/ && git commit (--push to also push)

Options:
  --theme <name>   Jekyll theme for init (default: minima)
  --log <file>     Session log file for generate (required)
  --output <dir>   Output directory for generate (default: _posts)
  --llm            Use Claude to generate narrative (requires ANTHROPIC_API_KEY)
  --push           Also git push after commit
  --help           Show this help
  --version        Show version

Examples:
  borgblog init --theme minima
  borgblog generate --log session.jsonl
  borgblog generate --log session.jsonl --output ../my-blog/_posts
  borgblog generate --log session.jsonl --llm
  borgblog publish
`;

const { values, positionals } = parseArgs({
  options: {
    theme: { type: 'string' },
    log: { type: 'string' },
    push: { type: 'boolean' },
    output: { type: 'string' },
    llm: { type: 'boolean' },
    help: { type: 'boolean' },
    version: { type: 'boolean' },
  },
  allowPositionals: true,
});

const command = positionals[0];

if (values.help || (!command && positionals.length === 0)) {
  logPlain(HELP);
  process.exit(0);
}

if (values.version) {
  const pkg = await import('./package.json', { with: { type: 'json' } });
  logPlain(`borgblog v${pkg.default.version}`);
  process.exit(0);
}

try {
  switch (command) {
    case 'init': {
      const { run } = await import('./src/commands/init.js');
      run({ theme: values.theme });
      break;
    }
    case 'generate': {
      const { run } = await import('./src/commands/generate.js');
      await run({ log: values.log, output: values.output, llm: values.llm });
      break;
    }
    case 'publish': {
      const { run } = await import('./src/commands/publish.js');
      run({ push: values.push });
      break;
    }
    default:
      logPlain(`Unknown command: ${command}`);
      logPlain(HELP);
      process.exit(1);
  }
} catch (err) {
  console.error(`\x1b[31mFatal: ${err.message}\x1b[0m`);
  process.exit(1);
}
