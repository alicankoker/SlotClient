import { Nexus } from '../../nexus/Nexus';
import { PlayerController } from '../../nexus/player/PlayerController';
import { GameServer } from '../../server/GameServer';
import { SpinResultData, CascadeStepData, GridData, SpinResponseData, GridUtils, MatchData, DropData, SymbolData, SpinRequestData } from '../../engine/types/GameTypes';
import { INexusPlayerData, NexusSpinRequest, SpinTransaction } from '../../nexus/NexusInterfaces';
import { debug } from '../../engine/utils/debug';
import { SpinController } from '../../engine/Spin/SpinController';
import { ClassicSpinContainer } from '../../engine/Spin/ClassicSpin/ClassicSpinContainer';
import { SpinContainer } from '../../engine/Spin/SpinContainer';
import { ReelsController } from '../../engine/reels/ReelsController';
import { Application } from 'pixi.js/lib/app/Application';
import { ClassicSpinController } from '../../engine/Spin/ClassicSpin/ClassicSpinController';
import { CascadeSpinController } from '../../engine/Spin/cascade/CascadeSpinController';
import { GameConfig, spinContainerConfig } from '../../config/GameConfig';
import { StaticContainer } from '../../engine/reels/StaticContainer';
import { ReelsContainer } from '../../engine/reels/ReelsContainer';
import { CascadeSpinContainer } from '../../engine/Spin/cascade/CascadeSpinContainer';
import { GameRulesConfig } from '../../config/GameRulesConfig';
import { Utils } from '../../engine/utils/Utils';
import { GameDataManager } from '../../engine/data/GameDataManager';

export interface SlotSpinRequest {
    playerId: string;
    betAmount: number;
    gameMode?: string;
}

export interface SlotSpinResponse {
    success: boolean;
    error?: string;
    transaction?: SpinTransaction;
    gameResult?: SpinResultData;
    playerState?: INexusPlayerData;
}

export class SlotGameController {
    private static slotGameInstance: SlotGameController;
    private nexusInstance: Nexus;
    private playerController: PlayerController;
    private gameServer: GameServer;
    private app: Application;
    public spinController!: SpinController;
    public spinContainer!: SpinContainer;
    public staticContainer!: StaticContainer;
    public reelsContainer!: ReelsContainer;
    public reelsController!: ReelsController;
    private onPlayerStateChangeCallback?: (state: INexusPlayerData) => void;
    private onSpinResultCallback?: (result: SpinResultData) => void;
    private onCascadeStepCallback?: (step: CascadeStepData) => void;

    constructor(app: Application) {
        this.app = app;
        this.nexusInstance = Nexus.getInstance();
        this.playerController = this.nexusInstance.getPlayerController();
        this.gameServer = GameServer.getInstance();
    }

    public initialize(): void {
        // Create ReelsContainer first
        this.reelsContainer = new ReelsContainer(this.app);

        // Create ReelsController with the ReelsContainer
        const initialGridData = this.gameServer.generateInitialGridData();
        console.log('SlotGameController: Initial grid data for ReelsController:', initialGridData);
        this.reelsController = new ReelsController(this.app, initialGridData, this.reelsContainer);

        this.spinContainer = new ClassicSpinContainer(this.app, spinContainerConfig);
        this.staticContainer = new StaticContainer(this.app, {
            reelIndex: 0,
            symbolHeight: GameConfig.REFERENCE_SYMBOL.height,
            symbolsVisible: GameConfig.GRID_LAYOUT.visibleRows
        });

        // Set initial visibility - StaticContainer visible, SpinContainer hidden
        this.staticContainer.visible = true;
        this.spinContainer.visible = false;

        this.reelsContainer.addChild(this.staticContainer);
        this.reelsContainer.addChild(this.spinContainer);
        this.app.stage.addChild(this.reelsContainer);

        this.spinController = new ClassicSpinController(this.spinContainer as SpinContainer, {
            reelsController: this.reelsController
        });

        this.connectControllers();
    }

    public static getInstance(): SlotGameController {
        return SlotGameController.slotGameInstance;
    }


