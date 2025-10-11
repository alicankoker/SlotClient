// SpinContainer import removed - not directly used in this controller
import { GameConfig } from '../../config/GameConfig';
import { GameRulesConfig } from '../../config/GameRulesConfig';
import { SpinConfig } from '../../config/SpinConfig';
import { BigWin } from '../components/BigWin';
import { ReelsController } from '../reels/ReelsController';
import {
    SpinRequestData,
    SpinResponseData,
    InitialGridData,
    CascadeStepData,
    ISpinState,
    BigWinType,
    SpinMode,
    GridUtils,
    MatchData,
    DropData,
    SymbolData
} from '../types/GameTypes';
import { debug } from '../utils/debug';
import SoundManager from '../controllers/SoundManager';
import { SpinContainer } from './SpinContainer';

export interface SpinControllerConfig {
    reelsController: ReelsController;
    defaultSpinDuration?: number;
    staggerDelay?: number;
}

export abstract class SpinController {
    private reelsController: ReelsController;
    private _soundManager: SoundManager;
    private _bigWinContainer: BigWin;

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
    private container: SpinContainer;

    constructor(container: SpinContainer, config: SpinControllerConfig) {
        this.container = container;
        this.reelsController = config.reelsController;
        this._soundManager = SoundManager.getInstance();
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

            // Step 1: Transfer symbols from StaticContainer to SpinContainer
            await this.transferSymbolsToSpinContainer(response.result.initialGrid);

            this._soundManager.play('spin', true, 0.75); // Play spin sound effect

            // Step 2: Start spinning animation
            this.reelsController.startSpin([response.result.finalGrid.symbols.map((symbol: { symbolId: number; }) => symbol.symbolId)]);

            if (this._spinMode === GameConfig.SPIN_MODES.NORMAL) {
                await this.delay(SpinConfig.SPIN_DURATION, signal);

                this._isForceStopped === false && this.reelsController.slowDown();

                await this.delay(SpinConfig.REEL_SLOW_DOWN_DURATION, signal);
            } else {
                await this.delay(SpinConfig.FAST_SPIN_SPEED);
            }

            // Step 3: Process cascade sequence (if any)
            await this.processCascadeSequence();

            // Step 4: Transfer final symbols back to StaticContainer
            await this.transferSymbolsToStaticContainer(response.result.finalGrid);

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

        // Create realistic cascade steps with dropping symbols
        const createCascadeSteps = (initialGrid: InitialGridData): CascadeStepData[] => {
            const steps: CascadeStepData[] = [];
            const totalSymbols = GameRulesConfig.GRID.totalSymbols;
            const gridSize = GameRulesConfig.GRID.rowCount * GameRulesConfig.GRID.reelCount;
            
            // Generate 1-3 cascade steps
            const numSteps = Math.floor(Math.random() * 3) + 1;
            
            for (let step = 1; step <= numSteps; step++) {
                // Find some random matches (simulate winning combinations)
                const matches: MatchData[] = [];
                const indicesToRemove: number[] = [];
                
                // Create 1-2 random horizontal matches
                const numMatches = Math.floor(Math.random() * 2) + 1;
                for (let m = 0; m < numMatches; m++) {
                    const startCol = Math.floor(Math.random() * (GameRulesConfig.GRID.reelCount - 2)); // Ensure 3+ symbols
                    const row = Math.floor(Math.random() * GameRulesConfig.GRID.rowCount);
                    const matchLength = Math.floor(Math.random() * 3) + 3; // 3-5 symbols
                    
                    const matchIndices: number[] = [];
                    for (let i = 0; i < matchLength && startCol + i < GameRulesConfig.GRID.reelCount; i++) {
                        const index = GridUtils.positionToIndex(startCol + i, row);
                        if (GridUtils.isValidIndex(index)) {
                            matchIndices.push(index);
                            indicesToRemove.push(index);
                        }
                    }
                    
                    if (matchIndices.length >= 3) {
                        matches.push({
                            indices: matchIndices,
                            matchType: 'horizontal',
                            winAmount: matchIndices.length * request.betAmount * 0.5
                        });
                    }
                }
                
                // Create drop data for symbols falling down
                const symbolsToDrop: DropData[] = [];
                const newSymbols: SymbolData[] = [];
                const newSymbolIndices: number[] = [];
                
                // For each column, simulate symbols dropping
                for (let col = 0; col < GameRulesConfig.GRID.reelCount; col++) {
                    const columnIndices = indicesToRemove.filter(idx => {
                        const { column } = GridUtils.indexToPosition(idx);
                        return column === col;
                    });
                    
                    if (columnIndices.length > 0) {
                        // Calculate how many symbols need to drop
                        const removedCount = columnIndices.length;
                        
                        // Create new symbols at the top
                        for (let i = 0; i < removedCount; i++) {
                            const newSymbolId = Math.floor(Math.random() * totalSymbols);
                            newSymbols.push({ symbolId: newSymbolId });
                            
                            // Place new symbol at the top of the column
                            const topRow = 0;
                            const newIndex = GridUtils.positionToIndex(col, topRow);
                            newSymbolIndices.push(newIndex);
                        }
                        
                        // Create drop data for existing symbols
                        const remainingIndices = [];
                        for (let row = 0; row < GameRulesConfig.GRID.rowCount; row++) {
                            const index = GridUtils.positionToIndex(col, row);
                            if (!indicesToRemove.includes(index)) {
                                remainingIndices.push(index);
                            }
                        }
                        
                        // Move remaining symbols down
                        for (let i = 0; i < remainingIndices.length; i++) {
                            const fromIndex = remainingIndices[i];
                            const toRow = i + removedCount;
                            if (toRow < GameRulesConfig.GRID.rowCount) {
                                const toIndex = GridUtils.positionToIndex(col, toRow);
                                symbolsToDrop.push({
                                    symbolId: Math.floor(Math.random() * totalSymbols), // In real implementation, get actual symbol ID
                                    fromIndex: fromIndex,
                                    toIndex: toIndex
                                });
                            }
                        }
                    }
                }
                
                // Create grid after this step by applying the changes
                const gridAfter = this.calculateGridAfterStep(initialGrid.symbols, step, matches, indicesToRemove, symbolsToDrop, newSymbols, newSymbolIndices);
                
                steps.push({
                    step: step,
                    matches: matches,
                    indicesToRemove: indicesToRemove,
                    symbolsToDrop: symbolsToDrop,
                    newSymbols: newSymbols,
                    newSymbolIndices: newSymbolIndices,
                    gridAfter: gridAfter
                });
            }
            
            return steps;
        };

        // Use server-generated initial grid
        const initialGrid: InitialGridData = {
            symbols: createRandomGrid(GameRulesConfig.GRID.totalSymbols)
        };
        
        // Generate realistic cascade steps
        const cascadeSteps = createCascadeSteps(initialGrid);
        
        // Calculate total win from all matches
        const totalWin = cascadeSteps.reduce((total, step) => {
            return total + step.matches.reduce((stepTotal, match) => {
                return stepTotal + (match.winAmount || 0);
            }, 0);
        }, 0);

        // Use the gridAfter from the last cascade step as the final grid
        const finalGrid: InitialGridData = cascadeSteps.length > 0 
            ? cascadeSteps[cascadeSteps.length - 1].gridAfter 
            : { symbols: createRandomGrid(GameRulesConfig.GRID.totalSymbols) };

        const mockResponse: SpinResponseData = {
            success: true,
            result: {
                spinId: `spin_${Date.now()}`,
                initialGrid: initialGrid,
                cascadeSteps: cascadeSteps,
                totalWin: totalWin || request.betAmount * 0.5, // Fallback to small win
                finalGrid: finalGrid
            }
        };

        return mockResponse;
    }

