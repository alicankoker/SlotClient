# SlotClient Monorepo

A monorepo structure for slot game development, built with TypeScript, Pixi.js, and pnpm workspaces.

## 🎮 How to Run Games

### Quick Start

**From the root directory:**
```bash
pnpm start
```
This will start the default game (diamond-diggers) on **http://localhost:3000**

### Running Specific Games

**Option 1: From root using pnpm filter**
```bash
# Run diamond-diggers
pnpm --filter @slotclient/diamond-diggers start

# Run any other game (replace game-name with actual package name)
pnpm --filter @slotclient/game-name start
```

**Option 2: From the game directory**
```bash
# Navigate to the game
cd src/games/diamondDiggers
# or
cd packages/games/diamondDiggers

# Start the game
pnpm start
```

**Option 3: Using the dev script**
```bash
# From root (runs default game)
pnpm dev
```

### Port Configuration

- All games are configured to run on **port 3000** with `strictPort: true`
- If port 3000 is in use, the server will fail to start (no auto-increment)
- To free port 3000: `lsof -ti:3000 | xargs kill -9`

### Available Games

- **Diamond Diggers** - `@slotclient/diamond-diggers`
  - Run: `pnpm --filter @slotclient/diamond-diggers start`
  - Location: `packages/games/diamondDiggers/` or `src/games/diamondDiggers/`

## 📁 Project Structure

```
SlotClient/
├── packages/
│   ├── types/              # Shared type definitions and event bus
│   ├── config/              # Shared configuration files
│   ├── engine/              # Core game engine
│   ├── nexus/               # Player and state management
│   ├── communication/       # Communication layer (Socket.IO, adapters)
│   ├── server/              # Server-side game logic
│   └── games/               # Game implementations
│       └── diamondDiggers/  # Diamond Diggers game
├── assets/                  # Shared game assets (fonts, images, sounds)
└── src/                     # Legacy source files (symlinked to packages)
```

## 🚀 Getting Started

### Prerequisites

- Node.js >= 17.0.0
- pnpm >= 7.0.0

### Installation

```bash
# Install pnpm globally if you haven't already
npm install -g pnpm@7.33.7

# Install all dependencies
pnpm install
```

## 🎮 Running Games

### Run from Root

```bash
# Start the default game (diamond-diggers)
pnpm start

# Or use the dev script
pnpm dev
```

### Run from Game Directory

```bash
# Navigate to the game directory
cd src/games/diamondDiggers
# or
cd packages/games/diamondDiggers

# Start the game
pnpm start
```

The game will start on **http://localhost:3000** (strict port, will fail if port is in use).

## 📦 Packages

### Core Packages

- **`@slotclient/types`** - Shared type definitions and event bus
- **`@slotclient/config`** - Shared configuration (GameConfig, AssetsConfig, ConnectionConfig)
- **`@slotclient/engine`** - Core game engine with Pixi.js
- **`@slotclient/nexus`** - Player management and game state
- **`@slotclient/communication`** - Communication layer and adapters
- **`@slotclient/server`** - Server-side game logic

### Game Packages

- **`@slotclient/diamond-diggers`** - Diamond Diggers game implementation

## 🛠️ Development

### Build All Packages

```bash
pnpm build
```

### Build Specific Package

```bash
pnpm build:types
pnpm build:engine
pnpm build:nexus
pnpm build:communication
pnpm build:config
pnpm build:server
pnpm build:diamond-diggers
```

### Type Checking

```bash
# Check all packages
pnpm type-check

# Check specific package
pnpm --filter @slotclient/diamond-diggers type-check
```

### Clean

```bash
# Clean all build artifacts
pnpm clean
```

## 🎯 Creating a New Game

The easiest way to create a new game is using the built-in `create-game` script:

### Quick Start

```bash
# From the root directory
pnpm create-game <game-name>
```

**Example:**
```bash
pnpm create-game my-awesome-game
```

This will create a new game project with all necessary files and folder structure.

### What Gets Created

