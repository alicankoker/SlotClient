import { debug } from "../../engine/utils/debug";
import { INexusPlayerData } from "../NexusInterfaces";

export class NexusPlayer {
    private playerData: INexusPlayerData;

    constructor(playerData: INexusPlayerData) {
        this.playerData = { ...playerData };
    }

    // Getters for player data
    public get playerId(): string {
        return this.playerData.playerId;
    }

    public get balance(): number {
        return this.playerData.balance;
    }

    public get currency(): string {
        return this.playerData.currency;
    }

    public get sessionId(): string {
        return this.playerData.sessionId;
    }

    public get lastActivity(): number {
        return this.playerData.lastActivity;
    }

    // Get complete player state
    public getPlayerState(): INexusPlayerData {
        return { ...this.playerData };
    }

    // Update player balance
    public updateBalance(newBalance: number): boolean {
        if (newBalance < 0) {
            debug.error('NexusPlayer: Cannot set negative balance:', newBalance);
            return false;
        }

        this.playerData.balance = newBalance;
        this.playerData.lastActivity = Date.now();
        
        debug.log(`NexusPlayer: Updated balance for ${this.playerId}: ${this.balance}`);
        return true;
    }

    // Check if player can afford a bet
    public canAffordBet(betAmount: number): boolean {
        if (betAmount <= 0) {
            debug.error('NexusPlayer: Invalid bet amount:', betAmount);
            return false;
        }

        return this.balance >= betAmount;
    }

    // Deduct bet amount from balance
    public deductBet(betAmount: number): boolean {
        if (!this.canAffordBet(betAmount)) {
            debug.warn('NexusPlayer: Insufficient balance for bet:', betAmount, 'Available:', this.balance);
            return false;
        }

        return this.updateBalance(this.balance - betAmount);
    }

    // Add winnings to balance
    public addWinnings(winAmount: number): boolean {
        if (winAmount < 0) {
            debug.error('NexusPlayer: Cannot add negative winnings:', winAmount);
            return false;
        }

        return this.updateBalance(this.balance + winAmount);
    }

    // Validate player session
    public validateSession(sessionId: string): boolean {
        return this.sessionId === sessionId;
    }

    // Update session activity
    public updateActivity(): void {
        this.playerData.lastActivity = Date.now();
    }

    // Create a new session
    public createNewSession(): string {
        const newSessionId = `session_${Date.now()}_${this.playerId}`;
        this.playerData.sessionId = newSessionId;
        this.updateActivity();
        return newSessionId;
    }

    // Static method to create a default demo player
    public static createDefaultPlayer(): NexusPlayer {
        const defaultPlayerData: INexusPlayerData = {
            playerId: 'demo_player_001',
            balance: 1000.00,
            currency: 'USD',
            sessionId: `session_${Date.now()}`,
            lastActivity: Date.now()
        };
        
        return new NexusPlayer(defaultPlayerData);
    }
}