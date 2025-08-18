import { GameServer } from '../../server/GameServer';
import { GameConfig } from '../../config/GameConfig';
import { 
    SpinRequestData, 
    SpinResultData, 
    CascadeStepData,
    GameState 
} from '../types/GameTypes';
import { debug } from '../utils/debug';

export class GameController {
    private static instance: GameController;
    private gameServer: GameServer;
    private gameState: GameState;
    private onStateChangeCallback?: (state: GameState) => void;
    private onSpinResultCallback?: (result: SpinResultData) => void;
    private onCascadeStepCallback?: (step: CascadeStepData) => void;

    private constructor() {
        this.gameServer = GameServer.getInstance();
        this.gameState = {
            currentStep: 0,
            isProcessing: false,
            balance: GameConfig.GAME_RULES.initialBalance,
            lastBet: GameConfig.GAME_RULES.defaultBet
        };
    }

    public static getInstance(): GameController {
        if (!GameController.instance) {
            GameController.instance = new GameController();
        }
        return GameController.instance;
    }

    // Event handlers
    public onStateChange(callback: (state: GameState) => void): void {
        this.onStateChangeCallback = callback;
    }

    public onSpinResult(callback: (result: SpinResultData) => void): void {
        this.onSpinResultCallback = callback;
    }

    public onCascadeStep(callback: (step: CascadeStepData) => void): void {
        this.onCascadeStepCallback = callback;
    }

    // Game actions
    public async startSpin(betAmount?: number): Promise<boolean> {
        if (this.gameState.isProcessing) {
            debug.warn('GameController: Spin already in progress');
            return false;
        }

        const bet = betAmount || this.gameState.lastBet;
        
        if (bet > this.gameState.balance) {
            debug.warn('GameController: Insufficient balance');
            return false;
        }

        // Update state
        this.updateGameState({
            isProcessing: true,
            lastBet: bet,
            balance: this.gameState.balance - bet,
            currentStep: 0
        });

        try {
            debug.log('GameController: Starting spin with bet:', bet);
            
            const request: SpinRequestData = {
                betAmount: bet
            };

            const response = await this.gameServer.processSpin(request);
            if(response.success) {
                if(response.result?.cascadeSteps && response.result.cascadeSteps.length > 0) {
                    //debugger;
                }
            } else {
                debug.error('GameController: Spin failed:', response.error);
                return false;
            }
            
            if (response.success && response.result) {
                await this.processSpinResult(response.result);
                return true;
            } else {
                debug.error('GameController: Spin failed:', response.error);
                // Refund bet on failure
                this.updateGameState({
                    balance: this.gameState.balance + bet,
                    isProcessing: false
                });
                return false;
            }
        } catch (error) {
            debug.error('GameController: Error during spin:', error);
            // Refund bet on error
            this.updateGameState({
                balance: this.gameState.balance + bet,
                isProcessing: false
            });
            return false;
        }
    }

    private async processSpinResult(result: SpinResultData): Promise<void> {
        debug.log('GameController: Processing spin result:', result);
        
        // Update game state with spin ID
        this.updateGameState({
            currentSpinId: result.spinId
        });

        // Notify about spin result (initial grid)
        if (this.onSpinResultCallback) {
            this.onSpinResultCallback(result);
        }

        // Process each cascade step immediately (no animation delays)
        for (let i = 0; i < result.cascadeSteps.length; i++) {
            const step = result.cascadeSteps[i];
            
            debug.log(`GameController: Processing cascade step ${step.step}`);
            debug.log(`GameController: Grid after step ${step.step}:`, step.gridAfter);
            
            // Update current step
            this.updateGameState({
                currentStep: step.step
            });

            // Notify about cascade step
            if (this.onCascadeStepCallback) {
                this.onCascadeStepCallback(step);
            }

            // Small delay between steps for visual clarity (optional)
            await new Promise(resolve => setTimeout(resolve, 100)); // Very short delay
        }

        // Add winnings to balance
        this.updateGameState({
            balance: this.gameState.balance + result.totalWin,
            isProcessing: false,
            currentSpinId: undefined,
            currentStep: 0
        });

        debug.log('GameController: Spin sequence complete. Total win:', result.totalWin);
    }

    // State management
    public getGameState(): GameState {
        return { ...this.gameState };
    }

    private updateGameState(updates: Partial<GameState>): void {
        this.gameState = { ...this.gameState, ...updates };
        
        debug.log('GameController: State updated:', this.gameState);
        
        if (this.onStateChangeCallback) {
            this.onStateChangeCallback(this.getGameState());
        }
    }

    // Utility methods
    public canSpin(): boolean {
        return !this.gameState.isProcessing && 
               this.gameState.balance >= GameConfig.GAME_RULES.minBet;
    }

    public setBet(amount: number): boolean {
        if (this.gameState.isProcessing) {
            return false;
        }

        const clampedBet = GameConfig.clampBet(amount);
        if (clampedBet <= this.gameState.balance) {
            this.updateGameState({ lastBet: clampedBet });
            return true;
        }
        
        return false;
    }

    public addBalance(amount: number): void {
        this.updateGameState({
            balance: Math.max(0, this.gameState.balance + amount)
        });
    }

    // For testing/debugging
    public reset(): void {
        this.gameState = {
            currentStep: 0,
            isProcessing: false,
            balance: GameConfig.GAME_RULES.initialBalance,
            lastBet: GameConfig.GAME_RULES.defaultBet
        };
        
        if (this.onStateChangeCallback) {
            this.onStateChangeCallback(this.getGameState());
        }
    }
} 