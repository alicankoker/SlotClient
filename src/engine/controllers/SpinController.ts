// SpinContainer import removed - not directly used in this controller
import { SpinConfig } from '../../config/SpinConfig';
import { ReelsController } from '../reels/ReelsController';
import { 
    SpinRequestData, 
    SpinResponseData, 
    InitialGridData, 
    CascadeStepData, 
    ISpinState
} from '../types/GameTypes';

export interface SpinControllerConfig {
    reelsController: ReelsController;
    defaultSpinDuration?: number;
    staggerDelay?: number;
}

export class SpinController {
    private reelsController: ReelsController;
    
    // State management
    private currentState: ISpinState = ISpinState.IDLE;
    private currentSpinId?: string;
    private currentStepIndex: number = 0;
    
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
    }

    // Main spin orchestration methods
    public async executeSpin(request: SpinRequestData): Promise<SpinResponseData> {
        if (this.currentState !== 'idle') {
            const error = `SpinController: Cannot start spin - current state is ${this.currentState}`;
            console.warn(error);
            this.handleError(error);
            return { success: false, error };
        }

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
            await this.delay(SpinConfig.SPIN_DURATION);

            this.reelsController.slowDown();

            await this.delay(SpinConfig.REEL_SLOW_DOWN_DURATION);
            //await this.processCascadeSequence();
            
            // Apply final grid with spinning animation
            //await this.applyFinalGrid();
            
            this.reelsController.stopSpin();
            this.setState(ISpinState.COMPLETED);
            
            if (this.onSpinCompleteCallback) {
                this.onSpinCompleteCallback(response);
            }
            
            return response;
            
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            this.handleError(errorMessage);
            return { success: false, error: errorMessage };
        }
    }

    // Process initial grid display
    /*private async processInitialGrid(gridData: InitialGridData): Promise<void> {
        console.log('SpinController: Processing initial grid');
        
        // Set reels to cascading mode and display initial grid
        this.reelsController.setMode('cascading');
        await this.reelsController.displayInitialGrid(gridData);
        
        this.setState(ISpinState.CASCADING);
    }*/

    // Process cascade sequence
    /*private async processCascadeSequence(): Promise<void> {
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
                await this.delay(300); // 300ms between steps
            }
        }
    }*/

    // Apply final grid with spinning animation
    private async applyFinalGrid(): Promise<void> {
        if (!this.finalGridData || !this.finalGridData.symbols) {
            console.warn('SpinController: No final grid data to apply');
            return;
        }

        console.log('SpinController: Applying final grid with spinning animation');
        
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
        
        console.log('SpinController: Converted final grid to reel format:', finalSymbols);
        return finalSymbols;
    }

    // Process individual cascade step
    /*    console.log(`SpinController: Processing cascade step ${stepData.step}`);
        
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
        
        console.log('SpinController: Force stopping spin');
        
        this.reelsController.forceStopAllReels();
        this.setState(ISpinState.IDLE);
        this.resetSpinData();
    }

    // State management
    private setState(newState: ISpinState): void {
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
    private handleError(error: string): void {
        console.error(`SpinController Error: ${error}`);
        this.setState(ISpinState.ERROR);
        
        if (this.onErrorCallback) {
            this.onErrorCallback(error);
        }
        
        // Reset to idle after error
        setTimeout(() => {
            this.setState(ISpinState.IDLE);
            this.resetSpinData();
        }, 1000);
    }

    // Data cleanup
    private resetSpinData(): void {
        this.currentSpinId = undefined;
        this.currentStepIndex = 0;
        this.currentCascadeSteps = [];
        this.finalGridData = undefined; // Clear final grid data
    }

    // Utility methods
    private delay(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
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