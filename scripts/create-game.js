#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

// Get game name from command line argument
const gameName = process.argv[2];

if (!gameName) {
  console.error('❌ Error: Game name is required');
  console.log('Usage: pnpm create-game <game-name>');
  console.log('Example: pnpm create-game my-new-game');
  process.exit(1);
}

// Validate game name (kebab-case)
const kebabCaseName = gameName.toLowerCase().replace(/[^a-z0-9-]/g, '-');
const pascalCaseName = kebabCaseName
  .split('-')
  .map(word => word.charAt(0).toUpperCase() + word.slice(1))
  .join('');

const gameDir = path.join(rootDir, 'packages', 'games', kebabCaseName);

// Check if game already exists
if (fs.existsSync(gameDir)) {
  console.error(`❌ Error: Game "${kebabCaseName}" already exists at ${gameDir}`);
  process.exit(1);
}

console.log(`🚀 Creating new game project: ${kebabCaseName}...`);

// Create directory structure
const dirs = [
  gameDir,
  path.join(gameDir, 'src'),
  path.join(gameDir, 'src', 'controllers'),
  path.join(gameDir, 'public'),
  path.join(gameDir, 'public', 'assets'),
];

dirs.forEach(dir => {
  fs.mkdirSync(dir, { recursive: true });
  console.log(`✓ Created directory: ${path.relative(rootDir, dir)}`);
});

// Create package.json
const packageJson = {
  name: `@slotclient/${kebabCaseName}`,
  version: '1.0.0',
  description: `${pascalCaseName} game implementation`,
  type: 'module',
  main: './dist/index.js',
  scripts: {
    start: 'vite',
    dev: 'vite',
    build: 'tsc && vite build',
    preview: 'vite preview',
    'type-check': 'tsc --noEmit',
    clean: 'rm -rf dist',
  },
  dependencies: {
    '@slotclient/types': 'workspace:*',
    '@slotclient/engine': 'workspace:*',
    '@slotclient/nexus': 'workspace:*',
    '@slotclient/communication': 'workspace:*',
    '@slotclient/config': 'workspace:*',
    '@slotclient/server': 'workspace:*',
    '@esotericsoftware/spine-pixi-v8': '~4.2.0',
    gsap: '^3.13.0',
    howler: '^2.2.4',
    'pixi.js': '^8.4.0',
    'socket.io-client': '^4.8.1',
  },
  devDependencies: {
    '@types/node': '^17.0.0',
    '@types/stats': '^0.16.30',
    '@types/howler': '^2.2.12',
    'stats-js': '^1.0.1',
    typescript: '^4.9.0',
    vite: '^3.2.10',
  },
  peerDependencies: {},
  author: '',
  license: 'ISC',
};

fs.writeFileSync(
  path.join(gameDir, 'package.json'),
  JSON.stringify(packageJson, null, 2) + '\n'
);
console.log(`✓ Created package.json`);

// Create tsconfig.json
const tsconfig = {
  extends: '../../../tsconfig.json',
  compilerOptions: {
    outDir: './dist',
    declaration: false,
    noEmit: true,
    skipLibCheck: true,
    baseUrl: '../../..',
    moduleResolution: 'node',
    resolveJsonModule: true,
    paths: {
      '@slotclient/types': ['./packages/types/src/index.ts'],
      '@slotclient/types/*': ['./packages/types/src/*'],
      '@slotclient/engine': ['./packages/engine/src/index.ts'],
      '@slotclient/engine/*': ['./packages/engine/src/*'],
      '@slotclient/nexus': ['./packages/nexus/src/index.ts'],
      '@slotclient/nexus/*': ['./packages/nexus/src/*'],
      '@slotclient/communication': ['./packages/communication/src/index.ts'],
      '@slotclient/communication/*': ['./packages/communication/src/*'],
      '@slotclient/config': ['./packages/config/src/index.ts'],
      '@slotclient/config/*': ['./packages/config/src/*'],
      '@slotclient/server': ['./packages/server/src/index.ts'],
      '@slotclient/server/*': ['./packages/server/src/*'],
    },
  },
  include: ['src/**/*', 'vite-env.d.ts', '../../../packages/**/*'],
  exclude: ['node_modules', 'dist', '**/*.test.ts', '**/*.spec.ts'],
};

fs.writeFileSync(
  path.join(gameDir, 'tsconfig.json'),
  JSON.stringify(tsconfig, null, 2) + '\n'
);
console.log(`✓ Created tsconfig.json`);

