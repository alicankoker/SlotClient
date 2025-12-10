import { Application, Assets, ColorMatrixFilter } from "pixi.js";
import { SlotGameController } from "./controllers/SlotGameController";
import { ReelsController } from "@slotclient/engine/reels/ReelsController";
import { ResponsiveManager } from "@slotclient/engine/utils/ResponsiveManager";
import { AssetSizeManager } from "@slotclient/engine/multiResolutionSupport/AssetSizeManager";
import { AssetLoader } from "@slotclient/engine/utils/AssetLoader";
import { ConfigProvider } from "@slotclient/config";
import { AssetsConfig, PATH } from "./configs/AssetsConfig";
import { GameConfig } from "./configs/GameConfig";
import { StyleConfig } from "./configs/StyleConfig";
import { setConnectionConfig } from "@slotclient/config/ConnectionConfig";
import { Loader } from "@slotclient/engine/utils/Loader";
import { debug } from "@slotclient/engine/utils/debug";
import { Storage } from "@slotclient/engine/utils/Storage";
import { eventBus } from "@slotclient/types";
import { GameDataManager } from "@slotclient/engine/data/GameDataManager";
import { CascadeStepData, GridData, IResponseData, } from "@slotclient/engine/types/ICommunication";
import { ISpinState, SpinMode } from "@slotclient/engine/types/ISpinConfig";
import { WinEvent } from "./components/WinEvent";
import { Background } from "./components/Background";
import { AnimationContainer } from "./components/AnimationContainer";
import { FeatureScreen } from "./components/FeatureScreen";
import { SocketConnection } from "@slotclient/communication/Connection/SocketConnection";
import { Bonus } from "./components/Bonus";
import { Helpers } from "@slotclient/engine/utils/Helpers";
import { signals } from "@slotclient/engine/controllers/SignalManager";
import SoundManager from "@slotclient/engine/controllers/SoundManager";
import payoutData from "./payout.json";

export class DoodleV8Main {
  private app!: Application;
  private responsiveManager!: ResponsiveManager;
  private slotGameController?: SlotGameController;
  private reelsController?: ReelsController;
  private winEvent!: WinEvent;
  private assetLoader!: AssetLoader;
  private assetResolutionChooser!: AssetSizeManager;

