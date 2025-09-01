import '@esotericsoftware/spine-pixi-v8';
import { Application, Assets, FillGradient, Graphics, Matrix, MeshRope, Point, Sprite, Text, TextStyle, Texture } from 'pixi.js';
import { SlotGameController } from './game/controllers/SlotGameController';
import { SpinController } from './engine/controllers/SpinController';
import { ReelsController } from './engine/reels/ReelsController';
import { ResponsiveManager } from './engine/utils/ResponsiveManager';
import { SpinResponseData, CascadeStepData, InitialGridData, ISpinState } from './engine/types/GameTypes';
import { BackgroundContainer } from './engine/components/BackgroundContainer';
import { AssetLoader } from './engine/utils/AssetLoader';
import { AssetsConfig } from './config/AssetsConfig';
import { GameConfig } from './config/GameConfig';
import { Loader } from './engine/utils/Loader';
import { debug } from './engine/utils/debug';
import { WinLinesContainer } from './engine/components/WinLinesContainer';

export class DoodleV8Main {
    private app!: Application;
    private responsiveManager!: ResponsiveManager;
    private slotGameController?: SlotGameController;
    private spinController?: SpinController;
    private reelsController?: ReelsController;
    private assetLoader!: AssetLoader;

    public async init(): Promise<void> {
        try {
            debug.log('🎰 DoodleV8 initializing...');

            // Initialize AssetLoader singleton instance
            this.assetLoader = AssetLoader.getInstance();

            // Initialize SlotGameController first (needed for grid generation)
            this.slotGameController = SlotGameController.getInstance();

            let initData: InitialGridData;
            try {
                initData = await this.slotGameController.generateInitialGrid();
            } catch (error) {
                debug.error('❌ Failed to generate initial grid:', error);
                throw error;
            }

            // Step 1: Initialize PIXI Application with modern config
            await this.initializePixiApp();

            // Step 2: Initialize responsive system
            this.initializeResponsiveSystem();

            // Step 3: Load assets with progress bar BEFORE creating controllers (symbols need textures)
            await Promise.all([
                this.startLoader(),
                this.loadAssets()
            ]);
            // Step 4: Initialize controllers (now that assets are loaded)
            this.initializeControllers(initData);

            // Set up controllers callbacks
            this.setupControllersCallbacks();
            // Step 5: Create scene/sprites
            this.createScene();

            // Step 6: Start game systems (controllers handle the game loop)

            // Add keyboard handlers
            window.addEventListener('keydown', (event) => {
                switch (event.key.toLowerCase()) {
                    case ' ':
                        debug.log('🎲 Manual spin triggered');
                        if (this.spinController) {
                            if (this.spinController.getIsSpinning() === false) {
                                this.spinController.executeSpin({
                                    betAmount: 10,
                                    gameMode: 'manual'
                                });
                            } else {
                                this.spinController.forceStop();
                            }
                        }
                        break;
                    case 'f':
                        debug.log('🔄 Fast spin triggered');
                        if (this.spinController && this.spinController.getIsSpinning()) {
                            this.spinController.forceStop();
                        }
                        break;
                    case 'a':
                        debug.log('🔄 Auto-play triggered');
                        if (GameConfig.AUTO_PLAY.enabled && this.spinController && !this.spinController.getIsAutoPlaying()) {
                            this.spinController.startAutoPlay(GameConfig.AUTO_PLAY.count || 5); // Start 5 auto spins
                        }
                        break;
                    case 'q':
                        debug.log('🛑 Stop auto-play');
                        if (this.spinController && this.spinController.getIsAutoPlaying() && this.spinController.getAutoPlayCount() > 0) {
                            this.spinController.stopAutoPlay();
                        }
                        break;
                    case 'w':
                        debug.log('🎉 Show random win animation');
                        if (this.reelsController && !this.reelsController.getIsSpinning() && GameConfig.WIN_ANIMATION.enabled) {
                            this.reelsController.playRandomWinAnimation();
                        }
                        break;
                    case 's':
                        debug.log('⏹️ Skip win animations');
                        if (this.reelsController) {
                            this.reelsController.skipWinAnimations();
                        }
                        break;
                    case '1':
                        debug.log('⚡ Fast mode enabled');
                        // Fast mode would be handled differently
                        break;
                    case '2':
                        debug.log('🚀 Instant mode enabled');
                        // Instant mode would be handled differently
                        break;
                    case '3':
                        debug.log('🐌 Slow mode enabled');
                        // Slow mode would be handled differently
                        break;
                }
            });

            // Step 7: Start the main game loop
            this.startGameLoop();

            debug.log('✅ DoodleV8 initialization complete!');
            debug.log('🎯 Press SPACE to spin');
            debug.log('🔄 Press A for auto-play');
            debug.log('🛑 Press Q to stop auto-play');
            debug.log('🎉 Press W to show random win animation');
            debug.log('⏹️ Press S to skip win animations');
            debug.log('⚡ Press 1 for fast mode, 2 for instant, 3 for slow');

            this.responsiveManager.onResize();
        } catch (error) {
            debug.error('❌ Failed to initialize DoodleV8:', error);
            throw error;
        }
    }

