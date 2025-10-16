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
            console.error('ReelsController: No SpinContainer available');
            return;
        }

        if (!staticContainer) {
            console.error('ReelsController: No StaticContainer available');
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
        const response = await this.gameServer.processSpinRequest({
            betAmount,  
            gameMode
        });

        GameDataManager.getInstance().setSpinData(response)
        if (this.spinController) {
            await this.spinController.executeSpin();
        }
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
        /*const gridAfter = {
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

        return gridAfter;*/ 
        return { symbols: [] };
    }
} 