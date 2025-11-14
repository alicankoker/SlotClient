import { Application } from "pixi.js";
import { ReelsContainer } from "./ReelsContainer";
import { ReelController, IReelMode } from "./ReelController";
import { StaticContainer } from "./StaticContainer";
import { GameConfig } from "../../config/GameConfig";
import { Helpers } from "../utils/Helpers";
import { SpinConfig } from "../../config/SpinConfig";
import { debug } from "../utils/debug";
import { GameRulesConfig } from "../../config/GameRulesConfig";
import { SpinContainer } from "./SpinContainer";
import { ISpinState, SpinMode } from "../types/ISpinConfig";
import { GridData } from "../types/ICommunication";
import { WinConfig } from "../types/IWinPresentation";
import { AnimationContainer } from "../components/AnimationContainer";
import { GameDataManager } from "../data/GameDataManager";
import { eventBus } from "../../communication/EventManagers/WindowEventManager";
import { AutoPlayController } from "../AutoPlay/AutoPlayController";
import { FreeSpinController } from "../freeSpin/FreeSpinController";

export class ReelsController {
  private app: Application;
  private reelsContainer!: ReelsContainer;
  public reelControllers: ReelController[] = [];

  // State management
  private currentMode: ISpinState = ISpinState.IDLE;
  private isSpinning: boolean = false;
  private _spinMode: SpinMode = GameConfig.SPIN_MODES.NORMAL as SpinMode;

  // Animation and timing
  private spinStartTime: number = 0;
  private spinPromises: Promise<void>[] = [];
  protected bottomSymbolYPos: number = 0;

  constructor(
    app: Application,
    initData: number[][],
    reelsContainer?: ReelsContainer
  ) {
    this.app = app;

    if (reelsContainer) {
      this.reelsContainer = reelsContainer;
    }

    this.initializeControllers(initData);
  }

  private initializeControllers(initData: number[][]): void {
    const numberOfReels = GameConfig.GRID_LAYOUT.columns;

    for (let i = 0; i < numberOfReels; i++) {
      const reelController = new ReelController(i, initData);
      this.reelControllers.push(reelController);
    }
  }

  // Method to set reelsContainer after creation
  public setReelsContainer(reelsContainer: ReelsContainer): void {
    this.reelsContainer = reelsContainer;
  }
  // Mode management
  public async setMode(mode: ISpinState): Promise<void> {
    if (this.currentMode === mode) return;

    debug.log(`ReelsController: Switching from ${this.currentMode} to ${mode}`);
    this.currentMode = mode;

    // Update container mode
    if (this.reelsContainer) {
      this.reelsContainer.setMode(Helpers.getReelModeBySpinState(mode));
    }

    // Update all reel controllers
    await Promise.all(
      this.reelControllers.map((controller) => {
        return controller.setModeBySpinState(mode);
      })
    );

    if (mode === ISpinState.IDLE) {
      this.reelsContainer.setChainAnimation(false, false, false);
      this.reelsContainer.chainSpeed = 1;
      await this.reelsContainer.getStaticContainer()?.updateSymbols(this.reelControllers[0].getSymbols());
    }

    if (mode === ISpinState.SPINNING) {
      this.reelsContainer.setChainAnimation(true, true, true);
    }
  }

  /**
   * @description Check the win condition for the current spin. Currently, it always returns true. It must be implemented.
   * @returns True if the win condition is met, false otherwise.
   */
  public checkWinCondition(): boolean {
    // Implement win condition logic
    return true; // Placeholder
  }

  /**
   * @description Set random win display data.
   * @returns The win configuration data.
   */
  private setWinDisplayData(): WinConfig {
    // Implement win display data logic
    const multiplier: number = Math.max(1, Math.floor(Math.random() * 5)); // Placeholder for multiplier
    const amount: number = Math.round(Math.random() * 100) * multiplier; // Placeholder for win amount with multiplier (if multiplier bigger than 1)
    const line: number = Math.floor(Math.random() * 25) + 1; // Placeholder for line
    const length = Math.max(
      Math.round(Math.random() * GameRulesConfig.GRID.reelCount),
      3
    );
    const baseLine = GameRulesConfig.WINNING_LINES[line];
    const symbolIds: number[] = baseLine.slice(0, length); // Placeholder for symbol IDs

    return {
      multiplier,
      amount,
      line,
      symbolIds,
    };
  }

