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
import { CascadeStepData, GridData, IResponseData, SpinResponseData, } from "./engine/types/ICommunication";
import { ISpinState, SpinMode } from "./engine/types/ISpinConfig";
import { WinEvent } from "./engine/components/WinEvent";
import { WinEventType } from "./engine/types/IWinEvents";
import { AnimationContainer } from "./engine/components/AnimationContainer";
import { FeatureScreen } from "./engine/components/FeatureScreen";
import { SocketConnection } from "./communication/Connection/SocketConnection";
import { WinLines } from "./engine/components/WinLines";
import { Bonus } from "./engine/components/Bonus";
import { Helpers } from "./engine/utils/Helpers";
import { AutoPlayController } from "./engine/AutoPlay/AutoPlayController";
import { signals } from "./engine/controllers/SignalManager";
import SoundManager from "./engine/controllers/SoundManager";

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
      await Promise.all([
        this.loadAssets(this.assetResolutionChooser.assetSize.name),
        this.startLoader(),
      ]);

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
      //   this.app.stage.addChildAt(featureScreen, this.app.stage.children.length);

      //   this.responsiveManager.onResize();

      //   await featureScreen.waitForClose();
      // }

      // Step 4: Initialize controllers (now that assets are loaded)
      this.initializeControllers(initData as GridData);

      // Set up controllers callbacks
      this.setupControllersCallbacks();
      // Step 5: Create scene/sprites
      this.createScene();

      // Step 6: Start game systems (controllers handle the game loop)

      //TO-DO: this needs to be moved to a separate place
      // Add keyboard handlers

      let isKeyHeld = false;
      let isSpinning = false;

      signals.on("spinCompleted", () => {
        isSpinning = false;
      })

      window.addEventListener("keyup", (event) => {
        if (event.code === "Space") isKeyHeld = false;
      });

      window.addEventListener("blur", () => {
        isKeyHeld = false;
      });

      const spin = async () => {
        debug.log("🎲 Manual spin triggered");
        if (this.slotGameController?.spinController) {
          if (
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
      }

      eventBus.on("startSpin", async () => {
        if (this.slotGameController?.reelsController && this.slotGameController.reelsController.getStaticContainer()?.isPlaying === true) {
          this.slotGameController.reelsController.skipWinAnimations();
        }

        if (
          this.slotGameController?.spinController &&
          this.slotGameController.spinController.getIsSpinning() &&
          this.slotGameController.spinController.getSpinMode() === GameConfig.SPIN_MODES.NORMAL &&
          GameConfig.FORCE_STOP.enabled
        ) {
          this.slotGameController.spinController.forceStop();
        }

        if (isKeyHeld || isSpinning) return;

        await spin();
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
          // usage: window.dispatchEvent(new CustomEvent("startAutoPlay", { detail: {numberOfAutoSpins: 5, selectedSpinType: "skip"} }));
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

      eventBus.on("setLine", (line) => {
        gameDataManager.setLine(line);
        WinLines.getInstance().setAvailableLines(line);
      });

      eventBus.on("skipWin", (isSkipped: boolean) => {
        gameDataManager.setIsWinAnimationSkipped(isSkipped);
      });

      eventBus.on("setSpinSpeed", (phase) => {
        switch (phase) {
          case 1:
            if (this.slotGameController?.spinController && this.slotGameController.spinController.getSpinMode() !== GameConfig.SPIN_MODES.NORMAL) {
              this.slotGameController.spinController.setSpinMode(GameConfig.SPIN_MODES.NORMAL as SpinMode);
            }
            break;
          case 2:
            if (this.slotGameController?.spinController && this.slotGameController.spinController.getSpinMode() !== GameConfig.SPIN_MODES.FAST) {
              this.slotGameController.spinController.getIsSpinning() === true && this.slotGameController.spinController.forceStop();
              this.slotGameController.spinController.setSpinMode(GameConfig.SPIN_MODES.FAST as SpinMode);
            }
            break;
          case 3:
            if (this.slotGameController?.spinController && this.slotGameController.spinController.getSpinMode() !== GameConfig.SPIN_MODES.TURBO) {
              this.slotGameController.spinController.getIsSpinning() === true && this.slotGameController.spinController.forceStop();
              this.slotGameController.spinController.setSpinMode(GameConfig.SPIN_MODES.TURBO as SpinMode);
            }
            break;
        }
      });

      eventBus.emit("setVolume", 50);
      SoundManager.getInstance().setVolume(50)

      eventBus.on("setVolume", (value) => {
        SoundManager.getInstance().setVolume(value);
      })

      window.addEventListener("keydown", async (event: KeyboardEvent) => {
        switch (event.code) {
          case "Space":
            if (this.slotGameController?.reelsController && this.slotGameController.reelsController.getStaticContainer()?.isPlaying === true) {
              this.slotGameController.reelsController.skipWinAnimations();
            }

            if (
              this.slotGameController?.spinController &&
              this.slotGameController.spinController.getIsSpinning() &&
              this.slotGameController.spinController.getSpinMode() === GameConfig.SPIN_MODES.NORMAL &&
              GameConfig.FORCE_STOP.enabled
            ) {
              this.slotGameController.spinController.forceStop();
            }

            if (isKeyHeld || isSpinning) return;

            isKeyHeld = true;

            await spin();
            break;
          case "KeyF":
            debug.log("🔄 Force stop triggered");
            if (
              this.slotGameController?.spinController &&
              this.slotGameController.spinController.getIsSpinning() &&
              GameConfig.FORCE_STOP.enabled
            ) {
              this.slotGameController.spinController.forceStop();
            }
            break;
          case "KeyB":
            debug.log("🎉 Show big win animation");
            if (
              this.winEvent &&
              GameConfig.WIN_EVENT.enabled &&
              !this.slotGameController?.reelsController?.getIsSpinning()
            ) {
              AnimationContainer.getInstance().playWinEventAnimation(15250, WinEventType.EPIC); // Example big win amount and type
            }
            break;
          case "KeyS":
            AnimationContainer.getInstance().getPopupCountText().setText("X$1354€");
            AnimationContainer.getInstance().playPopupAnimation();
            break;
          case "KeyD":
            AnimationContainer.getInstance().getDialogCountText().setText("+5");
            AnimationContainer.getInstance().playDialogBoxAnimation();
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

    // Add to DOM
    document.getElementById("pixi-container")?.appendChild(this.app.canvas);

    // Add global reference for debugging
    (globalThis as any).__PIXI_APP__ = this.app;

    if (import.meta.env.DEV) {
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
    }

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

  private async startLoader(): Promise<void> {
    const loader = Loader.getInstance(this.app);
    await loader.create();
    loader.mount();
    eventBus.emit("closeWrapperLoading");
    // set custom loader timings (milliseconds)
    loader.setTimings(GameConfig.LOADER_DEFAULT_TIMINGS);
    await Promise.all([
      loader.progress,
      SocketConnection.getInstance().connect()
    ]);
  }

  private async loadAssets(res: string): Promise<void> {
    await this.assetLoader.loadBundles(AssetsConfig.getAllAssets(res));
  }

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

    const animationContainer = AnimationContainer.getInstance();
    bonusScene.isActive && animationContainer.setBonusMode(true);
    this.app.stage.addChild(animationContainer);

    this.winEvent = AnimationContainer.getInstance().getWinEvent();

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
