import '@esotericsoftware/spine-pixi-v8';
import { Application, Assets, Container, FillGradient, Graphics, Matrix, MeshRope, Point, RenderTexture, Sprite, Text, TextStyle, Texture, TextureSource } from 'pixi.js';
import { SlotGameController } from './game/controllers/SlotGameController';
import { SpinController } from './engine/controllers/SpinController';
import { ReelsController } from './engine/reels/ReelsController';
import { ResponsiveManager } from './engine/utils/ResponsiveManager';
import { SpinResponseData, CascadeStepData, InitialGridData, ISpinState, BigWinType, SpinMode } from './engine/types/GameTypes';
import { BackgroundContainer } from './engine/components/BackgroundContainer';
import { AssetLoader } from './engine/utils/AssetLoader';
import { AssetsConfig } from './config/AssetsConfig';
import { GameConfig } from './config/GameConfig';
import { Loader } from './engine/utils/Loader';
import { debug } from './engine/utils/debug';
import { WinLinesContainer } from './engine/components/WinLinesContainer';
import { BigWin } from './engine/components/BigWin';
import { gsap } from 'gsap';
import { FeatureScreen } from './engine/components/FeatureScreen';
import { Storage } from './engine/utils/Storage';
import { eventBus } from './engine/utils/WindowEventManager';
import { GameRulesConfig } from './config/GameRulesConfig';

