// SpinContainer import removed - not directly used in this controller
import { GameConfig } from '../../config/GameConfig';
import { GameRulesConfig } from '../../config/GameRulesConfig';
import { SpinConfig } from '../../config/SpinConfig';
import { BigWin } from '../components/BigWin';
import { ReelsController } from '../reels/ReelsController';
import {
    SpinRequestData,
    SpinResponseData,
    GridData,
    CascadeStepData,
    ISpinState,
    BigWinType,
    SpinMode,
    GridUtils,
    MatchData,
    DropData,
    SymbolData,
    SpinData,
    SpinResultData
} from '../types/GameTypes';
import { debug } from '../utils/debug';
import SoundManager from '../controllers/SoundManager';
import { SpinContainer } from './SpinContainer';
import { Utils } from '../utils/Utils';
import { GameDataManager } from '../data/GameDataManager';

export interface SpinControllerConfig {
    reelsController: ReelsController;
    defaultSpinDuration?: number;
    staggerDelay?: number;
}

export abstract class SpinController {
    protected reelsController: ReelsController;
    protected _soundManager: SoundManager;
    protected _bigWinContainer: BigWin;

    // State management
    protected currentState: ISpinState = ISpinState.IDLE;
    protected _spinMode: SpinMode = GameConfig.SPIN_MODES.NORMAL as SpinMode;
    protected currentSpinId?: string;
    protected currentStepIndex: number = 0;
    protected _autoPlayCount: number = 0;
    protected _autoPlayed: number = 0;
    protected _isAutoPlaying: boolean = false;
    protected _isForceStopped: boolean = false;
    protected _autoPlayDuration: number = GameConfig.AUTO_PLAY.delay || 1000;
    protected _autoPlayTimeoutID: ReturnType<typeof setTimeout> | null = null;
    protected _abortController: AbortController | null = null;

    // Spin data - store finalGrid for proper final symbol positioning
    protected currentCascadeSteps: CascadeStepData[] = [];
    protected finalGridData?: GridData; // Store final grid from server

    // Callbacks
    protected onSpinStartCallback?: () => void;
    protected onSpinCompleteCallback?: (result: SpinResponseData) => void;
    protected onCascadeStepCallback?: (stepData: CascadeStepData) => void;
    protected onErrorCallback?: (error: string) => void;
    protected container: SpinContainer;

    constructor(container: SpinContainer, config: SpinControllerConfig) {
        this.container = container;
        this.reelsController = config.reelsController;
        this._soundManager = SoundManager.getInstance();
        this._bigWinContainer = BigWin.getInstance();
    }

    // Main spin orchestration methods
    public async executeSpin(): Promise<SpinResponseData> {
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
            const response = GameDataManager.getInstance().getSpinData();

            if (!response.success || !response.result) {
                this.handleError(response.error || 'Unknown server error');
                return response;
            }

            this.currentSpinId = response.result.spinId;
            //this.currentCascadeSteps = response.result.steps;
            this.finalGridData = response.result.steps[response.result.steps.length - 1].gridAfter; // Store final grid

            // Step 1: Transfer symbols from StaticContainer to SpinContainer
            await this.transferSymbolsToSpinContainer(response.result.steps[0].gridBefore);

            this._soundManager.play('spin', true, 0.75); // Play spin sound effect

            // Step 2: Start spinning animation
            this.startSpinAnimation(response.result);

            if (this._spinMode === GameConfig.SPIN_MODES.NORMAL) {
                await Utils.delay(SpinConfig.SPIN_DURATION, signal);

                this._isForceStopped === false && this.reelsController.slowDown();

                await Utils.delay(SpinConfig.REEL_SLOW_DOWN_DURATION, signal);
            } else {
                await Utils.delay(SpinConfig.FAST_SPIN_SPEED);
            }

            // Step 3: Process cascade sequence (if any)
            await this.processCascadeSequence();

            // Step 4: Transfer final symbols back to StaticContainer
            await this.transferSymbolsToStaticContainer(response.result.steps[response.result.steps.length - 1].gridAfter);

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

                GameConfig.BIG_WIN.enabled && await this._bigWinContainer.showBigWin(15250, BigWinType.INSANE); // Example big win amount and type

                const isSkipped = (this._isAutoPlaying && GameConfig.AUTO_PLAY.skipAnimations === true && this._autoPlayCount > 0);
                GameConfig.WIN_ANIMATION.enabled && await this.reelsController.playRandomWinAnimation(isSkipped);
            }

            /*if (this._isAutoPlaying) {
                this.continueAutoPlay();
            }*/

