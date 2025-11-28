// SpinContainer import removed - not directly used in this controller
import { GameConfig } from "@slotclient/config/GameConfig";
import { SpinConfig } from "@slotclient/config/SpinConfig";
import { WinEvent } from "../components/WinEvent";
import { ReelsController } from "../reels/ReelsController";
import { debug } from "../utils/debug";
import SoundManager from "../controllers/SoundManager";
import { SpinContainer } from "./SpinContainer";
import { Utils } from "../utils/Utils";
import { GameDataManager } from "../data/GameDataManager";
import { ISpinState, SpinMode } from "../types/ISpinConfig";
import {
  CascadeStepData,
  DropData,
  GridData,
  IResponseData,
  MatchData,
  SymbolData,
} from "../types/ICommunication";
import { AnimationContainer } from "../components/AnimationContainer";
import { signals } from "../controllers/SignalManager";

export interface SpinControllerConfig {
  reelsController: ReelsController;
  defaultSpinDuration?: number;
  staggerDelay?: number;
}

export abstract class SpinController {
  protected reelsController: ReelsController;
  protected _soundManager: SoundManager;
  protected _winEvent: WinEvent;

  // State management
  protected currentState: ISpinState = ISpinState.IDLE;
  protected _spinMode: SpinMode = GameConfig.SPIN_MODES.NORMAL as SpinMode;
  protected currentSpinId?: string;
  protected currentStepIndex: number = 0;
  protected _isForceStopped: boolean = false;
  protected _abortController: AbortController | null = null;
  protected _symbols: number[][] = [];

  // Spin data - store finalGrid for proper final symbol positioning
  protected currentCascadeSteps: CascadeStepData[] = [];
  protected finalGridData?: GridData; // Store final grid from server

  // Callbacks
  protected onSpinStartCallback?: () => void;
  protected onSpinCompleteCallback?: (result: IResponseData) => Promise<void>;
  protected onCascadeStepCallback?: (stepData: CascadeStepData) => void;
  protected onErrorCallback?: (error: string) => void;
  protected container: SpinContainer;

  constructor(container: SpinContainer, config: SpinControllerConfig) {
    this.container = container;
    this.reelsController = config.reelsController;
    this._soundManager = SoundManager.getInstance();
    this._winEvent = AnimationContainer.instance().getWinEvent();
    this._symbols = GameDataManager.getInstance().getInitialData()?.history.reels!;
  }

  // Main spin orchestration methods
  public async executeSpin(): Promise<IResponseData> {
    if (this.currentState !== "idle") {
      const error = `SpinController: Cannot start spin - current state is ${this.currentState}`;
      debug.warn(error);
      this.handleError(error);
    }

    this._abortController = new AbortController();
    const signal = this._abortController.signal;

    this._isForceStopped = false;

    try {
      this.setState(ISpinState.SPINNING);

      if (this.onSpinStartCallback) {
        this.onSpinStartCallback();
      }

      // Simulate server request (replace with actual server call)
      const response = GameDataManager.getInstance().getResponseData();

      if (!response) {
        this.handleError("Unknown server error");
        return response || false;
      }

      // this.currentSpinId = response.result.spinId;
      // this.currentCascadeSteps = response.result.steps;
      // this.finalGridData = response.result.steps[response.result.steps.length - 1].gridAfter; // Store final grid

      // Step 1: Transfer symbols from StaticContainer to SpinContainer
      // await this.transferSymbolsToSpinContainer(
      //   response.result.steps[0].gridBefore
      // );

      // this._soundManager.play("spin", true, 0.75); // Play spin sound effect

      // Step 2: Start spinning animation
      // this.startSpinAnimation(response.result);

      if (this._spinMode === GameConfig.SPIN_MODES.NORMAL) {
        await Utils.delay(SpinConfig.SPIN_DURATION, signal);

        this._isForceStopped === false && this.reelsController.slowDown();

        await Utils.delay(SpinConfig.REEL_SLOW_DOWN_DURATION, signal);
      } else if (this._spinMode === GameConfig.SPIN_MODES.FAST) {
        await Utils.delay(SpinConfig.FAST_SPIN_SPEED);
      } else {
        await Utils.delay(SpinConfig.TURBO_SPIN_SPEED);
      }

      // Step 3: Process cascade sequence (if any)
      await this.processCascadeSequence();

      // Step 4: Transfer final symbols back to StaticContainer
      // await this.transferSymbolsToStaticContainer(
      //   response.result.steps[response.result.steps.length - 1].gridAfter
      // );

      this.reelsController.stopSpin();
      this.setState(ISpinState.COMPLETED);
      this.reelsController.getReelsContainer()?.getSpinContainer()?.stopSpin();

      // this._soundManager.stop("spin");
      // this._soundManager.play("stop", false, 0.75); // Play stop sound effect

      // if (this.onSpinCompleteCallback) {
      //   this.onSpinCompleteCallback(response);
      // }

      await this.reelsController.setMode(ISpinState.IDLE);
      this.setState(ISpinState.IDLE);

      return response;
    } catch (error) {
      debug.error("SpinController: Spin execution error", error);
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      this.handleError(errorMessage);
      throw error;
    }
  }

