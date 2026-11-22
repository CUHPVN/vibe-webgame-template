#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import readline from 'node:readline/promises';
import { fileURLToPath } from 'node:url';

const ROOT_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const ENGINES = {
  vanilla: {
    label: 'Vanilla HTML5 Canvas 2D',
    deps: {},
    devDeps: {},
    guardrails: [
      'Renderer adapter: `src/renderer/renderer.ts` (`VanillaCanvasRenderer`).',
      'Clamp `devicePixelRatio` to max `2` and keep logical coordinates `800x450` (16:9).',
    ],
    externalSkills: 'npx skills add gamedev-skills/awesome-gamedev-agent-skills (install router + web-engines only)',
    extraMcp: 'Already lean with chrome-devtools-mcp + context7.',
  },
  phaser: {
    label: 'Phaser 4 (v4.2.1+)',
    deps: { phaser: '^4.2.1' },
    devDeps: {},
    guardrails: [
      'Use `import * as Phaser from "phaser";` and `Phaser.Types.Core.GameConfig` (never Phaser 3 UMD defaults).',
      'Keep gameplay state in `src/core/simulation.ts`; Phaser scenes only render snapshots and call `game.destroy(true)` on teardown.',
    ],
    externalSkills: 'npx skills add gamedev-skills/awesome-gamedev-agent-skills (router + web-engines) or openai/plugins/game-studio (phaser-2d-game)',
    extraMcp: 'Optional: npx @phaserjs/game-agent for cloud sandbox previews.',
  },
  pixi: {
    label: 'PixiJS v8 (v8.23+)',
    deps: { 'pixi.js': '^8.23.0' },
    devDeps: {},
    guardrails: [
      'Always use PixiJS v8 APIs: `const app = new Application(); await app.init({ ... });` inside an async function (no top-level await, no Pixi v7 constructor options).',
      'Use `app.canvas` (never `app.view`), `Graphics` v8 `.rect().fill()` chain, and `app.destroy(true, { children: true })` in `dispose()`.',
    ],
    externalSkills: 'npx skills add https://github.com/pixijs/pixijs-skills',
    extraMcp: 'Use Context7 for PixiJS v8 + pixijs.com/llms.',
  },
  kaplay: {
    label: 'KAPLAY (v3001+)',
    deps: { kaplay: '^3001.0.19' },
    devDeps: {},
    guardrails: [
      'Initialize `kaplay({ global: false, touchToMouse: false })` inside `src/renderer/renderer.ts` to keep core simulation decoupled.',
      'Call `k.quit()` in `dispose()` so HMR / test resets do not leak loops or listeners.',
    ],
    externalSkills: 'npx skills add gamedev-skills/awesome-gamedev-agent-skills (router + web-engines)',
    extraMcp: 'Already lean with chrome-devtools-mcp + context7.',
  },
  three: {
    label: 'Three.js r187+ (WebGL / WebGPU)',
    deps: { three: '^0.187.0' },
    devDeps: { '@types/three': '^0.187.0' },
    guardrails: [
      'Three.js r186+ API: use `THREE.Timer` (NOT deprecated `THREE.Clock`) and `HDRLoader` (NOT `RGBELoader`).',
      'Always traverse and call `.dispose()` on geometries, materials, textures, and render targets on scene change or teardown.',
      'Keep parent `Object3D` scales at `(1, 1, 1)` when syncing physics/raycasts and skip rendering when `document.visibilityState === "hidden"`.',
    ],
    externalSkills: 'npx skills add cloudai-x/threejs-skills (fast 3D) or majidmanzarpour/threejs-game-skills (director + QA)',
    extraMcp: 'Recommended 3D MCP: `npx -y threejs-devtools-mcp` added to `.mcp.json`.',
  },
};

const TARGETS = {
  web: {
    label: 'General Web / GitHub Pages / Cloudflare / Vercel',
    notes: 'Keep base: "./" in vite.config.ts. Run `npm run budget` to verify file sizes stay below 25 MiB/file (Cloudflare limit).',
  },
  itch: {
    label: 'itch.io HTML5 ZIP',
    notes: 'Build dist/ with relative paths (`base: "./"`), index.html at ZIP root, <= 1,000 files, <= 500 MB extracted. Deploy via `.github/workflows/deploy-itch.yml`.',
  },
  crazygames: {
    label: 'CrazyGames (Basic -> Full Launch)',
    notes: 'Target initial load <= 20 MB (mobile) / <= 50 MB (desktop), total <= 250 MB, <= 1,500 files. Test on low-RAM Chromebook profile and integrate CrazyGames SDK v2 for Full Launch.',
  },
  poki: {
    label: 'Poki (Strict Zero-External-Request)',
    notes: 'Target initial load <= 5 MB (<= 8 MB total). Zero external network calls (bundle all fonts/libs), Incognito safe, AdBlock safe, 16:9 aspect ratio, wire Poki SDK gameplayStart/gameplayStop/commercialBreak.',
  },
  discord: {
    label: 'Discord Activities (Embedded App SDK)',
    notes: 'Strict CSP inside *.discordsays.com iframe: install `@discord/embedded-app-sdk`, configure URL Mappings, and patch fetch/WebSocket with `patchUrlMappings` or `@robojs/patch`.',
  },
};