    private connectControllers(): void {
        // Get the single containers that handle all reels
        const spinContainer = this.spinContainer;
        const staticContainer = this.staticContainer;

        if (!spinContainer) {
            debug.error('ReelsController: No SpinContainer available');
            return;
        }

        if (!staticContainer) {
            debug.error('ReelsController: No StaticContainer available');
            return;
        }

        this.reelsController.reelControllers.forEach(controller => {
            controller.setViews(staticContainer, spinContainer);
        });
    }

    // Event handlers for the unified controller
    public onPlayerStateChange(callback: (state: INexusPlayerData) => void): void {
        this.onPlayerStateChangeCallback = callback;
    }

    public onSpinResult(callback: (result: SpinResultData) => void): void {
        this.onSpinResultCallback = callback;
    }

    public onCascadeStep(callback: (step: CascadeStepData) => void): void {
        this.onCascadeStepCallback = callback;
    }

    // Main spin method that coordinates Nexus and Game Logic
    public async startSpin(request: SlotSpinRequest): Promise<SlotSpinResponse> {
        try {
            debug.log('SlotGameController: Starting spin', request);

            // 1. Validate request with game rules
            if (!this.isValidBetAmount(request.betAmount)) {
                return {
                    success: false,
                    error: 'Invalid bet amount'
                };
            }

            // 2. Create transaction through Nexus (handles balance validation and deduction)
            const nexusRequest: NexusSpinRequest = {
                playerId: request.playerId,
                betAmount: request.betAmount,
                gameMode: request.gameMode
            };

            const transaction = this.nexusInstance.createSpinTransaction(nexusRequest);
            if (!transaction) {
                return {
                    success: false,
                    error: 'Failed to create transaction (insufficient balance or player not found)'
                };
            }

            // 3. Process game logic directly
            const gameResponse = await this.processGameSpin({
                betAmount: request.betAmount,
                gameMode: request.gameMode
            });

            if (!gameResponse.success || !gameResponse.result) {
                // Game failed, refund transaction
                this.nexusInstance.failSpinTransaction(transaction.transactionId);

                return {
                    success: false,
                    error: gameResponse.error || 'Game processing failed',
                    transaction
                };
            }

            // 4. Complete transaction with win amount
            const winAmount = gameResponse.result.totalWin;
            this.nexusInstance.completeSpinTransaction(transaction.transactionId, winAmount);

            // 5. Get updated player state using PlayerController
            const updatedPlayerState = this.playerController.getPlayerState(request.playerId);

            // 6. Notify about player state change
            if (updatedPlayerState && this.onPlayerStateChangeCallback) {
                this.onPlayerStateChangeCallback(updatedPlayerState);
            }

            debug.log('SlotGameController: Spin completed successfully');

            return {
                success: true,
                transaction: this.nexusInstance.getTransaction(transaction.transactionId)!,
                gameResult: gameResponse.result,
                playerState: updatedPlayerState!
            };

        } catch (error) {
            debug.error('SlotGameController: Error during spin:', error);
            return {
                success: false,
                error: 'Unexpected error during spin processing'
            };
        }
    }

    // Utility methods using PlayerController directly
    public getPlayerState(playerId: string): INexusPlayerData | null {
        return this.playerController.getPlayerState(playerId);
    }

    public getDefaultPlayer(): INexusPlayerData | null {
        const defaultPlayer = this.playerController.getDefaultPlayer();
        return defaultPlayer ? defaultPlayer.getPlayerState() : null;
    }

    public generateInitialGrid(): GridData {
        return this.gameServer.generateInitialGridData();
    }

    public canPlayerSpin(playerId: string, betAmount: number): boolean {
        // Check both game rules and player balance using PlayerController
        return this.isValidBetAmount(betAmount) &&
            this.playerController.canPlayerAffordBet(playerId, betAmount);
    }

    public getGameRules(): any {
        return {
            minBet: 0.01,
            maxBet: 100.00,
            gridSize: { columns: 5, rows: 3 },
            symbolCount: 10,
            minMatchLength: 3
        };
    }

