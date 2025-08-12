import { Application, Assets, Sprite, Texture } from 'pixi.js';
import { SlotGameController } from './game/controllers/SlotGameController';
import { SpinController } from './engine/controllers/SpinController';
import { ReelsController } from './engine/reels/ReelsController';
import { ResponsiveManager } from './engine/controllers/ResponsiveSystem';
import { signals, SCREEN_SIGNALS } from './engine/controllers/SignalManager';
import { SpinResponseData, CascadeStepData, InitialGridData, ISpinState } from './engine/types/GameTypes';
import { Background } from './engine/Background';
import { AssetLoader } from './engine/utils/AssetLoader';
import { AssetsConfig } from './config/AssetsConfig';
import { GameConfig } from './config/GameConfig';
import { Loader } from './engine/utils/Loader';

export class DoodleV8Main {
    private app!: Application;
    private slotGameController?: SlotGameController;
    private spinController?: SpinController;
    private reelsController?: ReelsController;
    private responsiveManager?: ResponsiveManager;
    private assetLoader!: AssetLoader;

    public async init(): Promise<void> {
        try {
            console.log('🎰 DoodleV8 initializing...');

            // Initialize AssetLoader singleton instance
            this.assetLoader = AssetLoader.getInstance();

            // Initialize SlotGameController first (needed for grid generation)
            this.slotGameController = SlotGameController.getInstance();

            let initData: InitialGridData;
            try {
                initData = await this.slotGameController.generateInitialGrid();
            } catch (error) {
                console.error('❌ Failed to generate initial grid:', error);
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
            // Send initial resize signal after everything is initialized
            setTimeout(() => {
                signals.emit(SCREEN_SIGNALS.SCREEN_RESIZE);
            }, 100); // Small delay to ensure everything is properly set up

            // Add keyboard handlers
            window.addEventListener('keydown', (event) => {
                switch (event.key.toLowerCase()) {
                    case 's':
                    case ' ':
                        console.log('🎲 Manual spin triggered');
                        if (this.spinController) {
                            this.spinController.executeSpin({
                                betAmount: 10,
                                gameMode: 'manual'
                            });
                        }
                        break;
                    case 'a':
                        console.log('🔄 Auto-play triggered');
                        // Auto-play would need to be implemented differently now
                        break;
                    case 'x':
                        console.log('⏹️ Stop auto-play');
                        // Stop functionality would need to be implemented
                        break;
                    case '1':
                        console.log('⚡ Fast mode enabled');
                        // Fast mode would be handled differently
                        break;
                    case '2':
                        console.log('🚀 Instant mode enabled');
                        // Instant mode would be handled differently
                        break;
                    case '3':
                        console.log('🐌 Slow mode enabled');
                        // Slow mode would be handled differently
                        break;
                }
            });

            // Step 7: Start the main game loop
            this.startGameLoop();

            console.log('✅ DoodleV8 initialization complete!');
            console.log('🎯 Press SPACE or S to spin');
            console.log('🔄 Press A for auto-play');
            console.log('⏹️ Press X to stop auto-play');
            console.log('⚡ Press 1 for fast mode, 2 for instant, 3 for slow');

        } catch (error) {
            console.error('❌ Failed to initialize DoodleV8:', error);
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

            console.log('🎰 Game loop started');
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
        document.body.appendChild(this.app.canvas);

        // Add global reference for debugging
        (globalThis as any).__PIXI_APP__ = this.app;

        console.log('PIXI Application initialized');
    }

    private initializeResponsiveSystem(): void {
        // Step 2: Initialize responsive system
        this.responsiveManager = new ResponsiveManager(this.app);
    }

    private initializeControllers(initData: InitialGridData): void {
        // Step 3: Initialize controllers with new architecture
        if (!this.responsiveManager) return;

        // slotGameController already initialized in init() method

        // Create ReelsController first
        this.reelsController = new ReelsController(initData, this.app, this.responsiveManager);

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
            console.log('🎲 Spin started!');
        });

        this.spinController.setOnSpinCompleteCallback((result: SpinResponseData) => {
            console.log('✅ Spin completed!', result);
        });

        this.spinController.setOnCascadeStepCallback((step: CascadeStepData) => {
            console.log('💥 Cascade step:', step.step);
        });

        this.spinController.setOnErrorCallback((error: string) => {
            console.error('❌ Spin error:', error);
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

    private createScene(): void {
        if (!this.responsiveManager || !this.reelsController) return;


        const background = new Background(
            Texture.from("bg_background_landscape.png"),
            this.app,
            this.responsiveManager
        );
        this.app.stage.addChild(background);
        // Get the reels container from the controller
        const reelsContainer = this.reelsController.getReelsContainer();

        console.log('=== SCENE CREATION DEBUG ===');
        console.log('ReelsContainer created:', !!reelsContainer);
        console.log('ReelsContainer position:', reelsContainer.x, reelsContainer.y);
        console.log('ReelsContainer size:', reelsContainer.width, reelsContainer.height);
        console.log('ReelsContainer visible:', reelsContainer.visible);
        console.log('ReelsContainer children count:', reelsContainer.children.length);

        // Position the reels container at the center of the screen for debugging
        reelsContainer.x = this.app.screen.width / 2;
        reelsContainer.y = this.app.screen.height / 2;
        console.log('ReelsContainer repositioned to center:', reelsContainer.x, reelsContainer.y);

        // Add the reels container to the stage
        this.app.stage.addChild(reelsContainer);

        console.log('App stage children count:', this.app.stage.children.length);
        console.log('App screen size:', this.app.screen.width, 'x', this.app.screen.height);

        console.log('Game initialized. Loading initial reels...');
        const defaultPlayer = this.slotGameController?.getDefaultPlayer();
        console.log('Current balance:', defaultPlayer?.balance);
        console.log('Player state:', defaultPlayer);

        // Set initial mode to static
        this.reelsController.setMode(ISpinState.IDLE);

        console.log('Scene created successfully');
        console.log('=== END SCENE CREATION DEBUG ===');
    }
}

// Initialize and start the game
const game = new DoodleV8Main();
game.init().catch(error => {
    console.error('Failed to start game:', error);
}); 