    private startGameLoop(): void {
        // Start the main game loop using PIXI's ticker
        if (this.app && this.reelsController) {
            this.app.ticker.add((ticker) => {
                // Update reels controller (which updates all reel controllers)
                // ticker.deltaTime is the time elapsed since last frame
                this.reelsController?.update(ticker.deltaTime);
            });

            debug.log('🎰 Game loop started');
        }
    }

    private async initializePixiApp(): Promise<void> {
        // Step 1: Initialize PIXI Application using modern syntax
        this.app = new Application();

        await this.app.init({
            width: window.innerWidth,
            height: window.innerHeight,
            backgroundColor: 0x1099bb,
            resizeTo: window
        });

        // Add to DOM
        document.getElementById('pixi-container')?.appendChild(this.app.canvas);

        // Add global reference for debugging
        (globalThis as any).__PIXI_APP__ = this.app;

        debug.log('PIXI Application initialized');
    }

    private initializeResponsiveSystem(): void {
        this.responsiveManager = ResponsiveManager.getInstance(this.app);
    }

    private initializeControllers(initData: InitialGridData): void {
        // Step 3: Initialize controllers with new architecture
        // slotGameController already initialized in init() method

        // Create ReelsController first
        this.reelsController = new ReelsController(initData, this.app);

        // Create SpinController with ReelsController dependency
        this.spinController = new SpinController({
            reelsController: this.reelsController,
            defaultSpinDuration: 2000,
            staggerDelay: 150
        });
    }

    private setupControllersCallbacks(): void {
        if (!this.spinController) return;

        this.spinController.setOnSpinStartCallback(() => {
            debug.log('🎲 Spin started!');
        });

        this.spinController.setOnSpinCompleteCallback((result: SpinResponseData) => {
            debug.log('✅ Spin completed!', result);
        });

        this.spinController.setOnCascadeStepCallback((step: CascadeStepData) => {
            debug.log('💥 Cascade step:', step.step);
        });

        this.spinController.setOnErrorCallback((error: string) => {
            debug.error('❌ Spin error:', error);
        });
    }

    private async startLoader(): Promise<void> {
        const loader = Loader.getInstance();
        loader.init();
        loader.mount(this.app);
        // set custom loader timings (milliseconds)
        loader.setTimings(GameConfig.LOADER_DEFAULT_TIMINGS);
        await loader.progress; // Wait for the loader to complete
    }

    private async loadAssets(): Promise<void> {
        await this.assetLoader.loadBundles(AssetsConfig.getAllAssets());
    }

    private async createScene(): Promise<void> {
        if (!this.reelsController) return;

        const background = new BackgroundContainer(this.app);
        this.app.stage.addChild(background);
        // Get the reels container from the controller
        const reelsContainer = this.reelsController.getReelsContainer();

        // Add the reels container to the stage
        this.app.stage.addChild(reelsContainer);

        const winLinesContainer = WinLinesContainer.getInstance();
        this.app.stage.addChild(winLinesContainer);

        const defaultPlayer = this.slotGameController?.getDefaultPlayer();

        // Set initial mode to static
        this.reelsController.setMode(ISpinState.IDLE);
    }
}

// Initialize and start the game
const game = new DoodleV8Main();
game.init().catch(error => {
    console.error('Failed to start game:', error);
}); 