    // Game logic methods
    private async processGameSpin(request: { betAmount: number, gameMode?: string }): Promise<{ success: boolean, error?: string, result?: SpinResultData }> {
        try {
            debug.log('SlotGameController: Processing game spin', request);

            const response = await this.gameServer.processSpin(request);

            if (response.success && response.result) {
                // Notify about spin result (initial grid)
                if (this.onSpinResultCallback) {
                    this.onSpinResultCallback(response.result);
                }

                // Process each cascade step
                for (const step of response.result.cascadeSteps) {
                    debug.log(`SlotGameController: Processing cascade step ${step.step}`);
                    debug.log(`SlotGameController: Grid after step ${step.step}:`, step.gridAfter);

                    // Notify about cascade step
                    if (this.onCascadeStepCallback) {
                        this.onCascadeStepCallback(step);
                    }

                    // Small delay between steps for visual clarity (optional)
                    await new Promise(resolve => setTimeout(resolve, 100));
                }

                debug.log('SlotGameController: Game sequence complete. Total win:', response.result.totalWin);
                return response;
            } else {
                debug.error('SlotGameController: Game spin failed:', response.error);
                return response;
            }
        } catch (error) {
            debug.error('SlotGameController: Error during game spin:', error);
            return {
                success: false,
                error: 'Failed to process game spin'
            };
        }
    }

    private isValidBetAmount(betAmount: number): boolean {
        // This checks game rules, not player balance
        const minBet = 0.01;
        const maxBet = 100.00;
        return betAmount >= minBet && betAmount <= maxBet;
    }

    public calculateTheoreticalWin(betAmount: number): number {
        // This could be used for RTP calculations or bet validation
        // For now, just return a simple calculation
        return betAmount * 0.96; // 96% RTP example
    }

    public getPlayerTransactions(playerId: string, limit: number = 10): any[] {
        return this.nexusInstance.getPlayerTransactions(playerId, limit);
    }

    // Convenience method for executing spins
    public async executeGameSpin(betAmount: number = 10, gameMode: string = "manual"): Promise<void> {
        const response = await this.requestSpinFromServer({
            betAmount,  
            gameMode
        });

        GameDataManager.getInstance().setSpinData(response)
        if (this.spinController) {
            await this.spinController.executeSpin();
        }
    }

    // Simulate server communication (replace with actual implementation)
    protected async requestSpinFromServer(request: SpinRequestData): Promise<SpinResponseData> {
        // Simulate network delay
        await Utils.delay(100);

        // Mock response - replace with actual server call
        const createRandomGrid = (maxSymbolId: number) => {
            return Array(GameRulesConfig.GRID.rowCount * GameRulesConfig.GRID.reelCount)
                .fill(0)
                .map(() => ({ symbolId: Math.floor(Math.random() * maxSymbolId) }));
        };

        // Create realistic cascade steps with dropping symbols
        const createCascadeSteps = (initialGrid: GridData): CascadeStepData[] => {
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
        const initialGrid: GridData = {
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
        const finalGrid: GridData = cascadeSteps.length > 0
            ? cascadeSteps[cascadeSteps.length - 1].gridAfter
            : { symbols: createRandomGrid(GameRulesConfig.GRID.totalSymbols) };

        const mockResponse: SpinResponseData = {
            success: true,
            result: {
                spinId: `spin_${Date.now()}`,
                initialGrid: initialGrid,
                cascadeSteps: cascadeSteps,
                totalWin: totalWin || request.betAmount * 0.5, // Fallback to small win
                finalGrid: finalGrid,
                previousGrid: initialGrid
            }
        };

        return mockResponse;
    }
    // For demo purposes - method to add balance using PlayerController
    public addPlayerBalance(playerId: string, amount: number): boolean {
        const player = this.playerController.getPlayerState(playerId);
        if (!player) return false;

        const success = this.playerController.updatePlayerBalance(playerId, player.balance + amount);

        if (success && this.onPlayerStateChangeCallback) {
            const updatedState = this.playerController.getPlayerState(playerId);
            if (updatedState) {
                this.onPlayerStateChangeCallback(updatedState);
            }
        }

        return success;
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
    ): GridData {
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
} 