  public startSpinAnimation(spinData: IResponseData): void {
    this.container.startSpin(spinData);
  }

  // Process initial grid display
  /*protected async processInitialGrid(gridData: InitialGridData): Promise<void> {
        debug.log('SpinController: Processing initial grid');
        
        // Set reels to cascading mode and display initial grid
        this.reelsController.setMode('cascading');
        await this.reelsController.displayInitialGrid(gridData);
        
        this.setState(ISpinState.CASCADING);
    }*/

  // Process cascade sequence
  /*protected async processCascadeSequence(): Promise<void> {
        debug.log(`SpinController: Processing ${this.currentCascadeSteps.length} cascade steps`);
        
        for (let i = 0; i < this.currentCascadeSteps.length; i++) {
            this.currentStepIndex = i;
            const stepData = this.currentCascadeSteps[i];
            
            await this.processCascadeStep(stepData);
            
            if (this.onCascadeStepCallback) {
                this.onCascadeStepCallback(stepData);
            }
            
            // Add delay between cascade steps
            if (i < this.currentCascadeSteps.length - 1) {
                await Utils.delay(300); // 300ms between steps
            }
        }
    }*/

  // Convert grid format to reel format for ReelsController.startSpin()
  protected convertGridToReelFormat(gridSymbols: Array<{ symbolId: number }>): number[][] {
    const reelsCount = 5; // GameConfig.GRID_LAYOUT.columns
    const symbolsPerReel = 3; // GameConfig.GRID_LAYOUT.visibleRows
    const finalSymbols: number[][] = [];

    // Initialize reel arrays
    for (let reel = 0; reel < reelsCount; reel++) {
      finalSymbols[reel] = [];
    }

    // Convert 1D grid to 2D reel format
    for (let i = 0; i < gridSymbols.length; i++) {
      const reelIndex = i % reelsCount;
      const symbolId = gridSymbols[i].symbolId;

      if (finalSymbols[reelIndex].length < symbolsPerReel) {
        finalSymbols[reelIndex].push(symbolId);
      }
    }

    debug.log("SpinController: Converted final grid to reel format:", finalSymbols);
    return finalSymbols;
  }

  // Process individual cascade step
  /*    debug.log(`SpinController: Processing cascade step ${stepData.step}`);
        
        await this.reelsController.processCascadeStep(stepData);
    }*/

  // Helper method to calculate grid after applying cascade step changes
  protected calculateGridAfterStep(
    initialSymbols: SymbolData[],
    step: number, // Cascade step number (0 = initial, 1+ = subsequent cascades)
    matches: MatchData[],
    indicesToRemove: number[],
    symbolsToDrop: DropData[],
    newSymbols: SymbolData[],
    newSymbolIndices: number[]
  ): GridData {
    // Start with a copy of the initial symbols
    /*const gridAfter = {
            symbols: [...initialSymbols] as SymbolData[][]
        };

        // Remove matched symbols
        indicesToRemove.forEach(index => {
            if (index >= 0 && index < gridAfter.symbols.length) {
                gridAfter.symbols[index] = { symbolId: -1 } as SymbolData; // Mark as removed
            }
        });

        // Apply symbol drops
        symbolsToDrop.forEach(drop => {
            if (drop.toIndex >= 0 && drop.toIndex < gridAfter.symbols.length) {
                gridAfter.symbols[drop.toIndex] = { symbolId: drop.symbolId } as SymbolData;
            }
        });

        // Add new symbols
        newSymbols.forEach((symbol, i) => {
            const index = newSymbolIndices[i];
            if (index >= 0 && index < gridAfter.symbols.length) {
                gridAfter.symbols[index] = { symbolId: symbol.symbolId } as SymbolData;
            }
        });

        // Fill any remaining empty slots with random symbols
        for (let i = 0; i < gridAfter.symbols.length; i++) {
            if (gridAfter.symbols[i].symbolId === -1) {
                gridAfter.symbols[i] = { symbolId: Math.floor(Math.random() * GameRulesConfig.GRID.totalSymbols) } as SymbolData;
            }
        }

        return gridAfter;*/
    return { symbols: [] };
  }