  /**
   * @description Play a random win animation.
   * @param isSkipped Whether the animation is skipped.
   */
  public async setupWinAnimation(isSkipped: boolean = false): Promise<void> {
    // set win display datas
    const spinResultData = GameDataManager.getInstance().getLastSpinResult();
    let winConfigs: WinConfig[] = [];

    if (spinResultData?.ws.length! <= 0) {
      if (FreeSpinController.instance().isRunning === false && AutoPlayController.instance().isRunning === false) {
        eventBus.emit("setMessageBox", { variant: "default", message: "PLACE YOUR BET" });
      }

      this.resetWinAnimations();
      return;
    }

    if (spinResultData) {
      for (const winData of spinResultData.ws) {
        const winConfig: WinConfig = {
          symbolIds: winData.positions,
          line: winData.line,
          amount: winData.payout,
          multiplier: Math.max(1, Math.floor(Math.random() * 5))
        }

        winConfigs.push(winConfig);
      }
    }

    //console.log("winConfigs", winConfigs);

    const staticContainer = this.reelsContainer.getStaticContainer();
    const winLines = this.reelsContainer.getWinLines();

    if (winLines && GameConfig.WIN_ANIMATION.winlineVisibility) {
      winLines.visible = true;
    }

    const winDatas = [...winConfigs];
    const amount = winConfigs.reduce((sum, win) => sum + win.amount, 0);
    const lines = winConfigs.map(win => win.line);

    eventBus.emit("onWin", amount);

    // Play the win animations. If skipped, play the skipped animation, otherwise play the full animation.
    if (isSkipped) {
      await staticContainer?.playSkippedWinAnimation(amount, lines);
    } else {
      await staticContainer?.setupAnimation(winDatas);
    }
  }

  /**
   * @description Skip all win animations.
   */
  public skipWinAnimations(): void {
    AnimationContainer.getInstance().stopTotalWinAnimation();
    this.reelsContainer.getStaticContainer()?.skipWinAnimations();
  }

  /**
   * @description Reset all win animations.
   */
  public resetWinAnimations(): void {
    if (!this.reelsContainer) {
      debug.warn(
        "ReelsController: reelsContainer not set, skipping resetWinAnimations"
      );
      return;
    }

    const animationContainer = AnimationContainer.getInstance();

    animationContainer.stopWinTextAnimation();

    const staticContainer = this.reelsContainer.getStaticContainer();

    staticContainer?.resetWinAnimations();
  }

  public getMode(): ISpinState {
    return this.currentMode;
  }

  // Spinning functionality
  public async startSpin(finalSymbols: number[][]): Promise<void> {
    if (this.isSpinning) {
      debug.warn("ReelsController: Spin already in progress");
      return;
    }

    this.resetWinAnimations();

    this.isSpinning = true;
    this.spinStartTime = Date.now();
    this.setMode(ISpinState.SPINNING);

    /*const spinContainer = this.reelsContainer.getChildByLabel('SpinContainer') as SpinContainer;
        // Start spin animation on the spin container
        if (spinContainer) {
            if (spinContainer && 'startSpinAnimation' in spinContainer) {
                (spinContainer as any).startSpinAnimation(finalSymbols[0] || []);
            }
        }*/

    // Start all reels spinning with staggered timing
    /*this.spinPromises = this.reelControllers.map((controller, index) => {
            return new Promise<void>((resolve) => {
                //const delay = index * 150; // 150ms stagger between reels
                //const duration = 2000 + (index * 200); // Increasing duration for each reel
                
                //setTimeout(() => {
                    const reelSymbols = finalSymbols[index] || [];
                    controller.startSpin(reelSymbols, 0, resolve);
                //}, delay);
            });
        });
        
        // Wait for all reels to complete
        await Promise.all(this.spinPromises);*/

    //burada reel'ler spin start ediliyor
    /*this.reelControllers.forEach(controller => {
            controller.startSpin(finalSymbols[0], 0, () => { });
        });*/

    if (this._spinMode === GameConfig.SPIN_MODES.NORMAL) {
      await this.delay(SpinConfig.SPIN_DURATION);

      this.setMode(ISpinState.SLOWING);
      await this.delay(SpinConfig.REEL_SLOW_DOWN_DURATION);
    }

    this.isSpinning = false;

    debug.log("ReelsController: All reels completed spinning");
  }

  public stopSpin(): void {
    // Stop spin animation on the spin container
    if (this.reelsContainer) {
      const spinContainer = this.reelsContainer.getSpinContainer();
      if (spinContainer && "stopSpinAnimation" in spinContainer) {
        (spinContainer as any).stopSpinAnimation();
      }
    }

    this.reelControllers.forEach((controller) => {
      controller.stopSpin();
    });
  }

  public slowDown(): void {
    this.reelControllers.forEach((controller) => {
      controller.slowDown();
    });
  }

  // Utility methods
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  public forceStopAllReels(): void {
    if (!this.isSpinning) return;

    this.reelControllers.forEach((controller) => {
      controller.forceStop();
    });

    this.isSpinning = false;
  }

  // Cascading functionality
  /*public async displayInitialGrid(gridData: InitialGridData): Promise<void> {
        this.setMode('cascading');
        
        // Update all containers with initial grid
        this.reelsContainer.displayInitialGrid(gridData);
        
        // Update all controllers
        this.reelControllers.forEach(controller => {
            controller.displayInitialGrid(gridData);
        });
    }*/

