import '@esotericsoftware/spine-pixi-v8';
import { Application, Assets, FillGradient, Graphics, Matrix, MeshRope, Point, Sprite, Text, TextStyle, Texture } from 'pixi.js';
import { SlotGameController } from './game/controllers/SlotGameController';
import { SpinController } from './engine/controllers/SpinController';
import { ReelsController } from './engine/reels/ReelsController';
import { ResponsiveManager } from './engine/utils/ResponsiveManager';
import { signals, SCREEN_SIGNALS } from './engine/controllers/SignalManager';
import { SpinResponseData, CascadeStepData, InitialGridData, ISpinState } from './engine/types/GameTypes';
import { Background } from './engine/Background';
import { AssetLoader } from './engine/utils/AssetLoader';
import { AssetsConfig } from './config/AssetsConfig';
import { GameConfig } from './config/GameConfig';
import { Loader } from './engine/utils/Loader';
import { AtlasAttachmentLoader, SkeletonJson, Spine } from '@esotericsoftware/spine-pixi-v8';
import { debug } from './engine/utils/debug';
import { GameRulesConfig } from './config/GameRulesConfig';

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
                            this.spinController.executeSpin({
                                betAmount: 10,
                                gameMode: 'manual'
                            });
                        }
                        break;
                    case 'a':
                        debug.log('🔄 Auto-play triggered');
                        // Auto-play would need to be implemented differently now
                        break;
                    case 'w':
                        debug.log('Show random win animation');
                        if (this.reelsController && !this.reelsController.getIsSpinning()) {
                            this.reelsController.playRandomWinAnimation();
                        }
                        break;
                    case 's':
                        debug.log('Skip win animations');
                        if (this.reelsController) {
                            this.reelsController.skipWinAnimations();
                        }
                        break;
                    case 'x':
                        debug.log('⏹️ Stop auto-play');
                        // Stop functionality would need to be implemented
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
            debug.log('🎯 Press SPACE or S to spin');
            debug.log('🔄 Press A for auto-play');
            debug.log('⏹️ Press X to stop auto-play');
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
        document.body.appendChild(this.app.canvas);

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

        const background = new Background(this.app);
        this.app.stage.addChild(background);
        // Get the reels container from the controller
        const reelsContainer = this.reelsController.getReelsContainer();

        debug.log('=== SCENE CREATION DEBUG ===');
        debug.log('ReelsContainer created:', !!reelsContainer);
        debug.log('ReelsContainer position:', reelsContainer.x, reelsContainer.y);
        debug.log('ReelsContainer size:', reelsContainer.width, reelsContainer.height);
        debug.log('ReelsContainer visible:', reelsContainer.visible);
        debug.log('ReelsContainer children count:', reelsContainer.children.length);

        // Add the reels container to the stage
        this.app.stage.addChild(reelsContainer);

        debug.log('App stage children count:', this.app.stage.children.length);
        debug.log('App screen size:', this.app.screen.width, 'x', this.app.screen.height);

        debug.log('Game initialized. Loading initial reels...');
        const defaultPlayer = this.slotGameController?.getDefaultPlayer();
        debug.log('Current balance:', defaultPlayer?.balance);
        debug.log('Player state:', defaultPlayer);

        // Set initial mode to static
        this.reelsController.setMode(ISpinState.IDLE);

        debug.log('Scene created successfully');
        debug.log('=== END SCENE CREATION DEBUG ===');

        // const { atlas, skeleton } = AssetsConfig.BACKGROUND_ANIMATIONS_ASSET;
        // const atlasAsset = Assets.get(atlas);
        // const skeletonAsset = Assets.get(skeleton);

        // const attachmentLoader = new AtlasAttachmentLoader(atlasAsset);
        // const json = new SkeletonJson(attachmentLoader);
        // const skeletonData = json.readSkeletonData(skeletonAsset);

        // const cloud = new Spine(skeletonData);

        // cloud.skeleton.setSlotsToSetupPose();

        // cloud.state.data.defaultMix = 0.5;

        // cloud.state.setAnimation(0, 'Background_Landscape_Cloud', true);
        // cloud.position.set(GameConfig.REFERENCE_RESOLUTION.width / 2, GameConfig.REFERENCE_RESOLUTION.height / 2);
        // this.app.stage.addChild(cloud);

        // const rabbit = new Spine(skeletonData);

        // rabbit.skeleton.setSlotsToSetupPose();

        // rabbit.state.data.defaultMix = 0.5;

        // rabbit.state.setAnimation(0, 'Background_Landscape_Rabbit', true);
        // rabbit.position.set(GameConfig.REFERENCE_RESOLUTION.width / 2, GameConfig.REFERENCE_RESOLUTION.height / 2);
        // this.app.stage.addChild(rabbit);

        // const glows = new Spine(skeletonData);

        // glows.skeleton.setSlotsToSetupPose();

        // glows.state.data.defaultMix = 0.5;

        // glows.state.setAnimation(0, 'Background_Landscape_Glows', true);
        // glows.position.set(GameConfig.REFERENCE_RESOLUTION.width / 2, GameConfig.REFERENCE_RESOLUTION.height / 2);
        // this.app.stage.addChild(glows);

        // let fillGradientStops: FillGradient = new FillGradient({
        //     colorStops: [
        //         {
        //             offset: 0,
        //             color: 0xffffff
        //         },
        //         {
        //             offset: 0.7,
        //             color: 0xffffff
        //         },
        //         {
        //             offset: 1,
        //             color: 0xa2bdfb
        //         }
        //     ]
        // });

        // let textStyle: TextStyle = new TextStyle({
        //     dropShadow: {
        //         angle: 1.5,
        //         color: 0x142c54,
        //         distance: 4.5
        //     },
        //     fill: fillGradientStops,
        //     fontFamily: "Nunito Black",
        //     fontSize: 75,
        //     fontWeight: "bolder",
        //     stroke: {
        //         color: 0x142c54,
        //         width: 6
        //     },
        // });

        // let text = new Text({ text: 'Hello Spine!', style: textStyle });
        // text.position.set(600, 130);
        // text.anchor.set(0.5, 0.5);

        // this.app.stage.addChild(text);
    }
}

// Initialize and start the game
const game = new DoodleV8Main();
game.init().catch(error => {
    console.error('Failed to start game:', error);
}); 