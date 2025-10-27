// Example usage of ConnectionManager
// This file demonstrates how to use the ConnectionManager to make HTTP requests to the web server

import { EventManager } from "../EventManagers/EventManager";
import { ConnectionManager } from "./ConnectionManager";
import { GameEvents } from "../Channels/EventChannels";

export class ConnectionManagerExample {
    private eventManager: EventManager;
    private connectionManager: ConnectionManager;

    constructor() {
        // Initialize EventManager
        this.eventManager = EventManager.getInstance();
        
        // Initialize ConnectionManager with default config (connects to localhost:3001)
        this.connectionManager = new ConnectionManager(this.eventManager);
        
        this.setupEventListeners();
    }

    public async initialize(): Promise<void> {
        try {
            // Connect to the web server on port 3001
            await this.connectionManager.connect();
            console.log('Successfully connected to server on port 3001');
            
            // Example: Request player balance
            await this.requestPlayerBalance('player123');
            
            // Example: Request a spin with bet=100 and lines=25
            await this.requestSpin(100, 25);
            
        } catch (error) {
            console.error('Failed to connect to server:', error);
        }
    }

    private setupEventListeners(): void {
        // Listen for connection events
        this.eventManager.on('connection:opened', (event) => {
            console.log('Connection opened:', event.data);
        });

        this.eventManager.on('connection:closed', (event) => {
            console.log('Connection closed:', event.data);
        });

        this.eventManager.on('connection:error', (event) => {
            console.error('Connection error:', event.data);
        });

        // Listen for game events
        this.eventManager.on(GameEvents.SPIN_STARTED, (event) => {
            console.log('Spin started:', event.data);
        });

        this.eventManager.on(GameEvents.SPIN_COMPLETED, (event) => {
            console.log('Spin completed:', event.data);
        });

        this.eventManager.on(GameEvents.SPIN_FAILED, (event) => {
            console.error('Spin failed:', event.data);
        });

        this.eventManager.on(GameEvents.PLAYER_BALANCE_CHANGED, (event) => {
            console.log('Balance changed:', event.data);
        });
    }

    private async requestPlayerBalance(playerId: string): Promise<void> {
        try {
            const balance = await this.connectionManager.requestBalance(playerId);
            console.log('Player balance:', balance);
        } catch (error) {
            console.error('Failed to get player balance:', error);
        }
    }

    private async requestSpin(bet: number, lines: number): Promise<void> {
        try {
            const result = await this.connectionManager.requestSpin(bet, lines);
            console.log('Spin result:', result);
            console.log(`Win amount: ${result.winAmount}`);
            console.log(`New balance: ${result.balance}`);
            console.log(`Symbols:`, result.symbols);
        } catch (error) {
            console.error('Failed to request spin:', error);
        }
    }

    public async requestGameState(playerId: string): Promise<void> {
        try {
            const gameState = await this.connectionManager.requestGameState(playerId);
            console.log('Game state:', gameState);
        } catch (error) {
            console.error('Failed to get game state:', error);
        }
    }

    public getConnectionState() {
        return this.connectionManager.getConnectionState();
    }

    public disconnect(): void {
        this.connectionManager.disconnect();
    }
}

// Usage example:
// const example = new ConnectionManagerExample();
// example.initialize();

// Example of making a spin request directly:
// const eventManager = EventManager.getInstance();
// const connectionManager = new ConnectionManager(eventManager);
// await connectionManager.connect();
// const result = await connectionManager.requestSpin(100, 25); // bet=100, lines=25
// console.log('Spin result:', result);
