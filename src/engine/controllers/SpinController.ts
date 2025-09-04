// SpinContainer import removed - not directly used in this controller
import { GameConfig } from '../../config/GameConfig';
import { SpinConfig } from '../../config/SpinConfig';
import { BigWin } from '../components/BigWin';
import { ReelsController } from '../reels/ReelsController';
import {
    SpinRequestData,
    SpinResponseData,
    InitialGridData,
    CascadeStepData,
    ISpinState,
    BigWinType
} from '../types/GameTypes';
import { debug } from '../utils/debug';

export interface SpinControllerConfig {
    reelsController: ReelsController;
    defaultSpinDuration?: number;
    staggerDelay?: number;
}

export class SpinController {
    private reelsController: ReelsController;
    private _bigWinContainer: BigWin;

    // State management
    private currentState: ISpinState = ISpinState.IDLE;
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
        this._bigWinContainer = BigWin.getInstance();
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
            this.currentCascadeSteps = response.result.cascadeSteps;
            this.finalGridData = response.result.finalGrid; // Store final grid

            // Display initial grid and start cascading
            //await this.processInitialGrid(response.result.initialGrid);

            this.reelsController.startSpin([response.result.finalGrid.symbols.map((symbol: { symbolId: number; }) => symbol.symbolId)]);

            await this.delay(SpinConfig.SPIN_DURATION, signal);

            this._isForceStopped === false && this.reelsController.slowDown();

            await this.delay(SpinConfig.REEL_SLOW_DOWN_DURATION, signal);
            //await this.processCascadeSequence();

            // Apply final grid with spinning animation
            //await this.applyFinalGrid();

            this.reelsController.stopSpin();
            this.setState(ISpinState.COMPLETED);

            if (this.onSpinCompleteCallback) {
                this.onSpinCompleteCallback(response);
            }

            await this.reelsController.setMode(ISpinState.IDLE);
            this.setState(ISpinState.IDLE);

            if (this.reelsController.checkWinCondition()) {
                if (this._isAutoPlaying && GameConfig.AUTO_PLAY.stopOnWin) {
                    this.stopAutoPlay();
                }

                await this._bigWinContainer.showBigWin(15250, BigWinType.INSANE); // Example big win amount and type

                const isSkipped = (this._isAutoPlaying && GameConfig.AUTO_PLAY.skipAnimations === true && this._autoPlayCount > 0);
                GameConfig.WIN_ANIMATION.enabled && await this.reelsController.playRandomWinAnimation(isSkipped);
            }

            if (this._isAutoPlaying) {
                this.continueAutoPlay();
            }

            return response;
        } catch (error) {
            console.error('SpinController: Spin execution error', error);
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

        const text = `Starting Auto Play: ${this._autoPlayCount}`;
        this.reelsController.getReelsContainer().setAutoPlayCount(this._autoPlayCount, text);
        this.reelsController.getReelsContainer().getAutoPlayCountText().visible = true;

        const staticContainer = this.reelsController.getStaticContainer();
        if (staticContainer) staticContainer.allowLoop = false; // Disable looped win animation during auto play

        await this.continueAutoPlay();

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

            const text = `Auto Plays Left: ${this._autoPlayCount}`;
            this.reelsController.getReelsContainer().setAutoPlayCount(this._autoPlayCount, text);

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

        const text = `Auto Play Stopped`;
        this.reelsController.getReelsContainer().setAutoPlayCount(this._autoPlayCount, text);
        this.reelsController.getReelsContainer().getAutoPlayCountText().visible = false;

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
        const mockResponse: SpinResponseData = {
            success: true,
            result: {
                spinId: `spin_${Date.now()}`,
                initialGrid: {
                    symbols: Array(15).fill(0).map((_, i) => ({ symbolId: i % 10 }))
                },
                cascadeSteps: [
                    {
                        step: 1,
                        matches: [],
                        indicesToRemove: [0, 1, 2],
                        symbolsToDrop: [],
                        newSymbols: [{ symbolId: 5 }, { symbolId: 6 }, { symbolId: 7 }],
                        newSymbolIndices: [0, 1, 2],
                        gridAfter: {
                            symbols: Array(15).fill(0).map((_, i) => ({ symbolId: (i + 5) % 10 }))
                        }
                    }
                ],
                totalWin: request.betAmount * 2,
                finalGrid: {
                    symbols: Array(15).fill(0).map((_, i) => ({ symbolId: (i + 5) % 10 }))
                }
            }
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

        //this.setState(ISpinState.IDLE);
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