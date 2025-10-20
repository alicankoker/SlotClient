import {
  Application,
  Assets,
  Container,
  FillGradient,
  Graphics,
  Matrix,
  MeshRope,
  Point,
  RenderTexture,
  Sprite,
  Text,
  TextStyle,
  Texture,
  TextureSource
} from "pixi.js";
import { SlotGameController } from "./game/controllers/SlotGameController";
import { SpinController } from "./engine/Spin/SpinController";
import { ReelsController } from "./engine/reels/ReelsController";
import { ResponsiveManager } from "./engine/utils/ResponsiveManager";
import {
  SpinResponseData,
  CascadeStepData,
  GridData,
  ISpinState,
  BigWinType,
  SpinMode,
} from "./engine/types/GameTypes";
import { AssetSizeManager } from "./engine/multiResolutionSupport/AssetSizeManager";
import '@esotericsoftware/spine-pixi-v8';
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
import { eventBus } from './communication/EventManagers/WindowEventManager';
import { GameRulesConfig } from './config/GameRulesConfig';
import { GameEventTypes, CommunicationEventTypes, SpinEventTypes } from "./communication";
import { EVENT_CHANNELS } from "./communication/Channels/EventChannels";
import { GameDataManager } from "./engine/data/GameDataManager";

export class DoodleV8Main {
  private app!: Application;
  private responsiveManager!: ResponsiveManager;
  private slotGameController?: SlotGameController;
  private spinController?: SpinController;
  private reelsController?: ReelsController;
  private bigWinContainer!: BigWin;
  private assetLoader!: AssetLoader;
  private assetResolutionChooser!: AssetSizeManager;
  private _spinModeText!: Text;