function parseArgs(argv) {
  const result = {
    name: undefined,
    engine: undefined,
    target: undefined,
    install: false,
    clean: false,
    dryRun: false,
    help: false,
  };

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--help' || arg === '-h') result.help = true;
    else if (arg === '--install') result.install = true;
    else if (arg === '--clean') result.clean = true;
    else if (arg === '--dry-run') result.dryRun = true;
    else if (arg === '--name' && argv[i + 1]) result.name = argv[++i];
    else if (arg.startsWith('--name=')) result.name = arg.slice(7);
    else if (arg === '--engine' && argv[i + 1]) result.engine = argv[++i];
    else if (arg.startsWith('--engine=')) result.engine = arg.slice(9);
    else if (arg === '--target' && argv[i + 1]) result.target = argv[++i];
    else if (arg.startsWith('--target=')) result.target = arg.slice(9);
  }
  return result;
}

function toSlug(name) {
  const slug = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return slug || 'my-webgame';
}

function escapeHtml(text) {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function printHelp() {
  console.log(`
Vibe WebGame Template Setup

Usage:
  npm run setup -- [--name "Game Name"] [--engine vanilla|phaser|pixi|kaplay|three] [--target web|itch|crazygames|poki|discord] [--install] [--clean] [--dry-run]

Options:
  --name      Game display name (updates index.html, package.json slug, docs)
  --engine    Renderer engine adapter: vanilla | phaser | pixi | kaplay | three
  --target    Release target: web | itch | crazygames | poki | discord
  --install   Run npm install automatically after updating package.json
  --clean     Remove templates/ directory after copying chosen engine
  --dry-run   Print planned changes without modifying any files
  --help      Show this help message
`);
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    printHelp();
    return;
  }

  const interactive = !args.name && !args.engine && !args.target;
  let name = args.name;
  let engine = args.engine;
  let target = args.target;

  if (interactive) {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    try {
      const n = await rl.question('Game name (default: Star Dash): ');
      name = n.trim() || 'Star Dash';

      const e = await rl.question('Engine [vanilla/phaser/pixi/kaplay/three] (default: vanilla): ');
      engine = (e.trim().toLowerCase() || 'vanilla');

      const t = await rl.question('Target [web/itch/crazygames/poki/discord] (default: web): ');
      target = (t.trim().toLowerCase() || 'web');
    } finally {
      rl.close();
    }
  } else {
    name = name || 'Star Dash';
    engine = (engine || 'vanilla').toLowerCase();
    target = (target || 'web').toLowerCase();
  }

  if (!ENGINES[engine]) {
    console.error(`Unknown engine "${engine}". Valid options: ${Object.keys(ENGINES).join(', ')}`);
    process.exit(1);
  }
  if (!TARGETS[target]) {
    console.error(`Unknown target "${target}". Valid options: ${Object.keys(TARGETS).join(', ')}`);
    process.exit(1);
  }

  const slug = toSlug(name);
  const engineCfg = ENGINES[engine];
  const targetCfg = TARGETS[target];

  const srcRendererTemplate = path.join(ROOT_DIR, 'templates', 'engines', engine, 'renderer.ts');
  const destRenderer = path.join(ROOT_DIR, 'src', 'renderer', 'renderer.ts');
  const pkgPath = path.join(ROOT_DIR, 'package.json');
  const htmlPath = path.join(ROOT_DIR, 'index.html');
  const agentsPath = path.join(ROOT_DIR, 'AGENTS.md');
  const progressPath = path.join(ROOT_DIR, 'progress.md');
  const specPath = path.join(ROOT_DIR, 'docs', 'GAME_SPEC.md');
  const mcpPath = path.join(ROOT_DIR, '.mcp.json');

  if (!fs.existsSync(srcRendererTemplate)) {
    console.error(`Missing renderer template: ${srcRendererTemplate}`);
    process.exit(1);
  }

  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
  const oldEngines = ['phaser', 'pixi.js', 'kaplay', 'three'];
  const nextDeps = { ...(pkg.dependencies || {}) };
  for (const old of oldEngines) delete nextDeps[old];
  Object.assign(nextDeps, engineCfg.deps);

  const nextDevDeps = { ...(pkg.devDependencies || {}) };
  delete nextDevDeps['@types/three'];
  Object.assign(nextDevDeps, engineCfg.devDeps);

  pkg.name = slug;
  pkg.dependencies = nextDeps;
  pkg.devDependencies = nextDevDeps;

  const activeBlock = [
    '<!-- ACTIVE_STACK_START -->',
    `- **Game**: ${name} (\`${slug}\`)`,
    `- **Engine**: ${engineCfg.label}`,
    `- **Target Platform**: ${targetCfg.label}`,
    `- **Platform Constraints**: ${targetCfg.notes}`,
    ...engineCfg.guardrails.map((g) => `- **Engine Guardrail**: ${g}`),
    '<!-- ACTIVE_STACK_END -->',
  ].join('\n');

  const today = new Date().toISOString().slice(0, 10);

  if (args.dryRun) {
    console.log('=== DRY RUN: No files were modified ===');
    console.log(`- Game Name: ${name} (package slug: ${slug})`);
    console.log(`- Engine: ${engine} (${engineCfg.label})`);
    console.log(`- Target: ${target} (${targetCfg.label})`);
    console.log(`- Copy: ${path.relative(ROOT_DIR, srcRendererTemplate)} -> ${path.relative(ROOT_DIR, destRenderer)}`);
    console.log(`- package.json dependencies: ${JSON.stringify(pkg.dependencies)}`);
    console.log(`- package.json added devDependencies: ${JSON.stringify(engineCfg.devDeps)}`);
    console.log(`- AGENTS.md ACTIVE_STACK block:\n${activeBlock}`);
    if (engine === 'three') {
      console.log('- .mcp.json: would add `threejs-devtools` (`npx -y threejs-devtools-mcp`)');
    }
    if (args.clean) console.log('- Would remove templates/ directory');
    if (args.install) console.log('- Would run npm install');
    return;
  }

  fs.mkdirSync(path.dirname(destRenderer), { recursive: true });
  fs.copyFileSync(srcRendererTemplate, destRenderer);
  fs.writeFileSync(pkgPath, `${JSON.stringify(pkg, null, 2)}\n`, 'utf8');

  if (fs.existsSync(htmlPath)) {
    const html = fs.readFileSync(htmlPath, 'utf8');
    const updatedHtml = html
      .replace(/<title>[\s\S]*?<\/title>/i, `<title>${escapeHtml(name)}</title>`)
      .replace(/<h1 id="menu-title">[\s\S]*?<\/h1>/i, `<h1 id="menu-title">${escapeHtml(name.toUpperCase())}</h1>`);
    fs.writeFileSync(htmlPath, updatedHtml, 'utf8');
  }

  if (fs.existsSync(agentsPath)) {
    const agents = fs.readFileSync(agentsPath, 'utf8');
    const updatedAgents = agents.replace(
      /<!-- ACTIVE_STACK_START -->[\s\S]*?<!-- ACTIVE_STACK_END -->/,
      activeBlock,
    );
    fs.writeFileSync(agentsPath, updatedAgents, 'utf8');
  }

  if (fs.existsSync(mcpPath)) {
    const mcp = JSON.parse(fs.readFileSync(mcpPath, 'utf8'));
    mcp.mcpServers = mcp.mcpServers || {};
    if (engine === 'three') {
      mcp.mcpServers['threejs-devtools'] = {
        command: 'npx',
        args: ['-y', 'threejs-devtools-mcp'],
      };
    } else {
      delete mcp.mcpServers['threejs-devtools'];
    }
    fs.writeFileSync(mcpPath, `${JSON.stringify(mcp, null, 2)}\n`, 'utf8');
  }

  fs.writeFileSync(
    progressPath,
    `# Project Progress (${name})\n\n` +
      `- **Initialized**: ${today}\n` +
      `- **Engine**: ${engineCfg.label}\n` +
      `- **Target**: ${targetCfg.label}\n\n` +
      `## Completed\n` +
      `- [x] Project initialized from Universal Vibe WebGame Template\n` +
      `- [x] Core simulation + DOM HUD + deterministic \`advanceTime\` / \`render_game_to_text\` hooks ready\n\n` +
      `## Current Slice / Next Up\n` +
      `- [ ] Fill out \`docs/GAME_SPEC.md\` with core loop, win/loss state, and Slice 1 behavior contract\n` +
      `- [ ] Replace starter arena in \`src/core/simulation.ts\` and \`src/renderer/renderer.ts\`\n`,
    'utf8',
  );

  if (fs.existsSync(specPath)) {
    const spec = fs.readFileSync(specPath, 'utf8');
    const updatedSpec = spec
      .replace(/^# Game Spec:.*$/m, `# Game Spec: ${name}`)
      .replace(/^- \*\*Engine\*\*:.*$/m, `- **Engine**: ${engineCfg.label}`)
      .replace(/^- \*\*Target Platform\*\*:.*$/m, `- **Target Platform**: ${targetCfg.label}`);
    fs.writeFileSync(specPath, updatedSpec, 'utf8');
  }

  if (args.clean) {
    fs.rmSync(path.join(ROOT_DIR, 'templates'), { recursive: true, force: true });
  }

  console.log(`\nConfigured "${name}" (${slug}) with ${engineCfg.label} for ${targetCfg.label}.`);
  console.log(`- External Skills recommendation: ${engineCfg.externalSkills}`);
  console.log(`- MCP tip: ${engineCfg.extraMcp}`);

  if (args.install) {
    console.log('\nRunning npm install...');
    const res = spawnSync(process.platform === 'win32' ? 'npm.cmd' : 'npm', ['install'], {
      cwd: ROOT_DIR,
      stdio: 'inherit',
      shell: process.platform === 'win32',
    });
    if (res.status !== 0) {
      process.exit(res.status ?? 1);
    }
  } else {
    console.log('\nNext steps:');
    console.log('  1. npm install');
    console.log('  2. npm run verify');
  }
}

void main();
