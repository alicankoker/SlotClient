import { eventType } from '@slotclient/types';
import { SpinTransaction, NexusSpinRequest } from './NexusInterfaces';
import { PlayerController } from './player/PlayerController';
import { EventDistributor } from './EventDistributor';
import { WinLines } from '@slotclient/engine/components/WinLines';
import {
    IResponseData,
    GameDataManager,
    AnimationContainer,
    FreeSpinController,
    AutoPlayController,
    signals,
    debug,
    IPayload
} from '@slotclient/engine';
import { GameServer } from '../../server/src/GameServer';

export class Nexus {
    private static instance: Nexus;
    private playerController: PlayerController;
    private eventDistributor: EventDistributor;
    private gameDataManager: GameDataManager;
    private autoPlayController: AutoPlayController;
    private freeSpinController: FreeSpinController;
    private transactions: Map<string, SpinTransaction> = new Map();
    private transactionCounter: number = 0;

    private constructor() {
        // Initialize PlayerController which handles all player management
        this.playerController = new PlayerController();
        this.eventDistributor = EventDistributor.getInstance();
        this.gameDataManager = GameDataManager.getInstance();
        this.autoPlayController = AutoPlayController.getInstance();
        this.freeSpinController = FreeSpinController.getInstance();

        this.setUIDefaults(this.gameDataManager.getGameDefaults());
        this.eventListeners();
    }

    public static getInstance(): Nexus {
        if (!Nexus.instance) {
            Nexus.instance = new Nexus();
        }
        return Nexus.instance;
    }

    private eventListeners(): void {
        signals.on('startSpin', (action) => {
            this.progressSpin(action);
        });
    }

    public async progressSpin(action: IPayload["action"] = 'spin'): Promise<void> {
        if (this.gameDataManager.isSpinning ||
            AnimationContainer.instance().getWinEvent().isWinEventActive === true ||
            this.gameDataManager.isWinAnimationPlaying === true
        ) {
            debug.warn("Nexus: Spin already in progress. Ignoring new spin request.");
            return;
        }

        if (action === undefined || action === null) {
            action = 'spin';
        }

        const balance: number = GameDataManager.getInstance().getResponseData()?.balance.after ?? GameDataManager.getInstance().getInitialData()!.balance ?? 0;
        const betValues: number[] = GameDataManager.getInstance().getBetValues();
        const betValueIndex: number = GameDataManager.getInstance().getBetValueIndex();
        const maxLines: number = GameDataManager.getInstance().getMaxLine();
        const line: number = GameDataManager.getInstance().getCurrentLine();
        const bet: number = betValues[betValueIndex] * line;

        if ((balance - bet) < 0) {
            for (let betIndex = betValues.length - 1; betIndex >= 0; betIndex--) {
                const betValue = betValues[betIndex];

                for (let lineIndex = maxLines; lineIndex > 0; lineIndex--) {
                    const adjustedBet = betValue * lineIndex;

                    if (balance - adjustedBet >= 0) {
                        WinLines.getInstance().setAvailableLines(lineIndex);
                        this.gameDataManager.setCurrentLine(lineIndex);
                        this.gameDataManager.setBetValueIndex(betIndex);

                        this.emitToUI("setLine", lineIndex);
                        this.emitToUI("setBetValueIndex", betIndex);
                        this.emitToUI("showToast", { type: "info", message: "Bet adjusted due to insufficient balance!" });
                        this.emitToUI("setMessageBox");

                        signals.emit("spinCompleted", false);
                    }
                }
            }

            this.emitToUI("showToast", { type: "warning", message: "Insufficient Balance to place a spin!" });
            this.emitToUI("setMessageBox");

            signals.emit("spinCompleted", false);
        } else {
            console.log("Nexus: Processing spin with action:", action);
            const response: IResponseData = await GameServer.getInstance().processRequest(action);

            this.emitToUI("setSpinId", response._id.toString());
            this.emitToUI("setBalance", response.balance.before);

            if (response) {
                if (this.autoPlayController.isRunning) {
                    this.emitToUI("setBatchComponentState", {
                        componentNames: ['mobileBetButton', 'betButton', 'settingsButton', 'creditButton'],
                        stateOrUpdates: { disabled: true }
                    });
                } else {
                    this.emitToUI("setBatchComponentState", {
                        componentNames: ['mobileBetButton', 'betButton', 'autoplayButton', 'mobileAutoplayButton', 'settingsButton', 'creditButton'],
                        stateOrUpdates: { disabled: true }
                    });
                }

                signals.emit("executeSpin");
            }
        }
    }

    // Access to PlayerController for all player operations
    public getPlayerController(): PlayerController {
        return this.playerController;
    }

    public getEventDistributor(): EventDistributor {
        return this.eventDistributor;
    }

    public emitToUI<K extends keyof eventType>(eventName: K, data?: eventType[K]): void {
        signals.emit(eventName, data);
        debug.log(`Nexus → UI: ${eventName}`, data);
    }

    public emitToEngine<K extends keyof eventType>(eventName: K, data?: eventType[K]): void {
        signals.emit(eventName, data);
        debug.log(`Nexus → Engine: ${eventName}`, data);
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

    public setUIDefaults(data: { betLevels: number[]; betLevelIndex: number; maxLines: number; currentLine: number; balance: number }): void {
        console.log("Nexus: Setting UI defaults with data:", data);
        signals.emit('setBetValues', data.betLevels);
        signals.emit('setBetValueIndex', data.betLevelIndex);
        signals.emit('setMaxLine', data.maxLines);
        signals.emit('setLine', data.currentLine);
        signals.emit('setBalance', data.balance);
    }

    // Future API integration points
    public async syncWithAPI(): Promise<void> {
        // TODO: Implement API synchronization
        debug.log('Nexus: API sync not implemented yet');
    }
} 