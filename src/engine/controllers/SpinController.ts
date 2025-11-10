// SpinContainer import removed - not directly used in this controller
import { eventBus } from '../../communication/EventManagers/WindowEventManager';
import { GameConfig } from '../../config/GameConfig';
import { GameRulesConfig } from '../../config/GameRulesConfig';
import { SpinConfig } from '../../config/SpinConfig';
import { AnimationContainer } from '../components/AnimationContainer';
import { WinEvent } from '../components/WinEvent';
import { GameDataManager } from '../data/GameDataManager';
import { ReelsController } from '../reels/ReelsController';
import { CascadeStepData, InitialGridData, SpinResponseData, SpinRequestData } from '../types/ICommunication';
import { ISpinState, SpinMode } from '../types/ISpinConfig';
import { WinEventType } from '../types/IWinEvents';
import { debug } from '../utils/debug';
import SoundManager from './SoundManager';

export interface SpinControllerConfig {
    reelsController: ReelsController;
    defaultSpinDuration?: number;
    staggerDelay?: number;
}

export class SpinController {
    private reelsController: ReelsController;
    private _soundManager: SoundManager;
    private _winEvent: WinEvent;

    // State management
    private currentState: ISpinState = ISpinState.IDLE;
    private _spinMode: SpinMode = GameConfig.SPIN_MODES.NORMAL as SpinMode;
    private currentSpinId?: string;
    private currentStepIndex: number = 0;
    private _autoPlayCount: number = 0;
    private _autoPlayed: number = 0;
    private _isAutoPlaying: boolean = false;
    private _isForceStopped: boolean = false;
    private _autoPlayDuration: number = GameConfig.AUTO_PLAY.delay || 1000;
    private _autoPlayTimeoutID: ReturnType<typeof setTimeout> | null = null;
    private _abortController: AbortController | null = null;

    // Spin data - store finalGrid for proper final symbol positioning
    private currentCascadeSteps: CascadeStepData[] = [];
    private finalGridData?: InitialGridData; // Store final grid from server

    // Callbacks
    private onSpinStartCallback?: () => void;
    private onSpinCompleteCallback?: (result: SpinResponseData) => void;
    private onCascadeStepCallback?: (stepData: CascadeStepData) => void;
    private onErrorCallback?: (error: string) => void;

    constructor(config: SpinControllerConfig) {
        this.reelsController = config.reelsController;
        this._soundManager = SoundManager.getInstance();
        this._winEvent = WinEvent.getInstance();
    }

    // Main spin orchestration methods
    public async executeSpin(request: SpinRequestData): Promise<SpinResponseData> {
        if (this.currentState !== 'idle') {
            const error = `SpinController: Cannot start spin - current state is ${this.currentState}`;
            debug.warn(error);
            this.handleError(error);
            return { success: false, error };
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
            const response = await this.requestSpinFromServer(request);

            if (!response.success || !response.result) {
                this.handleError(response.error || 'Unknown server error');
                return response;
            }

            this.currentSpinId = response.result.spinId;
            // this.currentCascadeSteps = response.result.cascadeSteps;
            // this.finalGridData = response.result.finalGrid; // Store final grid

            // Display initial grid and start cascading
            //await this.processInitialGrid(response.result.initialGrid);

            this._soundManager.play('spin', true, 0.75); // Play spin sound effect

            //this.reelsController.startSpin([response.result.finalGrid.symbols.map((symbol: { symbolId: number; }) => symbol.symbolId)]);

            if (this._spinMode === GameConfig.SPIN_MODES.NORMAL) {
                await this.delay(SpinConfig.SPIN_DURATION, signal);

                this._isForceStopped === false && this.reelsController.slowDown();

                await this.delay(SpinConfig.REEL_SLOW_DOWN_DURATION, signal);
            } else if (this._spinMode === GameConfig.SPIN_MODES.FAST) {
                await this.delay(SpinConfig.FAST_SPIN_SPEED);
            } else {
                await this.delay(SpinConfig.TURBO_SPIN_SPEED);
            }

            //await this.processCascadeSequence();

            // Apply final grid with spinning animation
            //await this.applyFinalGrid();

            this.reelsController.stopSpin();
            this.setState(ISpinState.COMPLETED);
            this.reelsController.getReelsContainer()?.getSpinContainer()?.stopSpin();

            this._soundManager.stop('spin');
            this._soundManager.play('stop', false, 0.75); // Play stop sound effect

            if (this.onSpinCompleteCallback) {
                this.onSpinCompleteCallback(response);
            }

            await this.reelsController.setMode(ISpinState.IDLE);
            this.setState(ISpinState.IDLE);

            if (this.reelsController.checkWinCondition()) {
                if (this._isAutoPlaying && GameConfig.AUTO_PLAY.stopOnWin) {
                    this.stopAutoPlay();
                }

                GameConfig.WIN_EVENT.enabled && await this._winEvent.getController().showWinEvent(15250, WinEventType.INSANE); // Example big win amount and type

                const isSkipped = (this._isAutoPlaying && GameDataManager.getInstance().isWinAnimationSkipped && this._autoPlayCount > 0);
                GameConfig.WIN_ANIMATION.enabled && await this.reelsController.setupWinAnimation(isSkipped);
            }

            if (this._isAutoPlaying) {
                this.continueAutoPlay();
            }

            return response;
        } catch (error) {
            debug.error('SpinController: Spin execution error', error);
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            this.handleError(errorMessage);
            return { success: false, error: errorMessage };
        }
    }