export class DoodleV8Main {
    private app!: Application;
    private responsiveManager!: ResponsiveManager;
    private slotGameController?: SlotGameController;
    private spinController?: SpinController;
    private reelsController?: ReelsController;
    private bigWinContainer!: BigWin;
    private assetLoader!: AssetLoader;
    private _spinModeText!: Text;

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
                this.loadAssets(),
                this.startLoader()
            ]);

            const storage = Storage.getInstance();
            storage.setItem('player_balance', 1000);

            if (localStorage.getItem('featureScreenDontShow') !== 'true') {
                const featureScreen = new FeatureScreen(this.app);
                this.app.stage.addChild(featureScreen);

                this.responsiveManager.onResize();

                await featureScreen.waitForClose();
            } else {
                eventBus.emit("showUI");
            }

            // Step 4: Initialize controllers (now that assets are loaded)
            this.initializeControllers(initData);

            // Set up controllers callbacks
            this.setupControllersCallbacks();
            // Step 5: Create scene/sprites
            this.createScene();

            this._spinModeText = new Text({ text: ``, style: GameConfig.style.clone() });
            this._spinModeText.anchor.set(0.5, 0.5);
            this._spinModeText.position.set(GameConfig.REFERENCE_RESOLUTION.width / 2, GameConfig.REFERENCE_RESOLUTION.height / 2);
            this._spinModeText.visible = false; // Hide by default
            this.app.stage.addChild(this._spinModeText);

            // Step 6: Start game systems (controllers handle the game loop)

            // Add keyboard handlers
            window.addEventListener('keydown', (event) => {
                switch (event.key.toLowerCase()) {
                    case ' ':
                        debug.log('🎲 Manual spin triggered');
                        if (this.spinController) {
                            if (this.spinController.getIsSpinning() === false && this.bigWinContainer.isBigWinActive === false && this.spinController.getIsAutoPlaying() === false) {
                                storage.getItem('player_balance');
                                this.spinController.executeSpin({
                                    betAmount: 10,
                                    gameMode: 'manual'
                                });
                            } else {
                                GameConfig.FORCE_STOP.enabled && this.spinController.forceStop();
                            }
                        }
                        break;
                    case 'f':
                        debug.log('🔄 Force stop triggered');
                        if (this.spinController && this.spinController.getIsSpinning() && GameConfig.FORCE_STOP.enabled) {
                            this.spinController.forceStop();
                        }
                        break;
                    case 'a':
                        debug.log('🔄 Auto-play triggered');
                        if (GameConfig.AUTO_PLAY.enabled && this.spinController && this.spinController.getIsSpinning() === false && this.spinController.getIsAutoPlaying() === false && this.bigWinContainer.isBigWinActive === false) {
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
                        if (this.reelsController && !this.reelsController.getIsSpinning() && GameConfig.WIN_ANIMATION.enabled && this.bigWinContainer.isBigWinActive === false) {
                            this.reelsController.playRandomWinAnimation();
                        }
                        break;
                    case 's':
                        debug.log('⏹️ Skip win animations');
                        if (this.reelsController && this.reelsController.getStaticContainer()?.isPlaying === true) {
                            this.reelsController.skipWinAnimations();
                        }
                        break;
                    case 'b':
                        debug.log('🎉 Show big win animation');
                        if (this.bigWinContainer && GameConfig.BIG_WIN.enabled && !this.reelsController?.getIsSpinning()) {
                            this.bigWinContainer.showBigWin(15250, BigWinType.INSANE); // Example big win amount and type
                        }
                        break;
                    case '1':
                        debug.log(' Normal mode activated');
                        if (this.spinController && this.spinController.getSpinMode() !== GameConfig.SPIN_MODES.NORMAL) {
                            this.spinController.setSpinMode(GameConfig.SPIN_MODES.NORMAL as SpinMode);

                            gsap.killTweensOf([this._spinModeText, this._spinModeText.position, this._spinModeText.scale]);
                            this._spinModeText.position.set(GameConfig.REFERENCE_RESOLUTION.width / 2, GameConfig.REFERENCE_RESOLUTION.height / 2);

                            gsap.fromTo(this._spinModeText, { alpha: 0, scale: 0 }, {
                                alpha: 1, scale: 1, duration: 0.25, ease: 'back.out(2)',
                                onStart: () => {
                                    this._spinModeText.text = `Fast Spin Mode Off!`;
                                    this._spinModeText.visible = true;
                                }, onComplete: () => {
                                    gsap.to(this._spinModeText, {
                                        alpha: 0, duration: 0.25, ease: 'none', delay: 0.15,
                                    });

                                    gsap.to(this._spinModeText.position, {
                                        y: GameConfig.REFERENCE_RESOLUTION.height / 2 - 25, duration: 0.25, ease: 'none', delay: 0.15,
                                        onComplete: () => {
                                            this._spinModeText.visible = false;
                                        }
                                    });
                                }
                            });
                        }
                        break;
                    case '2':
                        debug.log('⚡ Fast mode activated');
                        if (this.spinController && this.spinController.getSpinMode() !== GameConfig.SPIN_MODES.FAST) {
                            this.spinController.setSpinMode(GameConfig.SPIN_MODES.FAST as SpinMode);

                            gsap.killTweensOf([this._spinModeText, this._spinModeText.position, this._spinModeText.scale]);
                            this._spinModeText.position.set(GameConfig.REFERENCE_RESOLUTION.width / 2, GameConfig.REFERENCE_RESOLUTION.height / 2);

                            gsap.fromTo(this._spinModeText, { alpha: 0, scale: 0 }, {
                                alpha: 1, scale: 1, duration: 0.25, ease: 'back.out(2)',
                                onStart: () => {
                                    this._spinModeText.text = `Fast Spin Mode On!`;
                                    this._spinModeText.visible = true;
                                }, onComplete: () => {
                                    gsap.to(this._spinModeText, {
                                        alpha: 0, duration: 0.25, ease: 'none', delay: 0.15,
                                    });

                                    gsap.to(this._spinModeText.position, {
                                        y: GameConfig.REFERENCE_RESOLUTION.height / 2 - 25, duration: 0.25, ease: 'none', delay: 0.15,
                                        onComplete: () => {
                                            this._spinModeText.visible = false;
                                        }
                                    });
                                }
                            });
                        }
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
            debug.log('⚡ Press 1 for normal mode, 2 for fast mode');

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
        const loader = Loader.getInstance(this.app);
        await loader.create();
        loader.mount();
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

        this.bigWinContainer = BigWin.getInstance();
        this.app.stage.addChild(this.bigWinContainer);

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