The script automatically creates:
- ✅ Complete directory structure (`src/`, `public/assets/`, `controllers/`)
- ✅ `package.json` with all required dependencies
- ✅ `tsconfig.json` with proper TypeScript configuration
- ✅ `vite.config.ts` with build configuration
- ✅ `index.html` entry point
- ✅ `vite-env.d.ts` for TypeScript types
- ✅ Starter source files (`main.ts`, `config.ts`, `SlotGame.ts`, `SlotGameController.ts`)

### Next Steps After Creating a Game

1. **Install dependencies:**
   ```bash
   # Option 1: From root using pnpm filter
   pnpm install --filter @slotclient/<game-name>
   
   # Option 2: Navigate to game directory
   cd packages/games/<game-name>
   pnpm install
   ```

2. **Add your game assets:**
   - Place assets in `packages/games/<game-name>/public/assets/`
   - Follow the same structure as `diamondDiggers` (animations, art, fonts, sounds, etc.)

3. **Start developing:**
   ```bash
   # From root
   pnpm --filter @slotclient/<game-name> start
   
   # Or from game directory
   cd packages/games/<game-name>
   pnpm start
   ```

4. **Customize your game:**
   - Edit `src/main.ts` to customize initialization
   - Edit `src/config.ts` for game-specific configuration
   - Implement your game logic in `src/SlotGame.ts` and `src/controllers/SlotGameController.ts`

### Game Naming Convention

- The script automatically converts your game name to:
  - **kebab-case** for package name: `my-awesome-game` → `@slotclient/my-awesome-game`
  - **PascalCase** for class names: `my-awesome-game` → `MyAwesomeGameMain`

### Manual Game Creation (Alternative)

If you prefer to create a game manually:

1. Create a new directory in `packages/games/`:
   ```bash
   mkdir -p packages/games/yourGameName
   ```

2. Copy the structure from an existing game (e.g., `diamondDiggers`)

3. Update `package.json` with your game name and dependencies

4. Install dependencies:
   ```bash
   pnpm install --filter @slotclient/your-game-name
   ```

## 📝 Scripts

### Root Level Scripts

- `pnpm create-game <game-name>` - Create a new game project with all necessary files
- `pnpm start` - Start the default game (diamond-diggers)
- `pnpm dev` - Alias for start
- `pnpm build` - Build all packages
- `pnpm type-check` - Type check all packages
- `pnpm clean` - Clean all build artifacts

## 🔧 Configuration

### Port Configuration

Games are configured to run on port 3000 with `strictPort: true`. If port 3000 is in use, the server will fail to start instead of auto-incrementing to another port.

### Assets

Game assets are located in the root `assets/` directory and are symlinked to each game's `public/` directory. Assets are served at `/assets/...` paths.

## 🏗️ Architecture

### Package Dependencies

```
games/
  └── depends on: engine, nexus, communication, config, types

communication/
  └── depends on: engine, nexus, types

nexus/
  └── depends on: engine, communication, types

server/
  └── depends on: engine, config, communication

engine/
  └── depends on: types, config

config/
  └── depends on: types

types/
  └── no internal dependencies (base package)
```

### Circular Dependency Resolution

Circular dependencies are resolved by:
- Moving shared types to `@slotclient/types`
- Moving `eventBus` to `@slotclient/types`
- Using dependency injection where needed

## 📚 Technology Stack

- **TypeScript** - Type safety
- **Pixi.js v8** - Rendering engine
- **Vite** - Build tool and dev server
- **pnpm** - Package manager with workspaces
- **Socket.IO** - Real-time communication
- **GSAP** - Animation library
- **Howler** - Audio library

## 🐛 Troubleshooting

### Port 3000 Already in Use

Kill the process using port 3000:
```bash
lsof -ti:3000 | xargs kill -9
```

### Missing Dependencies

Reinstall dependencies:
```bash
pnpm install
```

### TypeScript Errors

Clean and rebuild:
```bash
pnpm clean
pnpm build
```

## 📄 License

ISC

