import { GridData, CascadeStepData, SpinResultData, SpinResponseData } from '../types/ICommunication';
import { debug } from '../utils/debug';

export interface GameState {
    currentSpinId?: string;
    currentGrid?: GridData;
    symbolsBeforeSpin?: GridData;
    currentCascadeSteps?: CascadeStepData[];
    isSpinning: boolean;
    lastSpinResult?: SpinResultData;
    lastSpinData?: SpinResponseData;
    currentSpinData?: SpinResponseData;
    playerBalance: number;
    currentBet: number;
}

export class GameDataManager {
    private static instance: GameDataManager;
    private gameState: GameState;
    private _freeSpinActive: boolean = false;

    private constructor() {
        this.gameState = {
            isSpinning: false,
            playerBalance: 1000, // Default balance
            currentBet: 10
        };
    }

    public static getInstance(): GameDataManager {
        if (!GameDataManager.instance) {
            GameDataManager.instance = new GameDataManager();
        }
        return GameDataManager.instance;
    }
    setSpinData(response: SpinResponseData): void {
        // Store the previous spin result as the "before" state
        if (this.gameState.currentSpinData?.result) {
            this.gameState.symbolsBeforeSpin = this.gameState.currentSpinData.result.steps[0].gridBefore;
        }
        
        this.gameState.lastSpinResult = response.result;
        this.gameState.currentSpinData = response;
    }

    getSpinData(): SpinResponseData {
        return {
            success: true,
            result: this.gameState.lastSpinResult
        };
    }

    checkFreeSpins(): boolean {
        return this._freeSpinActive;
        // const currentSpinData = this.gameState.currentSpinData;

        // return (currentSpinData && currentSpinData.result && currentSpinData.result.fsWon) || false;

        // return true; // For testing purposes, always return true
    }

    public get freeSpinActive(): boolean {
        return this._freeSpinActive;
    }

    public set freeSpinActive(value: boolean) {
        this._freeSpinActive = value;
    }

    // Getters
    public getCurrentSpinId(): string | undefined {
        return this.gameState.currentSpinId;
    }

    public getCurrentGrid(): GridData | undefined {
        return this.gameState.currentGrid;
    }

    public getSymbolsBeforeSpin(): GridData | undefined {
        return this.gameState.symbolsBeforeSpin;
    }

    public getCurrentCascadeSteps(): CascadeStepData[] | undefined {
        return this.gameState.currentCascadeSteps;
    }

    public getIsSpinning(): boolean {
        return this.gameState.isSpinning;
    }

    public getLastSpinResult(): SpinResultData | undefined {
        return this.gameState.lastSpinResult;
    }

    public getPlayerBalance(): number {
        return this.gameState.playerBalance;
    }

    public getCurrentBet(): number {
        return this.gameState.currentBet;
    }

    public getFullState(): GameState {
        return { ...this.gameState };
    }

    // Setters
    public setCurrentSpinId(spinId: string): void {
        this.gameState.currentSpinId = spinId;
        debug.log('GameDataManager: Current spin ID set to', spinId);
    }

    public setCurrentGrid(grid: GridData): void {
        this.gameState.currentGrid = grid;
        debug.log('GameDataManager: Current grid updated');
    }

    public setSymbolsBeforeSpin(grid: GridData): void {
        this.gameState.symbolsBeforeSpin = grid;
        debug.log('GameDataManager: Symbols before spin set');
    }

    // Method to capture current static container symbols before starting a new spin
    public captureCurrentStaticSymbols(): void {
        const totalSteps = this.gameState.currentSpinData?.result?.steps.length || 0;
        // This should be called before starting a new spin to capture what's currently on StaticContainer
        if (this.gameState.currentSpinData?.result?.steps[totalSteps ? totalSteps - 1 : 0]) {
            // Use the final grid from the previous spin
            this.gameState.symbolsBeforeSpin = this.gameState.currentSpinData.result.steps[totalSteps ? totalSteps - 1 : 0].gridAfter;
            debug.log('GameDataManager: Captured previous spin final symbols as symbolsBeforeSpin');
        } else {
            // First spin - no previous data, this will be set by the game initialization
            debug.log('GameDataManager: First spin - no previous symbols to capture');
        }
    }

    // Method to set initial symbols for first spin (from game initialization)
    public setInitialSymbols(initialGrid: GridData): void {
        this.gameState.symbolsBeforeSpin = initialGrid;
        debug.log('GameDataManager: Set initial symbols for first spin');
    }

    public setCurrentCascadeSteps(steps: CascadeStepData[]): void {
        this.gameState.currentCascadeSteps = steps;
        debug.log('GameDataManager: Cascade steps updated', steps.length);
    }

    public setIsSpinning(isSpinning: boolean): void {
        this.gameState.isSpinning = isSpinning;
        debug.log('GameDataManager: Spin state set to', isSpinning);
    }

    public setLastSpinResult(result: SpinResultData): void {
        this.gameState.lastSpinResult = result;
        debug.log('GameDataManager: Last spin result updated');
    }

    public setPlayerBalance(balance: number): void {
        this.gameState.playerBalance = balance;
        debug.log('GameDataManager: Player balance set to', balance);
    }

    public setCurrentBet(bet: number): void {
        this.gameState.currentBet = bet;
        debug.log('GameDataManager: Current bet set to', bet);
    }

    // Update multiple properties at once
    public updateSpinData(spinId: string, grid: GridData, steps: CascadeStepData[]): void {
        this.setCurrentSpinId(spinId);
        this.setCurrentGrid(grid);
        this.setCurrentCascadeSteps(steps);
        this.setIsSpinning(true);
    }

    // Reset spin data
    public resetSpinData(): void {
        this.gameState.currentSpinId = undefined;
        this.gameState.currentGrid = undefined;
        this.gameState.currentCascadeSteps = undefined;
        this.gameState.isSpinning = false;
        debug.log('GameDataManager: Spin data reset');
    }

    // Clear all data
    public clearAll(): void {
        this.gameState = {
            isSpinning: false,
            playerBalance: 1000,
            currentBet: 10
        };
        debug.log('GameDataManager: All data cleared');
    }
}