  // Force stop current spin
  public forceStop(): void {
    if (this.currentState === "idle" || this.currentState === "completed" || this._spinMode === GameConfig.SPIN_MODES.TURBO) {
      return;
    }

    this._isForceStopped = true;
    this.container.setForceStop(true);

    this._abortController?.abort();
    this._abortController = null;
    this.setSpinMode(GameConfig.SPIN_MODES.TURBO as SpinMode);
    this.reelsController.getReelsContainer().forceStopChainAnimation();

    signals.emit("setBatchComponentState", {
      componentNames: ['spinButton'],
      stateOrUpdates: { disabled: true }
    });
  }

  // State management
  public setState(newState: ISpinState): void {
    if (this.currentState === newState) return;

    debug.log(`SpinController: State ${this.currentState} -> ${newState}`);
    this.currentState = newState;
  }

  public getState(): ISpinState {
    return this.currentState;
  }

  public getCurrentSpinId(): string | undefined {
    return this.currentSpinId;
  }

  public getCurrentStepIndex(): number {
    return this.currentStepIndex;
  }

  public getTotalSteps(): number {
    return this.currentCascadeSteps.length;
  }

  // Error handling
  protected handleError(error: string): void {
    debug.error(`SpinController Error: ${error}`);
    this.setState(ISpinState.IDLE);

    if (this.onErrorCallback) {
      this.onErrorCallback(error);
    }
  }

  // Data cleanup
  protected resetSpinData(): void {
    this.currentSpinId = undefined;
    this.currentStepIndex = 0;
    this.currentCascadeSteps = [];
    this.finalGridData = undefined; // Clear final grid data
  }

  // Event callbacks
  public setOnSpinStartCallback(callback: () => void): void {
    this.onSpinStartCallback = callback;
  }

  public setOnSpinCompleteCallback(callback: (result: IResponseData | boolean) => Promise<void>): void {
    this.onSpinCompleteCallback = callback;
  }

  public setOnCascadeStepCallback(
    callback: (stepData: CascadeStepData) => void
  ): void {
    this.onCascadeStepCallback = callback;
  }

  public setOnErrorCallback(callback: (error: string) => void): void {
    this.onErrorCallback = callback;
  }

  // State queries
  public getIsSpinning(): boolean {
    return (
      this.currentState === "spinning" || this.currentState === "cascading"
    );
  }

  public getIsIdle(): boolean {
    return this.currentState === "idle";
  }

  public getIsCompleted(): boolean {
    return this.currentState === "completed";
  }

  public getIsError(): boolean {
    return this.currentState === "error";
  }

  public getSpinMode(): SpinMode {
    return this._spinMode;
  }

  public setSpinMode(mode: SpinMode): void {
    if (this._spinMode === mode) return;

    this._spinMode = mode;
    this.container.setSpinMode(mode);
    this.reelsController.setSpinMode(mode);
    this.reelsController.getReelsContainer().setSpinMode(mode);
    this.reelsController.getStaticContainer()!.setSpinMode(mode);
  }

  // Cascade processing methods
  protected async processCascadeSequence(): Promise<void> {
    if (!this.currentCascadeSteps || this.currentCascadeSteps.length === 0) {
      debug.log("SpinController: No cascade steps to process");
      return;
    }

    debug.log(
      `SpinController: Processing ${this.currentCascadeSteps.length} cascade steps`
    );

    for (const step of this.currentCascadeSteps) {
      await this.processCascadeStep(step);

      // Notify about cascade step
      if (this.onCascadeStepCallback) {
        this.onCascadeStepCallback(step);
      }

      // Small delay between steps for visual clarity
      await Utils.delay(500);
    }
  }

  protected async processCascadeStep(step: CascadeStepData): Promise<void> {
    debug.log(`SpinController: Processing cascade step ${step.step}`);

    // Get the spin container (assuming it's a CascadeSpinContainer)
    const spinContainer = this.reelsController
      .getReelsContainer()
      ?.getSpinContainer();
    if (!spinContainer) {
      debug.error(
        "SpinController: No spin container available for cascade processing"
      );
      return;
    }

    // Process the cascade step
    if ("processCascadeStep" in spinContainer) {
      await (spinContainer as any).processCascadeStep(step);
    } else {
      debug.warn(
        "SpinController: Spin container does not support cascade processing"
      );
    }
  }

  public get symbols(): number[][] {
    return this._symbols;
  }

  public set symbols(symbols: number[][]) {
    this._symbols = symbols;
  }

  // Cleanup
  public destroy(): void {
    this.forceStop();

    this.onSpinStartCallback = undefined;
    this.onSpinCompleteCallback = undefined;
    this.onCascadeStepCallback = undefined;
    this.onErrorCallback = undefined;

    this.resetSpinData();
  }
}