// Create vite.config.ts
const viteConfig = `import { defineConfig } from 'vite';
import path from 'path';

export default defineConfig({
  root: __dirname,
  publicDir: path.resolve(__dirname, 'public'),
  build: {
    outDir: path.resolve(__dirname, 'dist'),
    sourcemap: false,
    target: 'es2020',
    rollupOptions: {
      external: ['stats-js'],
      output: {
        manualChunks: () => 'index',
        entryFileNames: 'index.js',
        chunkFileNames: 'index.js',
        assetFileNames: 'assets/[name].[ext]',
      },
    },
  },
  server: {
    port: 3000,
    strictPort: true,
    open: true,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@slotclient/types': path.resolve(__dirname, '../../types/src/index.ts'),
      '@slotclient/engine': path.resolve(__dirname, '../../engine/src'),
      '@slotclient/nexus': path.resolve(__dirname, '../../nexus/src'),
      '@slotclient/communication': path.resolve(__dirname, '../../communication/src'),
      '@slotclient/config': path.resolve(__dirname, '../../config/src'),
      '@slotclient/server': path.resolve(__dirname, '../../server/src'),
    },
  },
  assetsInclude: ['**/*.skel', '**/*.atlas', '**/*.ttf', '**/*.otf'],
});
`;

fs.writeFileSync(path.join(gameDir, 'vite.config.ts'), viteConfig);
console.log(`✓ Created vite.config.ts`);

// Create vite-env.d.ts
const viteEnv = `/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_BACKEND_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv & {
    readonly DEV: boolean;
    readonly PROD: boolean;
    readonly MODE: string;
  };
}
`;

fs.writeFileSync(path.join(gameDir, 'vite-env.d.ts'), viteEnv);
console.log(`✓ Created vite-env.d.ts`);

// Create index.html
const indexHtml = `<!DOCTYPE html>
<html lang="en">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${pascalCaseName} - Slot Game</title>
    <style>
        body {
            margin: 0;
            padding: 0;
            background-color: #1a1a1a;
            font-family: Arial, sans-serif;
            overflow: hidden;
            /* Prevent scrollbars */
        }

        canvas {
            display: block;
        }
    </style>
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/monvanCe/slotcdnjs@main/ui2.9.0.css">
</head>

<body data-path="">
    <script type="module" src="./src/main.ts"></script>
    <div id="ui-container" style="
        position: absolute;
        bottom: 0;
        left: 0;
        width: 100%;
        height: 100%;
        pointer-events: none;
      "></div>
    <div id="pixi-container"></div>
    <script src="https://cdn.jsdelivr.net/gh/monvanCe/slotcdnjs@main/ui2.9.0.js"></script>
</body>

</html>
`;

fs.writeFileSync(path.join(gameDir, 'index.html'), indexHtml);
console.log(`✓ Created index.html`);

// Create src/config.ts
const configTs = `export default {
    BACKEND_URL: import.meta.env.VITE_BACKEND_URL || "https://rngengine.com",
    USER_ID: import.meta.env.DEV ? "6925c237fc5e7e66ae3d2018" : new URLSearchParams(window.location.search).get("session") || undefined,
};
`;

fs.writeFileSync(path.join(gameDir, 'src', 'config.ts'), configTs);
console.log(`✓ Created src/config.ts`);