            return response;
        } catch (error) {
            console.error('SpinController: Spin execution error', error);
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            this.handleError(errorMessage);
            return { success: false, error: errorMessage };
        }
    }

    public startSpinAnimation(spinData: SpinResultData): void {
        this.container.startSpin(spinData);
    }

    //TO-DO: This needs to be moved to somewhere else
    /**
     * @description Start auto play with a specified count.
     * @param count The number of spins to auto play.
     * @returns A promise that resolves when auto play starts.
     */
    /*public async startAutoPlay(count: number): Promise<void> {
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

        void this.continueAutoPlay();

        console.log("Auto play started with count:", this._autoPlayCount);
    }*/

    //TO-DO: This needs to be moved to somewhere else
    /**
     * @description Continue auto play if conditions are met.
     * @returns True if auto play continues, false otherwise.
     */
    /*public async continueAutoPlay(): Promise<boolean> {
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

            console.log("Continuing auto play, remaining count:", this._autoPlayCount);
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

        console.log("Auto play stopped");
    }

    // Process initial grid display
    /*protected async processInitialGrid(gridData: InitialGridData): Promise<void> {
        console.log('SpinController: Processing initial grid');
        
        // Set reels to cascading mode and display initial grid
        this.reelsController.setMode('cascading');
        await this.reelsController.displayInitialGrid(gridData);
        
        this.setState(ISpinState.CASCADING);
    }*/

    // Process cascade sequence
    /*protected async processCascadeSequence(): Promise<void> {
        console.log(`SpinController: Processing ${this.currentCascadeSteps.length} cascade steps`);
        
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

        console.log('SpinController: Converted final grid to reel format:', finalSymbols);
        return finalSymbols;
    }

    // Process individual cascade step
    /*    console.log(`SpinController: Processing cascade step ${stepData.step}`);
        
        await this.reelsController.processCascadeStep(stepData);
    }*/

    

    // Helper method to calculate grid after applying cascade step changes
    protected calculateGridAfterStep(
        initialSymbols: SymbolData[], 
        step: number,       // Cascade step number (0 = initial, 1+ = subsequent cascades)
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
        if (this.currentState === 'idle' || this.currentState === 'completed') {
            return;
        }

        console.log('SpinController: Force stopping spin');

        this._isForceStopped = true;

        this._abortController?.abort();
        this._abortController = null;

        this.reelsController.forceStopAllReels();

        this.resetSpinData();
    }

    // State management
    protected setState(newState: ISpinState): void {
        if (this.currentState === newState) return;

        console.log(`SpinController: State ${this.currentState} -> ${newState}`);
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
        console.error(`SpinController Error: ${error}`);
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

        console.log(`SpinController: Spin mode set to ${mode}`);

        if (this._spinMode === GameConfig.SPIN_MODES.FAST && this.getIsSpinning()) {
            this.forceStop();
        }
    }

    // Symbol transfer methods
    protected async transferSymbolsToSpinContainer(initialGrid: GridData): Promise<void> {
        console.log('SpinController: Transferring symbols from StaticContainer to SpinContainer');
        
        const reelsContainer = this.reelsController.getReelsContainer();
        if (!reelsContainer) {
            console.error('SpinController: No reels container available for symbol transfer');
            return;
        }

        const staticContainer = reelsContainer?.getStaticContainer();
        const spinContainer = this.container;
        
        if (!staticContainer || !spinContainer) {
            console.error('SpinController: Missing containers for symbol transfer');
            return;
        }

        // Hide static container symbols and clear them
        staticContainer.visible = false;
        if ('clearSymbols' in staticContainer) {
            (staticContainer as any).clearSymbols();
        }

        console.log('SpinController: StaticContainer hidden and cleared');
        staticContainer.visible = false;

        // Show spin container and display initial grid
        spinContainer.visible = true;
        console.log('SpinController: SpinContainer shown');
        
        if (spinContainer instanceof SpinContainer) {
            (spinContainer as any).displayInitialGrid(initialGrid);
            console.log('SpinController: Initial grid displayed on SpinContainer');
        }
    }

    protected async transferSymbolsToStaticContainer(finalGrid: GridData): Promise<void> {
        console.log('SpinController: Transferring final symbols from SpinContainer to StaticContainer');
        
        const reelsContainer = this.reelsController.getReelsContainer();
        if (!reelsContainer) {
            console.error('SpinController: No reels container available for symbol transfer');
            return;
        }

        const staticContainer = reelsContainer.getStaticContainer();
        const spinContainer = reelsContainer.getSpinContainer();
        
        if (!staticContainer || !spinContainer) {
            console.error('SpinController: Missing containers for symbol transfer');
            return;
        }

        // Hide spin container
        spinContainer.visible = false;
        
        // Show static container and update with final symbols
        staticContainer.visible = true;
        
        // Convert final grid to the format expected by StaticContainer
        const finalSymbols = this.convertGridToReelFormat(finalGrid.symbols.flat());
        await staticContainer.updateSymbols(finalSymbols[0]); // Assuming single reel for now
    }

    // Cascade processing methods
    protected async processCascadeSequence(): Promise<void> {
        if (!this.currentCascadeSteps || this.currentCascadeSteps.length === 0) {
            console.log('SpinController: No cascade steps to process');
            return;
        }

        console.log(`SpinController: Processing ${this.currentCascadeSteps.length} cascade steps`);
        
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
        console.log(`SpinController: Processing cascade step ${step.step}`);
        
        // Get the spin container (assuming it's a CascadeSpinContainer)
        const spinContainer = this.reelsController.getReelsContainer()?.getSpinContainer();
        if (!spinContainer) {
            console.error('SpinController: No spin container available for cascade processing');
            return;
        }

        // Process the cascade step
        if ('processCascadeStep' in spinContainer) {
            await (spinContainer as any).processCascadeStep(step);
        } else {
            debug.warn('SpinController: Spin container does not support cascade processing');
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