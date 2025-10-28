// GameIntegration - Example of integrating EventManager with the existing slot game
// This shows how to add event tracking to your current game controllers

import { EventManager, GameEventEmitter } from './EventManagers/EventManager';
import { GameEvents } from './Channels/EventChannels';
import { EventAdapterFactory, EventBridge } from './EventAdapters';
import { debug } from '../engine/utils/debug';

// Example integration with SpinController
export class EventEnabledSpinController {
    private eventManager: EventManager;
    private gameEmitter: GameEventEmitter;
    private bridge: EventBridge;

    constructor() {
        // Initialize EventManager
        this.eventManager = EventManager.createInstance({
            enablePersistence: true,
            maxEventHistory: 2000,
            enableReplay: true,
            middleware: [
                {
                    name: 'game-logging',
                    execute: (event, next) => {
                        debug.log(`[GameEvent] ${event.type}:`, event.data);
                        next();
                    }
                }
            ]
        });

        this.gameEmitter = new GameEventEmitter(this.eventManager);
        this.bridge = new EventBridge(this.eventManager);

        // Setup event listeners
        this.setupEventListeners();
    }

    private setupEventListeners(): void {
        // Listen to all game events for analytics
        this.eventManager.on('*', (event) => {
            this.trackEventForAnalytics(event);
        });

        // Listen to specific events for game logic
        this.eventManager.on(GameEvents.SPIN_STARTED, (event) => {
            this.onSpinStarted(event);
        });

        this.eventManager.on(GameEvents.SPIN_COMPLETED, (event) => {
            this.onSpinCompleted(event);
        });

        this.eventManager.on(GameEvents.WIN_DETECTED, (event) => {
            this.onWinDetected(event);
        });

        this.eventManager.on(GameEvents.BIG_WIN_TRIGGERED, (event) => {
            this.onWinEventTriggered(event);
        });
    }

    private trackEventForAnalytics(event: any): void {
        // In a real implementation, this would send to your analytics service
        debug.log('Analytics: Tracking event', event.type, event.data);
    }

    private onSpinStarted(event: any): void {
        debug.log('Game Logic: Spin started for player', event.context.playerId);
        // Add any game-specific logic here
    }

    private onSpinCompleted(event: any): void {
        debug.log('Game Logic: Spin completed with result', event.data.result);
        // Add any game-specific logic here
    }

    private onWinDetected(event: any): void {
        debug.log('Game Logic: Win detected', event.data.winAmount);
        // Add any game-specific logic here
    }

    private onWinEventTriggered(event: any): void {
        debug.log('Game Logic: Big win triggered!', event.data.winAmount);
        // Add any game-specific logic here
    }

    // Example method that would be called from your existing SpinController
    public async executeSpinWithEvents(request: any): Promise<any> {
        const { betAmount, playerId, sessionId } = request;

        try {
            // Emit spin started event
            this.gameEmitter.emitSpinStarted(betAmount, playerId, sessionId);

            // Your existing spin logic would go here
            // For example, calling your existing GameServer.processSpin()
            const result = await this.simulateSpinLogic(request);

            // Emit reel events
            for (let i = 0; i < 5; i++) {
                this.gameEmitter.emitReelStarted(i, playerId, sessionId);
                
                // Simulate reel spinning time
                await new Promise(resolve => setTimeout(resolve, 200));
                
                this.gameEmitter.emitReelStopped(i, [1, 2, 3], playerId, sessionId);
            }

            // Emit win events if applicable
            if (result.totalWin > 0) {
                this.gameEmitter.emitWinDetected(result.totalWin, result.matches, playerId, sessionId);
                
                if (result.totalWin > 1000) {
                    this.gameEmitter.emitWinEventTriggered(result.totalWin, playerId, sessionId);
                }
            }

            // Emit spin completed event
            this.gameEmitter.emitSpinCompleted(result, playerId, sessionId);

            return result;

        } catch (error) {
            // Emit error event
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            this.gameEmitter.emitSpinFailed(errorMessage, playerId, sessionId);
            throw error;
        }
    }

    private async simulateSpinLogic(request: any): Promise<any> {
        // This would be your actual spin logic
        // For now, just simulate a result
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        return {
            totalWin: Math.random() > 0.7 ? Math.floor(Math.random() * 500) : 0,
            matches: [],
            finalGrid: { symbols: [] }
        };
    }

    // Setup different communication adapters
    public async setupLocalAdapter(): Promise<void> {
        const localAdapter = EventAdapterFactory.createLocalAdapter(this.eventManager);
        this.bridge.setAdapter(localAdapter);
        await this.bridge.connect();
        debug.log('Local event adapter connected');
    }

    public async setupHttpAdapter(baseUrl: string, apiKey?: string): Promise<void> {
        const httpAdapter = EventAdapterFactory.createHttpAdapter({ baseUrl, apiKey });
        this.bridge.setAdapter(httpAdapter);
        await this.bridge.connect();
        debug.log('HTTP event adapter connected');
    }