  public async init(): Promise<void> {
    try {
      debug.log("🎰 DoodleV8 initializing...");

      const assetsConfig = new AssetsConfig();
      ConfigProvider.getInstance().setAssetsConfig(assetsConfig);
      const gameConfig = new GameConfig();
      ConfigProvider.getInstance().setGameConfig(gameConfig);
      const styleConfig = new StyleConfig();
      ConfigProvider.getInstance().setStyleConfig(styleConfig);

      // Initialize connection config from game config
      setConnectionConfig({
        BACKEND_URL: gameConfig.BACKEND.BACKEND_URL,
        USER_ID: gameConfig.BACKEND.USER_ID,
      });

      // Step 1: Initialize PIXI Application with modern config
      await this.initializePixiApp();

      // Initialize AssetLoader singleton instance
      this.assetLoader = AssetLoader.getInstance();
      this.assetResolutionChooser = AssetSizeManager.getInstance();
      debug.log("Asset Size: ", this.assetResolutionChooser.assetSize);

      // Step 2: Initialize responsive system
      this.initializeResponsiveSystem();

      // Initialize GameDataManager first
      const gameDataManager = GameDataManager.getInstance();

      // Step 3: Load assets with progress bar BEFORE creating controllers (symbols need textures)

      try {
        await Promise.all([
          this.loadAssets(this.assetResolutionChooser.assetSize.name),
          //this.loadAudioAssets(),
          Assets.add({ alias: 'base_background', src: PATH + '/assets/images/base_background.jpg' }),
          Background.getInstance(await Assets.load('base_background')),
          Background.instance().position.y = this.responsiveManager.getOrientation() === gameConfig.ORIENTATION.portrait ? -20 : 260,
          this.startLoader(Background.instance()),
        ]);
      } catch (err) {
        console.error("Game failed to start:", err);
        return;
      }

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

      if (localStorage.getItem('featureScreenDontShow') !== 'true') {
        const featureScreen = new FeatureScreen(this.app);
        this.app.stage.addChildAt(featureScreen, this.app.stage.children.length);

        this.responsiveManager.onResize();

        await featureScreen.waitForClose();
      }

      Background.instance().createBackgroundElements();

      // Step 4: Initialize controllers (now that assets are loaded)
      this.initializeControllers(initData as GridData);

      // Set up controllers callbacks
      this.setupControllersCallbacks();
      // Step 5: Create scene/sprites
      this.createScene();

      eventBus.emit("setFixedLine", 10)
      gameDataManager.setCurrentLine(10);
      gameDataManager.setMaxLine(10);
      AnimationContainer.instance().getWinLines().setAvailableLines(10);

      let isKeyHeld = false;
      let isSpinning = false;
      let currentSpinSpeed = 1; // Track current spin speed

      signals.on("spinCompleted", () => {
        isSpinning = false;

        // Restore the last set spin speed
        spinSpeed(currentSpinSpeed);

        if (this.slotGameController && this.slotGameController.getFreeSpinController().isRunning === false) {
          eventBus.emit("setBatchComponentState", {
            componentNames: ['mobileBetButton', 'betButton', 'autoplayButton', 'mobileAutoplayButton', 'settingsButton', 'creditButton', 'spinButton'],
            stateOrUpdates: { disabled: false }
          });
        }
      });

      window.addEventListener("keyup", (event) => {
        if (event.code === "Space") isKeyHeld = false;
      });

      window.addEventListener("blur", () => {
        isKeyHeld = false;
      });

      const spin = async () => {
        debug.log("🎲 Manual spin triggered");
        if (this.slotGameController?.spinController &&
          this.slotGameController.spinController.getIsSpinning() === false &&
          this.winEvent.isWinEventActive === false &&
          this.slotGameController.getAutoPlayController().isRunning === false &&
          this.slotGameController.getFreeSpinController().isRunning === false &&
          Bonus.instance().isActive === false
        ) {
          isSpinning = true;
          await this.slotGameController.executeGameSpin('spin');
          isKeyHeld = false;
        }
      }

      eventBus.on("startSpin", async () => {
        if (this.slotGameController?.reelsController && this.slotGameController.reelsController.getStaticContainer()?.isPlaying === true) {
          this.slotGameController.skipWinAnimations();
        }

        if (isKeyHeld || isSpinning) return;

        await spin();
      });

      eventBus.on("stopSpin", () => {
        if (
          this.slotGameController?.spinController &&
          this.slotGameController.spinController.getIsSpinning() &&
          (this.slotGameController.spinController.getSpinMode() === gameConfig.SPIN_MODES.NORMAL || this.slotGameController.getFreeSpinController().isRunning === true) &&
          gameConfig.FORCE_STOP.enabled
        ) {
          this.slotGameController.forceStop();
        }
      });

      eventBus.on("startAutoPlay", async (autoSpinCount) => {
        debug.log("🔄 Auto-play triggered");
        if (
          this.slotGameController?.spinController &&
          this.slotGameController.spinController.getIsSpinning() === false &&
          this.slotGameController.getAutoPlayController().isRunning === false &&
          this.winEvent.isWinEventActive === false &&
          this.slotGameController.getFreeSpinController().isRunning === false &&
          Bonus.instance().isActive === false
        ) {
          await this.slotGameController.getAutoPlayController().startAutoPlay(autoSpinCount);
        }
      });

      eventBus.on("stopAutoPlay", () => {
        debug.log("🛑 Stop auto-play triggered");
        if (
          this.slotGameController?.spinController &&
          this.slotGameController.getAutoPlayController().isRunning &&
          this.slotGameController.getAutoPlayController().autoPlayCount > 0
        ) {
          this.slotGameController.getAutoPlayController().stopAutoPlay();
        }
      });

      eventBus.on("setBetValueIndex", (index) => {
        gameDataManager.setBetValueIndex(index);
      });

      eventBus.on("skipWin", (isSkipped: boolean) => {
        gameDataManager.setIsWinAnimationSkipped(isSkipped);
      });

      eventBus.on("setSpinSpeed", (phase) => {
        currentSpinSpeed = phase; // Save the current spin speed
        spinSpeed(phase);
      });

      const spinSpeed = (phase: number) => {
        switch (phase) {
          case 1:
            if (this.slotGameController?.spinController) {
              this.slotGameController.spinController.setSpinMode(gameConfig.SPIN_MODES.NORMAL as SpinMode);
            }
            break;
          case 2:
            if (this.slotGameController?.spinController) {
              this.slotGameController.spinController.setSpinMode(gameConfig.SPIN_MODES.FAST as SpinMode);
            }
            break;
          case 3:
            if (this.slotGameController?.spinController) {
              this.slotGameController.spinController.setSpinMode(gameConfig.SPIN_MODES.TURBO as SpinMode);
            }
            break;
        }
      }

      eventBus.emit("setPaytable", payoutData);

      eventBus.emit("setVolume", 50);
      SoundManager.getInstance().setVolume(50);

      eventBus.on("setVolume", (value) => {
        SoundManager.getInstance().setVolume(value);
      });

      window.addEventListener("keydown", async (event: KeyboardEvent) => {
        switch (event.code) {
          case "Space":
            if (this.slotGameController?.reelsController && this.slotGameController.reelsController.getStaticContainer()?.isPlaying === true) {
              this.slotGameController.skipWinAnimations();
            }

            if (
              this.slotGameController?.spinController &&
              this.slotGameController.spinController.getIsSpinning() &&
              (this.slotGameController.spinController.getSpinMode() === gameConfig.SPIN_MODES.NORMAL || this.slotGameController.getFreeSpinController().isRunning === true) &&
              gameConfig.FORCE_STOP.enabled
            ) {
              this.slotGameController.forceStop();
            }

            if (isKeyHeld || isSpinning) return;

            isKeyHeld = true;

            await spin();
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
      resolution: window.devicePixelRatio || 1,
      autoDensity: true,
      antialias: true
    });

    // this.app.canvas.onclick = () => {
    //   alert("Canvas clicked!");
    // }

    signals.on("socketError", (reason) => {
      const matrix = [
        0.3, 0.6, 0.1, 0, 0,
        0.3, 0.6, 0.1, 0, 0,
        0.3, 0.6, 0.1, 0, 0,
        0, 0, 0, 1, 0,
      ] as const;
      const grayFilter = new ColorMatrixFilter();
      grayFilter.matrix = matrix as any;
      this.app.stage.filters = [grayFilter];
      this.app.stage.interactive = false;
      this.app.stage.interactiveChildren = false;
    });

    // Add to DOM
    document.getElementById("pixi-container")?.appendChild(this.app.canvas);

    // Add global reference for debugging
    (globalThis as any).__PIXI_APP__ = this.app;

    //@ts-ignore
    const { default: Stats } = await import('stats-js');
    const stats = new Stats();
    stats.showPanel(0);
    stats.dom.style.position = 'absolute';
    stats.dom.style.top = '10px';
    stats.dom.style.right = '10px';
    stats.dom.style.left = 'unset';
    this.app.ticker.add(() => {
      stats.begin();
      stats.end();
    });
    // @ Append to body
    document.body.appendChild(stats.dom);

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

    this.slotGameController.spinController.setOnSpinCompleteCallback(async (result: IResponseData | boolean) => {
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

  private async startLoader(background: Background): Promise<void> {
    const loader = Loader.getInstance(this.app, background);
    await loader.create();
    loader.mount();
    eventBus.emit("closeWrapperLoading");
    // set custom loader timings (milliseconds)
    loader.setTimings(GameConfig.getInstance().LOADER_DEFAULT_TIMINGS);
    await Promise.all([
      loader.progress,
      SocketConnection.getInstance().connect()
    ]);
  }

  private async loadAssets(res: string): Promise<void> {
    try {
      const assetsConfig = ConfigProvider.getInstance().getAssetsConfig();
      ConfigProvider.getInstance().setAssetsConfig(assetsConfig);
      await this.assetLoader.loadBundles(assetsConfig.getAllAssets(res));
    } catch (error) {
      throw error;
    }
  }

  // private async loadAudioAssets(): Promise<void> {
  //   // Load audio separately through SoundManager (not PixiJS Assets)
  //   const audioBundle = AssetsConfig.getAudioAssets();
  //   const soundBundle = audioBundle.bundles.find((bundle) => bundle.name === "audio");
  //   if (soundBundle) {
  //     const soundManager = SoundManager.getInstance();
  //     const { assets } = soundBundle as { assets: AudioBundle };
  //     assets.forEach((asset) => {
  //       soundManager.add([
  //         {
  //           alias: Array.isArray(asset.alias) ? asset.alias[0] : asset.alias,
  //           src: Array.isArray(asset.src) ? asset.src[0] : asset.src,
  //           channel: (asset.channel as "sfx" | "music") || "sfx",
  //         },
  //       ]);
  //     });
  //     debug.log("Audio assets loaded via SoundManager");
  //   }
  // }

  private async createScene(): Promise<void> {
    //if (!this.reelsController) return;

    // Get the reels container from the controller
    //const reelsContainer = this.reelsController.getReelsContainer();

    // Add the reels container to the stage
    //this.app.stage.addChild(this.slotGameController!.reelsController.getReelsContainer());

    this.slotGameController!.initialize();

    const bonusScene = Bonus.getInstance(this.app);
    bonusScene.visible = GameDataManager.getInstance().getInitialData()?.history.nextAction === "bonus";
    bonusScene.isActive = GameDataManager.getInstance().getInitialData()?.history.nextAction === "bonus";
    if (bonusScene.isActive) {
      bonusScene.setOnBonusCompleteCallback(async () => {
        animationContainer.setBonusMode(false);
        Bonus.instance().isActive = false;
        eventBus.emit("setBalance", GameDataManager.getInstance().getLastSpinResult()!.balance.after);
        eventBus.emit("setWinBox", { variant: "default", amount: Helpers.convertToDecimal(GameDataManager.getInstance().getResponseData().bonus?.history[0].featureWin!) as string });
        eventBus.emit("showUI");
      });
    }
    this.app.stage.addChild(bonusScene);

    const animationContainer = AnimationContainer.instance();
    bonusScene.isActive && animationContainer.setBonusMode(true);
    this.app.stage.addChild(animationContainer);

    this.winEvent = AnimationContainer.instance().getWinEvent();

    //TO-DO: this needs to be moved to Nexus
    const defaultPlayer = this.slotGameController?.getDefaultPlayer();

    // Set initial mode to static
    this.slotGameController!.reelsController!.setMode(ISpinState.IDLE);

    GameDataManager.getInstance().getInitialData()?.history.nextAction !== "bonus" && eventBus.emit("showUI");
    eventBus.emit("setMessageBox", { variant: "default", message: "PLACE YOUR BET" });

    const response = GameDataManager.getInstance().getInitialData();

    if (this.slotGameController && response && response.history.freeSpin && response.history.freeSpin.totalRounds > response.history.freeSpin.playedRounds) {
      const remainRounds = response.history.freeSpin?.totalRounds - response.history.freeSpin.playedRounds;
      const initialWin = response.history.freeSpin.featureWin;

      this.slotGameController.startFreeSpinState(response.history.freeSpin.totalRounds, remainRounds, initialWin);
    }
  }
}

// Initialize and start the game
const game = new DoodleV8Main();
game.init().catch((error) => {
  debug.error("Failed to start game:", error);
});