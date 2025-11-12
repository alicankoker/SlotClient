import { GridData, CascadeStepData, SpinResultData, SpinResponseData, IResponseData, IData } from '../types/ICommunication';
import { debug } from '../utils/debug';

export interface GameState {
    currentSpinId?: string;
    currentGrid?: GridData;
    initialData?: IData;
    symbolsBeforeSpin?: number[][];
    currentCascadeSteps?: CascadeStepData[];
    isSpinning: boolean;
    lastSpinResult?: SpinResultData;
    lastResponseData?: IResponseData;
    currentResponseData?: IResponseData;
    lastSpinData?: SpinResponseData;
    currentSpinData?: SpinResponseData;
    playerBalance: number;
    currentBet: number;
    betValues: number[];
    betValueIndex: number;
    maxLine: number;
    line: number;
}

export class GameDataManager {
    private static instance: GameDataManager;
    private gameState: GameState;
    private _freeSpinActive: boolean = false; // temporary flag for manually triggering free spin state
    private _isFreeSpinning: boolean = false;
    private _isAutoPlaying: boolean = false;
    private _isSkippedWinAnimation: boolean = false;

    private constructor() {
        this.gameState = {
            isSpinning: false,
            playerBalance: 1000, // Default balance
            currentBet: 10,
            betValues: [1],
            betValueIndex: 0,
            maxLine: 25,
            line: 1
        };
    }

    public static getInstance(): GameDataManager {
        if (!GameDataManager.instance) {
            GameDataManager.instance = new GameDataManager();
        }
        return GameDataManager.instance;
    }

    public setInitialData(data: IData): void {
        this.gameState.initialData = data;
        this.setInitialSymbols(data.history.reels);
    }

    public getInitialData(): IData | undefined {
        return this.gameState.initialData;
    }

    public setInitialSymbols(initialGrid: number[][]): void {
        const min = 0;
        const max = 10;

        const symbolsBefore: number[][] = initialGrid.map((column: number[]) => {
            if (column.length === 0) return column;

            const newColumn = [...column];
            const randomFirst = Math.floor(Math.random() * (max - min + 1)) + min;
            const randomLast = Math.floor(Math.random() * (max - min + 1)) + min;

            newColumn.unshift(randomFirst);
            newColumn.push(randomLast);

            return newColumn;
        });

        this.gameState.symbolsBeforeSpin = symbolsBefore;
    }

    public getInitialSymbols(): number[][] | undefined {
        return this.gameState.initialData?.history.reels;
    }

    public setResponseData(response: any): void {
        if (response) {
            this.gameState.initialData = undefined; // Clear initial data after first spin

            if (this.gameState.currentResponseData) {
                const min = 0;
                const max = 10;

                const symbolsBefore: number[][] = this.gameState.currentResponseData.reels.map((column: number[]) => {
                    if (column.length === 0) return column;

                    const newColumn = [...column];
                    const randomFirst = Math.floor(Math.random() * (max - min + 1)) + min;
                    const randomLast = Math.floor(Math.random() * (max - min + 1)) + min;

                    newColumn.unshift(randomFirst);
                    newColumn.push(randomLast);

                    return newColumn;
                });

                this.gameState.symbolsBeforeSpin = symbolsBefore;
            }

            this.gameState.lastResponseData = response as IResponseData;
            this.gameState.currentResponseData = response as IResponseData;
        }
    }

    public getResponseData(): IResponseData {
        return this.gameState.lastResponseData as IResponseData;
    }

    public checkFreeSpins(): boolean {
        return this.gameState.lastResponseData?.freeSpin !== undefined;
    }

    public checkBonus(): boolean {
        return this.gameState.lastResponseData?.bonus !== undefined;
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

    public getSymbolsBeforeSpin(): number[][] | undefined {
        if (this.gameState.symbolsBeforeSpin) {
            return this.gameState.symbolsBeforeSpin;
        } else {
            return this.getInitialSymbols();
        }
    }

    public getCurrentCascadeSteps(): CascadeStepData[] | undefined {
        return this.gameState.currentCascadeSteps;
    }

    public getIsSpinning(): boolean {
        return this.gameState.isSpinning;
    }

    public getLastSpinResult(): IResponseData | undefined {
        return this.gameState.lastResponseData;
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

    // public setSymbolsBeforeSpin(grid: GridData): void {
    //     this.gameState.symbolsBeforeSpin = grid;
    //     debug.log('GameDataManager: Symbols before spin set');
    // }

    // // Method to capture current static container symbols before starting a new spin
    // public captureCurrentStaticSymbols(): void {
    //     const totalSteps = this.gameState.currentSpinData?.result?.steps.length || 0;
    //     // This should be called before starting a new spin to capture what's currently on StaticContainer
    //     if (this.gameState.currentSpinData?.result?.steps[totalSteps ? totalSteps - 1 : 0]) {
    //         // Use the final grid from the previous spin
    //         this.gameState.symbolsBeforeSpin = this.gameState.currentSpinData.result.steps[totalSteps ? totalSteps - 1 : 0].gridAfter;
    //         debug.log('GameDataManager: Captured previous spin final symbols as symbolsBeforeSpin');
    //     } else {
    //         // First spin - no previous data, this will be set by the game initialization
    //         debug.log('GameDataManager: First spin - no previous symbols to capture');
    //     }
    // }

    // Method to set initial symbols for first spin (from game initialization)

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

    public setBetValues(betValues: number[]): void {
        this.gameState.betValues = betValues;
        debug.log('GameDataManager: Bet values set to', betValues);
    }

    public getBetValues(): number[] {
        return this.gameState.betValues;
    }

    public setBetValueIndex(index: number): void {
        this.gameState.betValueIndex = index;
        debug.log('GameDataManager: Bet value index set to', index);
    }

    public getBetValueIndex(): number {
        return this.gameState.betValueIndex;
    }

    public setMaxLine(maxLine: number): void {
        this.gameState.maxLine = maxLine;
        debug.log('GameDataManager: Max line set to', maxLine);
    }

    public getMaxLine(): number {
        return this.gameState.maxLine;
    }

    public setLine(line: number): void {
        this.gameState.line = line;
        debug.log('GameDataManager: Line set to', line);
    }

    public getLine(): number {
        return this.gameState.line;
    }

    public get isFreeSpinning(): boolean {
        return this._isFreeSpinning;
    }

    public set isFreeSpinning(value: boolean) {
        this._isFreeSpinning = value;
    }

    public get isAutoPlaying(): boolean {
        return this._isAutoPlaying;
    }

    public set isAutoPlaying(value: boolean) {
        this._isAutoPlaying = value;
    }

    public get isWinAnimationSkipped(): boolean {
        return this._isSkippedWinAnimation;
    }

    public setIsWinAnimationSkipped(value: boolean): void {
        this._isSkippedWinAnimation = value;
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
            currentBet: 10,
            betValues: [1],
            betValueIndex: 0,
            maxLine: 25,
            line: 1
        };
        debug.log('GameDataManager: All data cleared');
    }
}