    // Helper method to calculate grid after applying cascade step changes
    private calculateGridAfterStep(
        initialSymbols: SymbolData[], 
        step: number, 
        matches: MatchData[], 
        indicesToRemove: number[], 
        symbolsToDrop: DropData[], 
        newSymbols: SymbolData[], 
        newSymbolIndices: number[]
    ): InitialGridData {
        // Start with a copy of the initial symbols
        const gridAfter = {
            symbols: [...initialSymbols]
        };

        // Remove matched symbols
        indicesToRemove.forEach(index => {
            if (index >= 0 && index < gridAfter.symbols.length) {
                gridAfter.symbols[index] = { symbolId: -1 }; // Mark as removed
            }
        });

        // Apply symbol drops
        symbolsToDrop.forEach(drop => {
            if (drop.toIndex >= 0 && drop.toIndex < gridAfter.symbols.length) {
                gridAfter.symbols[drop.toIndex] = { symbolId: drop.symbolId };
            }
        });

        // Add new symbols
        newSymbols.forEach((symbol, i) => {
            const index = newSymbolIndices[i];
            if (index >= 0 && index < gridAfter.symbols.length) {
                gridAfter.symbols[index] = { symbolId: symbol.symbolId };
            }
        });

        // Fill any remaining empty slots with random symbols
        for (let i = 0; i < gridAfter.symbols.length; i++) {
            if (gridAfter.symbols[i].symbolId === -1) {
                gridAfter.symbols[i] = { symbolId: Math.floor(Math.random() * GameRulesConfig.GRID.totalSymbols) };
            }
        }

        return gridAfter;
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

    // Symbol transfer methods
    private async transferSymbolsToSpinContainer(initialGrid: InitialGridData): Promise<void> {
        debug.log('SpinController: Transferring symbols from StaticContainer to SpinContainer');
        
        const reelsContainer = this.reelsController.getReelsContainer();
        if (!reelsContainer) {
            debug.error('SpinController: No reels container available for symbol transfer');
            return;
        }

        const staticContainer = reelsContainer.getStaticContainer();
        const spinContainer = reelsContainer.getSpinContainer();
        
        if (!staticContainer || !spinContainer) {
            debug.error('SpinController: Missing containers for symbol transfer');
            return;
        }

        // Hide static container symbols and clear them
        staticContainer.visible = false;
        if ('clearSymbols' in staticContainer) {
            (staticContainer as any).clearSymbols();
        }
        debug.log('SpinController: StaticContainer hidden and cleared');
        
        // Show spin container and display initial grid
        spinContainer.visible = true;
        debug.log('SpinController: SpinContainer shown');
        
        if ('displayInitialGrid' in spinContainer) {
            (spinContainer as any).displayInitialGrid(initialGrid);
            debug.log('SpinController: Initial grid displayed on SpinContainer');
        }
    }

    private async transferSymbolsToStaticContainer(finalGrid: InitialGridData): Promise<void> {
        debug.log('SpinController: Transferring final symbols from SpinContainer to StaticContainer');
        
        const reelsContainer = this.reelsController.getReelsContainer();
        if (!reelsContainer) {
            debug.error('SpinController: No reels container available for symbol transfer');
            return;
        }

        const staticContainer = reelsContainer.getStaticContainer();
        const spinContainer = reelsContainer.getSpinContainer();
        
        if (!staticContainer || !spinContainer) {
            debug.error('SpinController: Missing containers for symbol transfer');
            return;
        }

        // Hide spin container
        spinContainer.visible = false;
        
        // Show static container and update with final symbols
        staticContainer.visible = true;
        
        // Convert final grid to the format expected by StaticContainer
        const finalSymbols = this.convertGridToReelFormat(finalGrid.symbols);
        await staticContainer.updateSymbols(finalSymbols[0]); // Assuming single reel for now
    }

    // Cascade processing methods
    private async processCascadeSequence(): Promise<void> {
        if (!this.currentCascadeSteps || this.currentCascadeSteps.length === 0) {
            debug.log('SpinController: No cascade steps to process');
            return;
        }

        debug.log(`SpinController: Processing ${this.currentCascadeSteps.length} cascade steps`);
        
        for (const step of this.currentCascadeSteps) {
            await this.processCascadeStep(step);
            
            // Notify about cascade step
            if (this.onCascadeStepCallback) {
                this.onCascadeStepCallback(step);
            }
            
            // Small delay between steps for visual clarity
            await this.delay(500);
        }
    }

    private async processCascadeStep(step: CascadeStepData): Promise<void> {
        debug.log(`SpinController: Processing cascade step ${step.step}`);
        
        // Get the spin container (assuming it's a CascadeSpinContainer)
        const spinContainer = this.reelsController.getReelsContainer()?.getSpinContainer();
        if (!spinContainer) {
            debug.error('SpinController: No spin container available for cascade processing');
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