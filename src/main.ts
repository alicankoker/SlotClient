import { Application, Text } from "pixi.js";
import { SlotGameController } from "./game/controllers/SlotGameController";
import { ReelsController } from "./engine/reels/ReelsController";
import { ResponsiveManager } from "./engine/utils/ResponsiveManager";
import { AssetSizeManager } from "./engine/multiResolutionSupport/AssetSizeManager";
import { AssetLoader } from "./engine/utils/AssetLoader";
import { AssetsConfig } from "./config/AssetsConfig";
import { GameConfig } from "./config/GameConfig";
import { Loader } from "./engine/utils/Loader";
import { debug } from "./engine/utils/debug";
import { gsap } from "gsap";
import { Storage } from "./engine/utils/Storage";
import { eventBus } from "./communication/EventManagers/WindowEventManager";
import { SpinEventTypes } from "./communication";
import { GameDataManager } from "./engine/data/GameDataManager";
import { CascadeStepData, GridData, SpinResponseData, } from "./engine/types/ICommunication";
import { ISpinState, SpinMode } from "./engine/types/ISpinConfig";
import { WinEvent } from "./engine/components/WinEvent";
import { Background } from "./engine/components/Background";
import { WinEventType } from "./engine/types/IWinEvents";
import { AnimationContainer } from "./engine/components/AnimationContainer";
import { FeatureScreen } from "./engine/components/FeatureScreen";

export class DoodleV8Main {
  private app!: Application;
  private responsiveManager!: ResponsiveManager;
  private slotGameController?: SlotGameController;
  private reelsController?: ReelsController;
  private winEvent!: WinEvent;
  private assetLoader!: AssetLoader;
  private assetResolutionChooser!: AssetSizeManager;
  private _spinModeText!: Text;

