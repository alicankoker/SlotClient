import { Nexus } from '../../nexus/Nexus';
import { PlayerController } from '../../nexus/player/PlayerController';
import { GameServer } from '../../server/GameServer';
import { SpinResultData, CascadeStepData, InitialGridData } from '../../engine/types/GameTypes';
import { INexusPlayerData, NexusSpinRequest, SpinTransaction } from '../../nexus/NexusInterfaces';
import { debug } from '../../engine/utils/debug';

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
    private onPlayerStateChangeCallback?: (state: INexusPlayerData) => void;
    private onSpinResultCallback?: (result: SpinResultData) => void;
    private onCascadeStepCallback?: (step: CascadeStepData) => void;

    private constructor() {
        this.nexusInstance = Nexus.getInstance();
        this.playerController = this.nexusInstance.getPlayerController();
        this.gameServer = GameServer.getInstance();
    }

    public static getInstance(): SlotGameController {
        if (!SlotGameController.slotGameInstance) {
            SlotGameController.slotGameInstance = new SlotGameController();
        }
        return SlotGameController.slotGameInstance;
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

    public generateInitialGrid(): InitialGridData {
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
} 