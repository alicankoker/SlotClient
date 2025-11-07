import { eventBus, eventType } from '../communication/EventManagers/WindowEventManager';
import { GameDataManager } from '../engine/data/GameDataManager';
import { debug } from '../engine/utils/debug';
import { SpinTransaction, NexusSpinRequest } from './NexusInterfaces';
import { PlayerController } from './player/PlayerController';

export class Nexus {
    private static instance: Nexus;
    private playerController: PlayerController;
    private transactions: Map<string, SpinTransaction> = new Map();
    private transactionCounter: number = 0;

    private constructor() {
        // Initialize PlayerController which handles all player management
        this.playerController = new PlayerController();
    }

    public static getInstance(): Nexus {
        if (!Nexus.instance) {
            Nexus.instance = new Nexus();
        }
        return Nexus.instance;
    }

    // Access to PlayerController for all player operations
    public getPlayerController(): PlayerController {
        return this.playerController;
    }

    // Transaction management methods - core Nexus responsibility
    public createSpinTransaction(request: NexusSpinRequest): SpinTransaction | null {
        const player = this.playerController.getPlayer(request.playerId);
        if (!player) {
            debug.error('Nexus: Player not found:', request.playerId);
            return null;
        }

        if (!this.playerController.canPlayerAffordBet(request.playerId, request.betAmount)) {
            debug.warn('Nexus: Insufficient balance for bet:', request);
            return null;
        }

        const transaction: SpinTransaction = {
            transactionId: `txn_${++this.transactionCounter}_${Date.now()}`,
            spinId: `spin_${this.transactionCounter}_${Date.now()}`,
            playerId: request.playerId,
            betAmount: request.betAmount,
            winAmount: 0, // Will be updated when spin completes
            timestamp: Date.now(),
            status: 'pending'
        };

        // Deduct bet amount from balance using PlayerController
        if (!this.playerController.deductPlayerBet(request.playerId, request.betAmount)) {
            debug.error('Nexus: Failed to deduct bet amount');
            return null;
        }
        
        this.transactions.set(transaction.transactionId, transaction);
        debug.log('Nexus: Created spin transaction:', transaction);
        
        return transaction;
    }

    public completeSpinTransaction(transactionId: string, winAmount: number): boolean {
        const transaction = this.transactions.get(transactionId);
        if (!transaction) {
            debug.error('Nexus: Transaction not found:', transactionId);
            return false;
        }

        if (transaction.status !== 'pending') {
            debug.error('Nexus: Transaction already completed:', transactionId);
            return false;
        }

        const player = this.playerController.getPlayer(transaction.playerId);
        if (!player) {
            debug.error('Nexus: Player not found for transaction:', transaction.playerId);
            return false;
        }

        // Update transaction
        transaction.winAmount = winAmount;
        transaction.status = 'completed';

        // Add winnings to player balance using PlayerController
        if (winAmount > 0) {
            this.playerController.addPlayerWinnings(transaction.playerId, winAmount);
        }

        debug.log('Nexus: Completed spin transaction:', transaction);
        return true;
    }

    public failSpinTransaction(transactionId: string): boolean {
        const transaction = this.transactions.get(transactionId);
        if (!transaction) {
            debug.error('Nexus: Transaction not found:', transactionId);
            return false;
        }

        if (transaction.status !== 'pending') {
            debug.error('Nexus: Transaction already processed:', transactionId);
            return false;
        }

        const player = this.playerController.getPlayer(transaction.playerId);
        if (!player) {
            debug.error('Nexus: Player not found for transaction:', transaction.playerId);
            return false;
        }

        // Refund bet amount using PlayerController
        this.playerController.addPlayerWinnings(transaction.playerId, transaction.betAmount);

        transaction.status = 'failed';
        debug.log('Nexus: Failed spin transaction (refunded):', transaction);
        return true;
    }

    public getTransaction(transactionId: string): SpinTransaction | null {
        return this.transactions.get(transactionId) || null;
    }

    public getPlayerTransactions(playerId: string, limit: number = 10): SpinTransaction[] {
        return Array.from(this.transactions.values())
            .filter(txn => txn.playerId === playerId)
            .sort((a, b) => b.timestamp - a.timestamp)
            .slice(0, limit);
    }

    // System-level operations
    public getSystemStats(): {
        totalPlayers: number;
        activePlayers: number;
        totalTransactions: number;
        totalPlayerBalance: number;
    } {
        return {
            totalPlayers: this.playerController.getPlayerCount(),
            activePlayers: this.playerController.getActivePlayerIds().length,
            totalTransactions: this.transactions.size,
            totalPlayerBalance: this.playerController.getTotalPlayerBalance()
        };
    }

    public setUIDefaults(data: any): void {
        eventBus.emit('setBetValues', data.betLevels);
        eventBus.emit('setBetValueIndex', data.betLevelIndex);
        eventBus.emit('setMaxLine', data.lines);
        eventBus.emit('setLine', data.lines);
        eventBus.emit('setBalance', data.balance);
        debug.log('Nexus: Game UI defaults set from initial data');
    }

    public setGameDefaults(data: any): void {
        GameDataManager.getInstance().setBetValues(data.betLevels);
        GameDataManager.getInstance().setBetValueIndex(data.betLevelIndex);
        GameDataManager.getInstance().setMaxLine(data.lines);
        GameDataManager.getInstance().setLine(data.lines);
        GameDataManager.getInstance().setPlayerBalance(data.balance);
        debug.log('Nexus: Game data defaults set from initial data');
    }

    // Future API integration points
    public async syncWithAPI(): Promise<void> {
        // TODO: Implement API synchronization
        debug.log('Nexus: API sync not implemented yet');
    }
} 