  public async init(): Promise<void> {
    try {
      debug.log("🎰 DoodleV8 initializing...");

      // Step 1: Initialize PIXI Application with modern config
      await this.initializePixiApp();
      // Initialize AssetLoader singleton instance
      this.assetLoader = AssetLoader.getInstance();
      this.assetResolutionChooser = AssetSizeManager.getInstance();
      debug.log("Asset Size: ", this.assetResolutionChooser.assetSize);

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
      this.slotGameController = new SlotGameController(this.app);

      let initData: GridData;
      try {
        initData = await this.slotGameController.generateInitialGrid();
      } catch (error) {
        debug.error("❌ Failed to generate initial grid:", error);
        throw error;
      }

      const storage = Storage.getInstance();
      storage.setItem("player_balance", 1000);

      // if (localStorage.getItem('featureScreenDontShow') !== 'true') {
      //   const featureScreen = new FeatureScreen(this.app);
      //   this.app.stage.addChild(featureScreen);

      //   this.responsiveManager.onResize();

      //   await featureScreen.waitForClose();
      // }

      // Step 4: Initialize controllers (now that assets are loaded)
      this.initializeControllers(initData as GridData);

      // Set up controllers callbacks
      this.setupControllersCallbacks();
      // Step 5: Create scene/sprites
      this.createScene();

      this._spinModeText = AnimationContainer.getInstance().getSpinModeText();

      // const bonusScene = Bonus.getInstance();
      // this.app.stage.addChild(bonusScene);

      // localStorage.getItem('featureScreenDontShow') === 'true' && eventBus.emit("showUI");

      // Step 6: Start game systems (controllers handle the game loop)

      //TO-DO: this needs to be moved to a separate place
      // Add keyboard handlers

      const spin = () => {
        debug.log("🎲 Manual spin triggered");
        if (this.slotGameController?.spinController) {
          if (
            this.slotGameController.spinController.getIsSpinning() === false &&
            this.winEvent.isWinEventActive === false &&
            this.slotGameController.spinController.getIsAutoPlaying() === false &&
            this.slotGameController.getFreeSpinController().isRunning === false
          ) {
            this.slotGameController.executeGameSpin(10, "manual");
          } /*else {
            GameConfig.FORCE_STOP.enabled && this.slotGameController.spinController.forceStop();
          }*/
        }
      }

      const autoPlay = (numberOfAutoSpins: number) => {
        debug.log("🔄 Auto-play triggered");
        if (
          this.slotGameController?.spinController &&
          this.slotGameController.spinController.getIsSpinning() === false &&
          this.slotGameController.spinController.getIsAutoPlaying() === false &&
          this.winEvent.isWinEventActive === false &&
          this.slotGameController.getFreeSpinController().isRunning === false
        ) {
          // usage: window.dispatchEvent(new CustomEvent("startAutoPlay", { detail: {numberOfAutoSpins: 5, selectedSpinType: "skip"} }));
          this.slotGameController.spinController.startAutoPlay(numberOfAutoSpins);
        }
      };

      eventBus.on("spinIt", () => {
        spin()
      });
      eventBus.on("startAutoPlay", (payload) => {
        autoPlay(payload.numberOfAutoSpins);
      });

      window.addEventListener("keydown", (event) => {
        switch (event.key.toLowerCase()) {
          case " ":
            spin()
            break;
          case "f":
            debug.log("🔄 Force stop triggered");
            if (
              this.slotGameController?.spinController &&
              this.slotGameController.spinController.getIsSpinning() &&
              GameConfig.FORCE_STOP.enabled
            ) {
              this.slotGameController.spinController.forceStop();
            }
            break;
          case "a":
            autoPlay(5); // Example: start 10 auto-spins
            break;
          case "q":
            debug.log("🛑 Stop auto-play");
            if (
              this.slotGameController?.spinController &&
              this.slotGameController.spinController.getIsAutoPlaying() &&
              this.slotGameController.spinController.getAutoPlayCount() > 0
            ) {
              this.slotGameController.spinController.stopAutoPlay();
            }
            break;
          case "w":
            debug.log("🎉 Show random win animation");
            if (
              this.slotGameController?.reelsController &&
              !this.slotGameController.reelsController.getIsSpinning() &&
              GameConfig.WIN_ANIMATION.enabled &&
              this.winEvent.isWinEventActive === false
            ) {
              this.slotGameController.reelsController.playRandomWinAnimation();
            }
            break;
          case "s":
            debug.log("⏹️ Skip win animations");
            if (
              this.slotGameController?.reelsController &&
              this.slotGameController.reelsController.getStaticContainer()?.isPlaying === true
            ) {
              this.slotGameController.reelsController.skipWinAnimations();
            }
            break;
          case "b":
            debug.log("🎉 Show big win animation");
            if (
              this.winEvent &&
              GameConfig.WIN_EVENT.enabled &&
              !this.slotGameController?.reelsController?.getIsSpinning()
            ) {
              this.winEvent.getController().showWinEvent(15250, WinEventType.INSANE); // Example big win amount and type
            }
            break;
          case "1":
            debug.log(" Normal mode activated");
            if (
              this.slotGameController?.spinController &&
              this.slotGameController.spinController.getSpinMode() !==
              GameConfig.SPIN_MODES.NORMAL
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
            debug.log("⚡ Fast mode activated");
            if (
              this.slotGameController?.spinController &&
              this.slotGameController.spinController.getSpinMode() !==
              GameConfig.SPIN_MODES.FAST
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

      debug.log("✅ DoodleV8 initialization complete!");
      debug.log("🎯 Press SPACE to spin");
      debug.log("🔄 Press A for auto-play");
      debug.log("🛑 Press Q to stop auto-play");
      debug.log("🎉 Press W to show random win animation");
      debug.log("⏹️ Press S to skip win animations");
      debug.log("⚡ Press 1 for normal mode, 2 for fast mode");

      this.responsiveManager.onResize();
    } catch (error) {
      debug.error("❌ Failed to initialize DoodleV8:", error);
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

      debug.log("🎰 Game loop started");
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

    debug.log("PIXI Application initialized");
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
      debug.log("🎲 Spin started!");
    });

    this.slotGameController.spinController.setOnSpinCompleteCallback(async (result: SpinResponseData) => {
      debug.log("✅ Spin completed!", result);
    });

    this.slotGameController.spinController.setOnCascadeStepCallback(
      (step: CascadeStepData) => {
        debug.log("💥 Cascade step:", step.step);
      }
    );

    this.slotGameController.spinController.setOnErrorCallback(
      (error: string) => {
        debug.error("❌ Spin error:", error);
      }
    );
  }

  private async startLoader(): Promise<void> {
    const loader = Loader.getInstance(this.app);
    await loader.create();
    loader.mount();
    eventBus.emit("closeWrapperLoading");
    // set custom loader timings (milliseconds)
    loader.setTimings(GameConfig.LOADER_DEFAULT_TIMINGS);
    await loader.progress; // Wait for the loader to complete
  }

  private async loadAssets(res: string): Promise<void> {
    await this.assetLoader.loadBundles(AssetsConfig.getAllAssets(res));
  }

  private async createScene(): Promise<void> {
    //if (!this.reelsController) return;

    const background = Background.getInstance();
    this.app.stage.addChild(background);

    // Get the reels container from the controller
    //const reelsContainer = this.reelsController.getReelsContainer();

    // Add the reels container to the stage
    //this.app.stage.addChild(this.slotGameController!.reelsController.getReelsContainer());
    this.slotGameController!.initialize();

    this.winEvent = AnimationContainer.getInstance().getWinEvent();

    //TO-DO: this needs to be moved to Nexus
    const defaultPlayer = this.slotGameController?.getDefaultPlayer();

    // Set initial mode to static
    this.slotGameController!.reelsController!.setMode(ISpinState.IDLE);

    eventBus.emit("showUI");
    eventBus.emit("setWinData2", "PLACE YOUR BET");
  }
}

// Initialize and start the game
const game = new DoodleV8Main();
game.init().catch((error) => {
  debug.error("Failed to start game:", error);
});