  public async init(): Promise<void> {
    try {
      console.log("🎰 DoodleV8 initializing...");


      // Step 1: Initialize PIXI Application with modern config
      await this.initializePixiApp();
      // Initialize AssetLoader singleton instance
      this.assetLoader = AssetLoader.getInstance();
      this.assetResolutionChooser = AssetSizeManager.getInstance();
      console.log("Asset Size: ", this.assetResolutionChooser.assetSize);

      // Step 2: Initialize responsive system
      this.initializeResponsiveSystem();

      // Step 3: Load assets with progress bar BEFORE creating controllers (symbols need textures)
      await Promise.all([
        this.loadAssets(this.assetResolutionChooser.assetSize.name),
        this.startLoader(),
      ]);

      // Initialize GameDataManager first
      const gameDataManager = GameDataManager.getInstance();
      
      // Initialize SlotGameController first (needed for grid generation)
      this.slotGameController = new SlotGameController(this.app)

      let initData: GridData;
      try {
        initData = await this.slotGameController.generateInitialGrid();
      } catch (error) {
        console.error("❌ Failed to generate initial grid:", error);
        throw error;
      }
      
      const storage = Storage.getInstance();
      storage.setItem("player_balance", 1000);

      if (localStorage.getItem("featureScreenDontShow") !== "true") {
        const featureScreen = new FeatureScreen(this.app);
        this.app.stage.addChild(featureScreen);

        this.responsiveManager.onResize();

        await featureScreen.waitForClose();
      } else {
        eventBus.emit("showUI");
      }

      // Step 4: Initialize controllers (now that assets are loaded)
      this.initializeControllers(initData as GridData);

      // Set up controllers callbacks
      this.setupControllersCallbacks();
      // Step 5: Create scene/sprites
      this.createScene();

      // localStorage.getItem('featureScreenDontShow') === 'true' && eventBus.emit("showUI");

      // Step 6: Start game systems (controllers handle the game loop)

      //TO-DO: this needs to be moved to a separate place
      // Add keyboard handlers
      window.addEventListener("keydown", (event) => {
        switch (event.key.toLowerCase()) {
          case " ":
            console.log("🎲 Manual spin triggered");
            if (this.slotGameController?.spinController) {
              if (
                this.slotGameController.spinController.getIsSpinning() === false &&
                this.bigWinContainer.isBigWinActive === false &&
                this.slotGameController.spinController.getIsAutoPlaying() === false
              ) {
                eventBus.emit(SpinEventTypes.REQUEST, "manual_spin");
                this.slotGameController.executeGameSpin(10, "manual");
              } else {
                GameConfig.FORCE_STOP.enabled &&
                  this.slotGameController.spinController.forceStop();
              }
            }
            break;
          case "f":
            console.log("🔄 Force stop triggered");
            if (
              this.slotGameController?.spinController &&
              this.slotGameController.spinController.getIsSpinning() &&
              GameConfig.FORCE_STOP.enabled
            ) {
              this.slotGameController.spinController.forceStop();
            }
            break;
          case "a":
            console.log("🔄 Auto-play triggered");
            if (
              GameConfig.AUTO_PLAY.enabled &&
              this.slotGameController?.spinController &&
              this.slotGameController.spinController.getIsSpinning() === false &&
              this.slotGameController.spinController.getIsAutoPlaying() === false &&
              this.bigWinContainer.isBigWinActive === false
            ) {
              /*this.slotGameController.spinController.startAutoPlay(
                GameConfig.AUTO_PLAY.count || 5
              ); // Start 5 auto spins*/
            }
            break;
          case "q":
            console.log("🛑 Stop auto-play");
            if (
              this.slotGameController?.spinController &&
              this.slotGameController.spinController.getIsAutoPlaying() &&
              this.slotGameController.spinController.getAutoPlayCount() > 0
            ) {
              this.slotGameController.spinController.stopAutoPlay();
            }
            break;
          case "w":
            console.log("🎉 Show random win animation");
            if (
              this.slotGameController?.reelsController &&
              !this.slotGameController.reelsController.getIsSpinning() &&
              GameConfig.WIN_ANIMATION.enabled &&
              this.bigWinContainer.isBigWinActive === false
            ) {
              this.slotGameController.reelsController.playRandomWinAnimation();
            }
            break;
          case "s":
            console.log("⏹️ Skip win animations");
            if (
              this.slotGameController?.reelsController &&
              this.slotGameController.reelsController.getStaticContainer()?.isPlaying === true
            ) {
              this.slotGameController.reelsController.skipWinAnimations();
            }
            break;
          case "b":
            console.log("🎉 Show big win animation");
            if (
              this.bigWinContainer &&
              GameConfig.BIG_WIN.enabled &&
              !this.slotGameController?.reelsController?.getIsSpinning()
            ) {
              this.bigWinContainer.showBigWin(15250, BigWinType.INSANE); // Example big win amount and type
            }
            break;
          case "1":
            console.log(" Normal mode activated");
            if (
              this.slotGameController?.spinController &&
              this.slotGameController.spinController.getSpinMode() !== GameConfig.SPIN_MODES.NORMAL
            ) {
              this.slotGameController.spinController.setSpinMode(
                GameConfig.SPIN_MODES.NORMAL as SpinMode
              );

              gsap.killTweensOf([
                this._spinModeText,
                this._spinModeText.position,
                this._spinModeText.scale,
              ]);
              this._spinModeText.position.set(
                GameConfig.REFERENCE_RESOLUTION.width / 2,
                GameConfig.REFERENCE_RESOLUTION.height / 2
              );

              gsap.fromTo(
                this._spinModeText,
                { alpha: 0, scale: 0 },
                {
                  alpha: 1,
                  scale: 1,
                  duration: 0.25,
                  ease: "back.out(2)",
                  onStart: () => {
                    this._spinModeText.text = `Fast Spin Mode Off!`;
                    this._spinModeText.visible = true;
                  },
                  onComplete: () => {
                    gsap.to(this._spinModeText, {
                      alpha: 0,
                      duration: 0.25,
                      ease: "none",
                      delay: 0.15,
                    });

                    gsap.to(this._spinModeText.position, {
                      y: GameConfig.REFERENCE_RESOLUTION.height / 2 - 25,
                      duration: 0.25,
                      ease: "none",
                      delay: 0.15,
                      onComplete: () => {
                        this._spinModeText.visible = false;
                      },
                    });
                  },
                }
              );
            }
            break;
          case "2":
            console.log("⚡ Fast mode activated");
            if (
              this.slotGameController?.spinController &&
              this.slotGameController.spinController.getSpinMode() !== GameConfig.SPIN_MODES.FAST
            ) {
              this.slotGameController.spinController.setSpinMode(
                GameConfig.SPIN_MODES.FAST as SpinMode
              );

              gsap.killTweensOf([
                this._spinModeText,
                this._spinModeText.position,
                this._spinModeText.scale,
              ]);
              this._spinModeText.position.set(
                GameConfig.REFERENCE_RESOLUTION.width / 2,
                GameConfig.REFERENCE_RESOLUTION.height / 2
              );

              gsap.fromTo(
                this._spinModeText,
                { alpha: 0, scale: 0 },
                {
                  alpha: 1,
                  scale: 1,
                  duration: 0.25,
                  ease: "back.out(2)",
                  onStart: () => {
                    this._spinModeText.text = `Fast Spin Mode On!`;
                    this._spinModeText.visible = true;
                  },
                  onComplete: () => {
                    gsap.to(this._spinModeText, {
                      alpha: 0,
                      duration: 0.25,
                      ease: "none",
                      delay: 0.15,
                    });

                    gsap.to(this._spinModeText.position, {
                      y: GameConfig.REFERENCE_RESOLUTION.height / 2 - 25,
                      duration: 0.25,
                      ease: "none",
                      delay: 0.15,
                      onComplete: () => {
                        this._spinModeText.visible = false;
                      },
                    });
                  },
                }
              );
            }
            break;
        }
      });

      // Step 7: Start the main game loop
      this.startGameLoop();

      console.log("✅ DoodleV8 initialization complete!");
      console.log("🎯 Press SPACE to spin");
      console.log("🔄 Press A for auto-play");
      console.log("🛑 Press Q to stop auto-play");
      console.log("🎉 Press W to show random win animation");
      console.log("⏹️ Press S to skip win animations");
      console.log("⚡ Press 1 for normal mode, 2 for fast mode");

      this.responsiveManager.onResize();
    } catch (error) {
      console.error("❌ Failed to initialize DoodleV8:", error);
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

      console.log("🎰 Game loop started");
    }
  }