    /**
     * @description Start auto play with a specified count.
     * @param count The number of spins to auto play.
     * @returns A promise that resolves when auto play starts.
     */
    public async startAutoPlay(count: number): Promise<void> {
        if (this._isAutoPlaying || this.getIsSpinning()) {
            return;
        }

        this._autoPlayCount = count;
        this._autoPlayed = 0;
        this._isAutoPlaying = true;

        eventBus.emit("setMessageBox", { variant: "autoPlay", message: this._autoPlayCount.toString() });

        const staticContainer = this.reelsController.getStaticContainer();
        if (staticContainer) staticContainer.allowLoop = false; // Disable looped win animation during auto play

        void this.continueAutoPlay();

        debug.log("Auto play started with count:", this._autoPlayCount);
    }

    /**
     * @description Continue auto play if conditions are met.
     * @returns True if auto play continues, false otherwise.
     */
    public async continueAutoPlay(): Promise<boolean> {
        if (!this._isAutoPlaying || this.getIsSpinning() || this._autoPlayCount <= 0) {
            this.stopAutoPlay();
            return false;
        }

        // Set up the auto play timeout
        this._autoPlayTimeoutID = setTimeout(async () => {
            const response = this.executeSpin({ betAmount: 1 }); // Replace with actual bet amount

            // Check if the spin was successful. If not, stop auto play.
            if (!response) {
                this.stopAutoPlay();
                return false;
            }

            this._autoPlayCount -= 1;
            this._autoPlayed += 1;

            eventBus.emit("setMessageBox", { variant: "autoPlay", message: this._autoPlayCount.toString() });

            if (this._autoPlayCount <= 0) {
                const staticContainer = this.reelsController.getStaticContainer();
                // Re-enable looped win animation after last auto play spin
                if (staticContainer) staticContainer.allowLoop = GameConfig.WIN_ANIMATION.winLoop ?? true;
            }

            debug.log("Continuing auto play, remaining count:", this._autoPlayCount);
        }, this._autoPlayDuration);

        return true;
    }

    /**
     * @description Stop auto play.
     */
    public stopAutoPlay(): void {
        if (!this._isAutoPlaying) {
            return;
        }

        this._autoPlayCount = 0;
        this._autoPlayed = 0;
        this._isAutoPlaying = false;

        eventBus.emit("setMessageBox");

        const staticContainer = this.reelsController.getStaticContainer();
        // Re-enable looped win animation after auto play stops
        if (staticContainer) staticContainer.allowLoop = GameConfig.WIN_ANIMATION.winLoop ?? true;

        if (this._autoPlayTimeoutID) {
            clearTimeout(this._autoPlayTimeoutID);
            this._autoPlayTimeoutID = null;
        }

        debug.log("Auto play stopped");
    }

    // Process initial grid display
    /*private async processInitialGrid(gridData: InitialGridData): Promise<void> {
        debug.log('SpinController: Processing initial grid');
        
        // Set reels to cascading mode and display initial grid
        this.reelsController.setMode('cascading');
        await this.reelsController.displayInitialGrid(gridData);
        
        this.setState(ISpinState.CASCADING);
    }*/

    // Process cascade sequence
    /*private async processCascadeSequence(): Promise<void> {
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
                await this.delay(300); // 300ms between steps
            }
        }
    }*/

    // Apply final grid with spinning animation
    private async applyFinalGrid(): Promise<void> {
        if (!this.finalGridData || !this.finalGridData.symbols) {
            debug.warn('SpinController: No final grid data to apply');
            return;
        }

        debug.log('SpinController: Applying final grid with spinning animation');

        // Convert finalGrid symbols to the format expected by ReelsController.startSpin()
        // const finalSymbols = this.convertGridToReelFormat(this.finalGridData.symbols);

        // Apply final symbols with spinning animation
        //await this.reelsController.startSpin(finalSymbols);
    }

    // Convert grid format to reel format for ReelsController.startSpin()
    private convertGridToReelFormat(gridSymbols: Array<{ symbolId: number }>): number[][] {
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

        debug.log('SpinController: Converted final grid to reel format:', finalSymbols);
        return finalSymbols;
    }