// Create src/main.ts (simplified starter)
const mainTs = `import { Application } from "pixi.js";
import { SlotGameController } from "./controllers/SlotGameController";
import { ResponsiveManager } from "@slotclient/engine/utils/ResponsiveManager";
import { AssetSizeManager } from "@slotclient/engine/multiResolutionSupport/AssetSizeManager";
import { AssetLoader } from "@slotclient/engine/utils/AssetLoader";
import { AssetsConfig } from "@slotclient/config/AssetsConfig";
import { setConnectionConfig } from "@slotclient/config/ConnectionConfig";
import gameConfig from "./config";
import { debug } from "@slotclient/engine/utils/debug";
import { GameDataManager } from "@slotclient/engine/data/GameDataManager";
import { SocketConnection } from "@slotclient/communication/Connection/SocketConnection";
import SoundManager from "@slotclient/engine/controllers/SoundManager";
import type { AudioBundle } from "@slotclient/engine";

export class ${pascalCaseName}Main {
  private app!: Application;
  private responsiveManager!: ResponsiveManager;
  private slotGameController?: SlotGameController;
  private assetLoader!: AssetLoader;
  private assetResolutionChooser!: AssetSizeManager;

  public async init(): Promise<void> {
    try {
      debug.log("🎰 ${pascalCaseName} initializing...");

      // Initialize connection config from game config
      setConnectionConfig({
        BACKEND_URL: gameConfig.BACKEND_URL,
        USER_ID: gameConfig.USER_ID,
      });

      // Create PixiJS application
      this.app = new Application();
      await this.app.init({
        width: window.innerWidth,
        height: window.innerHeight,
        backgroundColor: 0x000000,
        resolution: window.devicePixelRatio || 1,
        autoDensity: true,
        resizeTo: window,
      });

      document.getElementById("pixi-container")?.appendChild(this.app.canvas);

      // Initialize responsive manager
      this.responsiveManager = ResponsiveManager.getInstance();
      this.responsiveManager.init(this.app);

      // Initialize asset resolution chooser
      this.assetResolutionChooser = AssetSizeManager.getInstance();
      this.assetResolutionChooser.init();

      // Initialize asset loader
      this.assetLoader = AssetLoader.getInstance();

      // Connect to backend
      await this.startLoader();

      // Load assets
      const resolution = this.assetResolutionChooser.getResolution();
      await this.loadAssets(resolution);
      await this.loadAudioAssets();

      // Initialize game controller
      this.slotGameController = SlotGameController.getInstance();
      this.slotGameController.init(this.app);

      debug.log("✅ ${pascalCaseName} initialized successfully!");
    } catch (error) {
      console.error("Failed to initialize ${pascalCaseName}:", error);
      throw error;
    }
  }

  private async startLoader(): Promise<void> {
    const socketConnection = SocketConnection.getInstance();
    await socketConnection.connect();
  }

  private async loadAssets(res: string): Promise<void> {
    await this.assetLoader.loadBundles(AssetsConfig.getAllAssets(res));
  }

  private async loadAudioAssets(): Promise<void> {
    // Load audio separately through SoundManager (not PixiJS Assets)
    const audioBundle = AssetsConfig.getAudioAssets();
    const soundBundle = audioBundle.bundles.find((bundle) => bundle.name === "audio");
    if (soundBundle) {
      const soundManager = SoundManager.getInstance();
      const { assets } = soundBundle as { assets: AudioBundle };
      assets.forEach((asset) => {
        soundManager.add([
          {
            alias: Array.isArray(asset.alias) ? asset.alias[0] : asset.alias,
            src: Array.isArray(asset.src) ? asset.src[0] : asset.src,
            channel: (asset.channel as "sfx" | "music") || "sfx",
          },
        ]);
      });
      debug.log("Audio assets loaded via SoundManager");
    }
  }
}

// Initialize game when DOM is ready
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => {
    const game = new ${pascalCaseName}Main();
    game.init().catch((error) => {
      console.error("Failed to start game:", error);
    });
  });
} else {
  const game = new ${pascalCaseName}Main();
  game.init().catch((error) => {
    console.error("Failed to start game:", error);
  });
}
`;

fs.writeFileSync(path.join(gameDir, 'src', 'main.ts'), mainTs);
console.log(`✓ Created src/main.ts`);

// Create src/SlotGame.ts (placeholder)
const slotGameTs = `import { Application } from 'pixi.js';

export class SlotGame {
    private app: Application;

    constructor(app: Application) {
        this.app = app;
        this.createSlotGame();
    }

    private createSlotGame(): void {
        // TODO: Implement your game logic here
        console.log('SlotGame initialized');
    }
}
`;

fs.writeFileSync(path.join(gameDir, 'src', 'SlotGame.ts'), slotGameTs);
console.log(`✓ Created src/SlotGame.ts`);

// Create src/controllers/SlotGameController.ts (simplified starter)
const slotGameControllerTs = `import { Application } from 'pixi.js';
import { SlotGame } from '../SlotGame';

export class SlotGameController {
    private static instance: SlotGameController;
    private app!: Application;
    private slotGame?: SlotGame;

    private constructor() {}

    public static getInstance(): SlotGameController {
        if (!SlotGameController.instance) {
            SlotGameController.instance = new SlotGameController();
        }
        return SlotGameController.instance;
    }

    public init(app: Application): void {
        this.app = app;
        this.slotGame = new SlotGame(this.app);
    }
}
`;

fs.writeFileSync(
  path.join(gameDir, 'src', 'controllers', 'SlotGameController.ts'),
  slotGameControllerTs
);
console.log(`✓ Created src/controllers/SlotGameController.ts`);

console.log(`\n✅ Game project "${kebabCaseName}" created successfully!`);
console.log(`\n📁 Location: ${path.relative(rootDir, gameDir)}`);
console.log(`\n📝 Next steps:`);
console.log(`   1. cd packages/games/${kebabCaseName}`);
console.log(`   2. pnpm install`);
console.log(`   3. pnpm start`);
console.log(`\n💡 Don't forget to add your game assets to public/assets/`);