  /*public async processCascadeStep(stepData: CascadeStepData): Promise<void> {
        if (this.currentMode !== 'cascading') {
            debug.warn('ReelsController: Not in cascading mode');
            return;
        }
        
        // Process cascade step in containers
        this.reelsContainer.processCascadeStep(stepData);
        
        // Process cascade step in controllers
        this.reelControllers.forEach(controller => {
            controller.processCascadeStep(stepData);
        });
    }*/

  // Symbol access and manipulation
  public setSymbolsForReel(reelIndex: number, symbols: number[]): boolean {
    const controller = this.getReelController(reelIndex);
    if (controller) {
      controller.setSymbols(symbols);
      return true;
    }
    return false;
  }

  public getSymbolsForReel(reelIndex: number): number[] {
    const controller = this.getReelController(reelIndex);
    return controller ? controller.getSymbols() : [];
  }

  public getSymbolAt(reelIndex: number, position: number): number | null {
    const controller = this.getReelController(reelIndex);
    return controller ? controller.getSymbolIdAt(position) : null;
  }

  public updateSymbolAt(
    reelIndex: number,
    position: number,
    symbolId: number
  ): boolean {
    const controller = this.getReelController(reelIndex);
    return controller ? controller.updateSymbolAt(position, symbolId) : false;
  }

  // Update method for game loop
  public update(deltaTime: number = 0): void {
    // Update all reel controllers
    //burada reel'ler update ediliyor
    /*this.reelControllers.forEach(controller => {
            controller.update(deltaTime);
        });*/


    if (this.currentMode === ISpinState.SLOWING && this.isSpinning && this.reelsContainer.chainSpeed > 0.2) {
      this.reelsContainer.chainSpeed -= SpinConfig.REEL_SLOW_DOWN_COEFFICIENT / 10;
    }

    // Update spinning state based on individual reel states
    this.updateSpinningState();

    // Update any timing-related logic
    this.updateTimingLogic(deltaTime);
  }

  private updateSpinningState(): void {
    // Check if any reels are still spinning
    const anySpinning = this.reelControllers.some((controller) =>
      controller.getIsSpinning()
    );

    // Update overall spinning state
    if (this.isSpinning && !anySpinning) {
      // All reels have finished spinning
      this.isSpinning = false;
      debug.log("ReelsController: All reels have finished spinning");
    }
  }

  private updateTimingLogic(deltaTime: number): void {
    // Handle any timing-based logic here
    // This can be used for:
    // - Spin duration tracking
    // - Stagger timing between reels
    // - Delay-based state transitions
    // - Performance monitoring

    if (this.isSpinning && this.spinStartTime > 0) {
      const elapsedTime = Date.now() - this.spinStartTime;
      // Future: Add spin duration monitoring, timeouts, etc.
    }
  }

  // Controller access
  public getReelController(reelIndex: number): ReelController | null {
    return reelIndex >= 0 && reelIndex < this.reelControllers.length
      ? this.reelControllers[reelIndex]
      : null;
  }

  public getAllReelControllers(): ReelController[] {
    return [...this.reelControllers];
  }

  // Container access
  public getReelsContainer(): ReelsContainer {
    return this.reelsContainer;
  }

  public getSpinContainer(): SpinContainer | undefined {
    // Return the single SpinContainer (reelIndex is ignored since there's only one)
    return this.reelsContainer.getSpinContainer();
  }

  public getStaticContainer(): StaticContainer | undefined {
    // Return the single StaticContainer (reelIndex is ignored since there's only one)
    return this.reelsContainer.getStaticContainer();
  }

  // State queries
  public getIsSpinning(): boolean {
    return this.isSpinning;
  }

  public getNumberOfReels(): number {
    return this.reelControllers.length;
  }

  public getAllSpinning(): boolean {
    return this.reelControllers.every((controller) =>
      controller.getIsSpinning()
    );
  }

  public getSpinElapsedTime(): number {
    return this.isSpinning ? Date.now() - this.spinStartTime : 0;
  }

  public getSpinMode(): SpinMode {
    return this._spinMode;
  }

  public setSpinMode(mode: SpinMode): void {
    if (this._spinMode === mode) return;

    this._spinMode = mode;
    this.reelControllers.forEach((controller) => {
      controller.setSpinMode(mode);
    });

    debug.log(`ReelsController: Spin mode set to ${mode}`);
  }

  // Cleanup
  public destroy(): void {
    // Stop any ongoing spins
    this.forceStopAllReels();

    // Cleanup controllers
    this.reelControllers.forEach((controller) => {
      controller.cleanup();
    });
    this.reelControllers = [];

    // Cleanup containers
    if (this.reelsContainer) {
      this.reelsContainer.destroy();
    }
  }
}
