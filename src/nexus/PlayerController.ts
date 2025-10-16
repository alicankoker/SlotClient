import { debug } from '../engine/utils/debug';
import { INexusPlayerData } from './NexusInterfaces';
import { NexusPlayer } from './player/NexusPlayer';

export class PlayerController {
    private players: Map<string, NexusPlayer> = new Map();

    constructor() {
        // Initialize with a default player for demo purposes
        this.initializeDefaultPlayer();
    }

    private initializeDefaultPlayer(): void {
        const defaultPlayer = NexusPlayer.createDefaultPlayer();
        this.players.set(defaultPlayer.playerId, defaultPlayer);
        console.log('PlayerController: Initialized default player:', defaultPlayer.getPlayerState());
    }

    // Core player management methods
    public getPlayer(playerId: string): NexusPlayer | null {
        return this.players.get(playerId) || null;
    }

    public addPlayer(playerData: INexusPlayerData): NexusPlayer {
        const player = new NexusPlayer(playerData);
        this.players.set(player.playerId, player);
        console.log('PlayerController: Added new player:', player.getPlayerState());
        return player;
    }

    public removePlayer(playerId: string): boolean {
        const removed = this.players.delete(playerId);
        if (removed) {
            console.log('PlayerController: Removed player:', playerId);
        }
        return removed;
    }

    public getAllPlayers(): NexusPlayer[] {
        return Array.from(this.players.values());
    }

    public getPlayerCount(): number {
        return this.players.size;
    }

    public hasPlayer(playerId: string): boolean {
        return this.players.has(playerId);
    }

    // Convenience methods that delegate to player instances
    public getPlayerState(playerId: string): INexusPlayerData | null {
        const player = this.getPlayer(playerId);
        return player ? player.getPlayerState() : null;
    }

    public updatePlayerBalance(playerId: string, newBalance: number): boolean {
        const player = this.getPlayer(playerId);
        if (!player) {
            console.error('PlayerController: Player not found:', playerId);
            return false;
        }
        return player.updateBalance(newBalance);
    }

    public canPlayerAffordBet(playerId: string, betAmount: number): boolean {
        const player = this.getPlayer(playerId);
        if (!player) {
            console.error('PlayerController: Player not found:', playerId);
            return false;
        }
        return player.canAffordBet(betAmount);
    }

    public deductPlayerBet(playerId: string, betAmount: number): boolean {
        const player = this.getPlayer(playerId);
        if (!player) {
            console.error('PlayerController: Player not found:', playerId);
            return false;
        }
        return player.deductBet(betAmount);
    }

    public addPlayerWinnings(playerId: string, winAmount: number): boolean {
        const player = this.getPlayer(playerId);
        if (!player) {
            console.error('PlayerController: Player not found:', playerId);
            return false;
        }
        return player.addWinnings(winAmount);
    }

    // Session management methods
    public validatePlayerSession(playerId: string, sessionId: string): boolean {
        const player = this.getPlayer(playerId);
        if (!player) {
            console.error('PlayerController: Player not found for session validation:', playerId);
            return false;
        }
        return player.validateSession(sessionId);
    }

    public updatePlayerActivity(playerId: string): boolean {
        const player = this.getPlayer(playerId);
        if (!player) {
            console.error('PlayerController: Player not found for activity update:', playerId);
            return false;
        }
        player.updateActivity();
        return true;
    }

    public createPlayerSession(playerId: string): string | null {
        const player = this.getPlayer(playerId);
        if (!player) {
            console.error('PlayerController: Player not found for session creation:', playerId);
            return null;
        }
        return player.createNewSession();
    }

    // Special methods for demo purposes
    public getDefaultPlayer(): NexusPlayer | null {
        return this.getPlayer('demo_player_001');
    }

    // Player statistics and monitoring
    public getActivePlayerIds(): string[] {
        const oneHourAgo = Date.now() - (60 * 60 * 1000);
        return this.getAllPlayers()
            .filter(player => player.lastActivity > oneHourAgo)
            .map(player => player.playerId);
    }

    public getTotalPlayerBalance(): number {
        return this.getAllPlayers()
            .reduce((total, player) => total + player.balance, 0);
    }

    // Cleanup methods
    public removeInactivePlayers(inactiveThresholdMs: number = 24 * 60 * 60 * 1000): number {
        const cutoffTime = Date.now() - inactiveThresholdMs;
        const playersToRemove = this.getAllPlayers()
            .filter(player => player.lastActivity < cutoffTime && player.playerId !== 'demo_player_001') // Keep demo player
            .map(player => player.playerId);

        let removedCount = 0;
        for (const playerId of playersToRemove) {
            if (this.removePlayer(playerId)) {
                removedCount++;
            }
        }

        if (removedCount > 0) {
            console.log(`PlayerController: Removed ${removedCount} inactive players`);
        }

        return removedCount;
    }
}