    // Process individual cascade step
    /*    debug.log(`SpinController: Processing cascade step ${stepData.step}`);
        
        await this.reelsController.processCascadeStep(stepData);
    }*/

    // Simulate server communication (replace with actual implementation)
    private async requestSpinFromServer(request: SpinRequestData): Promise<SpinResponseData> {
        // Simulate network delay
        await this.delay(100);

        // Mock response - replace with actual server call
        const createRandomGrid = (maxSymbolId: number) => {
            return Array(GameRulesConfig.GRID.rowCount * GameRulesConfig.GRID.reelCount)
                .fill(0)
                .map(() => ({ symbolId: Math.floor(Math.random() * maxSymbolId) }));
        };

        const mockResponse: SpinResponseData = {
            success: true,
            // result: {
            //     spinId: `spin_${Date.now()}`,
            //     initialGrid: {
            //         symbols: createRandomGrid(GameRulesConfig.GRID.totalSymbols)
            //     },
            //     cascadeSteps: [
            //         {
            //             step: 1,
            //             matches: [],
            //             indicesToRemove: [0, 1, 2],
            //             symbolsToDrop: [],
            //             newSymbols: [
            //                 { symbolId: Math.floor(Math.random() * GameRulesConfig.GRID.totalSymbols) },
            //                 { symbolId: Math.floor(Math.random() * GameRulesConfig.GRID.totalSymbols) },
            //                 { symbolId: Math.floor(Math.random() * GameRulesConfig.GRID.totalSymbols) }
            //             ],
            //             newSymbolIndices: [0, 1, 2],
            //             gridAfter: {
            //                 symbols: createRandomGrid(GameRulesConfig.GRID.totalSymbols)
            //             }
            //         }
            //     ],
            //     totalWin: request.betAmount * 2,
            //     finalGrid: {
            //         symbols: createRandomGrid(GameRulesConfig.GRID.totalSymbols)
            //     }
            // }
        };

        return mockResponse;
    }

    // Force stop current spin
    public forceStop(): void {
        if (this.currentState === 'idle' || this.currentState === 'completed') {
            return;
        }

        debug.log('SpinController: Force stopping spin');

        this._isForceStopped = true;

        this._abortController?.abort();
        this._abortController = null;

        this.reelsController.forceStopAllReels();

        this.resetSpinData();
    }

    // State management
    private setState(newState: ISpinState): void {
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
    private handleError(error: string): void {
        debug.error(`SpinController Error: ${error}`);
        this.setState(ISpinState.IDLE);

        if (this.onErrorCallback) {
            this.onErrorCallback(error);
        }
    }

    // Data cleanup
    private resetSpinData(): void {
        this.currentSpinId = undefined;
        this.currentStepIndex = 0;
        this.currentCascadeSteps = [];
        this.finalGridData = undefined; // Clear final grid data
    }

    // Utility methods
    private delay(ms: number, signal?: AbortSignal): Promise<void> {
        return new Promise((resolve, reject) => {
            const id = setTimeout(() => resolve(), ms);

            if (signal) {
                if (signal.aborted) {
                    clearTimeout(id);
                    resolve();
                    return;
                }

                signal.addEventListener("abort", () => {
                    clearTimeout(id);
                    resolve();
                }, { once: true });
            }
        });
    }

    // Event callbacks
    public setOnSpinStartCallback(callback: () => void): void {
        this.onSpinStartCallback = callback;
    }

    public setOnSpinCompleteCallback(callback: (result: SpinResponseData) => void): void {
        this.onSpinCompleteCallback = callback;
    }

    public setOnCascadeStepCallback(callback: (stepData: CascadeStepData) => void): void {
        this.onCascadeStepCallback = callback;
    }

    public setOnErrorCallback(callback: (error: string) => void): void {
        this.onErrorCallback = callback;
    }

    // State queries
    public getIsSpinning(): boolean {
        return this.currentState === 'spinning' || this.currentState === 'cascading';
    }

    public getIsAutoPlaying(): boolean {
        return this._isAutoPlaying;
    }

    public getAutoPlayCount(): number {
        return this._autoPlayCount;
    }

    public getIsIdle(): boolean {
        return this.currentState === 'idle';
    }

    public getIsCompleted(): boolean {
        return this.currentState === 'completed';
    }

    public getIsError(): boolean {
        return this.currentState === 'error';
    }

    public getSpinMode(): SpinMode {
        return this._spinMode;
    }

    public setSpinMode(mode: SpinMode): void {
        if (this._spinMode === mode) return;

        this._spinMode = mode;
        this.reelsController.setSpinMode(mode);

        debug.log(`SpinController: Spin mode set to ${mode}`);

        if (this._spinMode === GameConfig.SPIN_MODES.FAST && this.getIsSpinning()) {
            this.forceStop();
        }
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