  private async initializePixiApp(): Promise<void> {
    // Step 1: Initialize PIXI Application using modern syntax
    this.app = new Application();

    await this.app.init({
      width: window.innerWidth,
      height: window.innerHeight,
      backgroundColor: 0x1099bb,
      resizeTo: window,
    });

    // Add to DOM
    document.getElementById("pixi-container")?.appendChild(this.app.canvas);

    // Add global reference for debugging
    (globalThis as any).__PIXI_APP__ = this.app;

    console.log("PIXI Application initialized");
  }

  private initializeResponsiveSystem(): void {
    this.responsiveManager = ResponsiveManager.getInstance(this.app);
  }

  private initializeControllers(initData: GridData): void {
    // Step 3: Initialize controllers with new architecture
    // slotGameController already initialized in init() method

    // Create ReelsController first
    //this.reelsController = new ReelsController(this.app, initData);

  }

  private setupControllersCallbacks(): void {
    if (!this.slotGameController?.spinController) return;

    this.slotGameController.spinController.setOnSpinStartCallback(() => {
      console.log("🎲 Spin started!");
    });

    this.slotGameController.spinController.setOnSpinCompleteCallback(
      (result: SpinResponseData) => {
        console.log("✅ Spin completed!", result);
      }
    );

    this.slotGameController.spinController.setOnCascadeStepCallback((step: CascadeStepData) => {
      console.log("💥 Cascade step:", step.step);
    });

    this.slotGameController.spinController.setOnErrorCallback((error: string) => {
      console.error("❌ Spin error:", error);
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

  private async loadAssets(res: string): Promise<void> {
    await this.assetLoader.loadBundles(AssetsConfig.getAllAssets(res));
  }

  private async createScene(): Promise<void> {
    //if (!this.reelsController) return;

    const background = new BackgroundContainer(this.app);
    this.app.stage.addChild(background);

    // Add the reels container to the stage
    //this.app.stage.addChild(this.slotGameController!.reelsController.getReelsContainer());
    this.slotGameController!.initialize();

    const winLinesContainer = WinLinesContainer.getInstance();
    this.app.stage.addChild(winLinesContainer);

    this.bigWinContainer = BigWin.getInstance();
    this.app.stage.addChild(this.bigWinContainer);

    //TO-DO: this needs to be moved to Nexus
    const defaultPlayer = this.slotGameController?.getDefaultPlayer();

    // Set initial mode to static
    this.slotGameController!.reelsController!.setMode(ISpinState.IDLE);
  }
}

// Initialize and start the game
const game = new DoodleV8Main();
game.init().catch((error) => {
  console.error("Failed to start game:", error);
});