    public async setupWebSocketAdapter(url: string): Promise<void> {
        const wsAdapter = EventAdapterFactory.createWebSocketAdapter({ url });
        this.bridge.setAdapter(wsAdapter);
        await this.bridge.connect();
        debug.log('WebSocket event adapter connected');
    }

    // Get event history for debugging/analytics
    public getEventHistory(options?: any): any[] {
        return this.eventManager.getEventHistory(options);
    }

    // Replay events for testing
    public replayEvents(options?: any): void {
        this.eventManager.replayEvents(options);
    }
}

// Example integration with UI components
export class EventEnabledUI {
    private eventManager: EventManager;
    private gameEmitter: GameEventEmitter;

    constructor(eventManager: EventManager) {
        this.eventManager = eventManager;
        this.gameEmitter = new GameEventEmitter(eventManager);
    }

    public setupButtonListeners(): void {
        // Example: Track button clicks
        document.addEventListener('click', (event) => {
            const target = event.target as HTMLElement;
            if (target.dataset.buttonId) {
                this.gameEmitter.emitButtonClicked(target.dataset.buttonId, 'player1');
            }
        });
    }

    public setupPanelListeners(): void {
        // Example: Track panel open/close events
        this.eventManager.on(GameEvents.UI_PANEL_OPENED, (event) => {
            debug.log('Panel opened:', event.data.panelId);
        });

        this.eventManager.on(GameEvents.UI_PANEL_CLOSED, (event) => {
            debug.log('Panel closed:', event.data.panelId);
        });
    }

    public emitPanelEvent(panelId: string, action: 'opened' | 'closed'): void {
        if (action === 'opened') {
            this.eventManager.emit(GameEvents.UI_PANEL_OPENED, { panelId });
        } else {
            this.eventManager.emit(GameEvents.UI_PANEL_CLOSED, { panelId });
        }
    }
}

// Example integration with player management
export class EventEnabledPlayerController {
    private eventManager: EventManager;
    private gameEmitter: GameEventEmitter;

    constructor(eventManager: EventManager) {
        this.eventManager = eventManager;
        this.gameEmitter = new GameEventEmitter(eventManager);
    }

    public updateBalance(playerId: string, oldBalance: number, newBalance: number, sessionId?: string): void {
        // Emit balance change event
        this.gameEmitter.emitBalanceChanged(oldBalance, newBalance, playerId, sessionId);
    }

    public updateBet(playerId: string, oldBet: number, newBet: number, sessionId?: string): void {
        // Emit bet change event
        this.eventManager.emit(GameEvents.PLAYER_BET_CHANGED, {
            oldBet,
            newBet,
            change: newBet - oldBet
        }, { playerId, sessionId });
    }
}

// Main integration class that ties everything together
export class GameEventIntegration {
    private eventManager: EventManager;
    private spinController: EventEnabledSpinController;
    private ui: EventEnabledUI;
    private playerController: EventEnabledPlayerController;

    constructor() {
        // Create shared EventManager
        this.eventManager = EventManager.createInstance({
            enablePersistence: true,
            maxEventHistory: 5000,
            enableReplay: true
        });

        // Create event-enabled components
        this.spinController = new EventEnabledSpinController();
        this.ui = new EventEnabledUI(this.eventManager);
        this.playerController = new EventEnabledPlayerController(this.eventManager);

        // Setup UI listeners
        this.ui.setupButtonListeners();
        this.ui.setupPanelListeners();
    }

    public async initialize(): Promise<void> {
        // Setup local adapter by default
        await this.spinController.setupLocalAdapter();
        
        debug.log('Game event integration initialized');
    }

    public async setupHttpCommunication(baseUrl: string, apiKey?: string): Promise<void> {
        await this.spinController.setupHttpAdapter(baseUrl, apiKey);
    }

    public async setupWebSocketCommunication(url: string): Promise<void> {
        await this.spinController.setupWebSocketAdapter(url);
    }

    // Get the EventManager for advanced usage
    public getEventManager(): EventManager {
        return this.eventManager;
    }

    // Get the spin controller for game logic
    public getSpinController(): EventEnabledSpinController {
        return this.spinController;
    }

    // Get the UI controller
    public getUI(): EventEnabledUI {
        return this.ui;
    }

    // Get the player controller
    public getPlayerController(): EventEnabledPlayerController {
        return this.playerController;
    }
}

// Usage example
export async function initializeGameWithEvents(): Promise<GameEventIntegration> {
    const gameIntegration = new GameEventIntegration();
    await gameIntegration.initialize();
    
    // Example: Setup HTTP communication for production
    // await gameIntegration.setupHttpCommunication('https://api.yourgame.com', 'your-api-key');
    
    // Example: Setup WebSocket for real-time features
    // await gameIntegration.setupWebSocketCommunication('wss://api.yourgame.com/events');
    
    return gameIntegration;
}
