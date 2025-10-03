// EventManagerExample - Comprehensive examples of how to use the EventManager
// This demonstrates various use cases and patterns

import { 
    EventManager, 
    GameEventEmitter, 
    GameEventTypes,
    LoggingMiddleware,
    ThrottlingMiddleware,
    PlayerFilterMiddleware
} from './EventManager';
import { 
    EventAdapterFactory, 
    EventBridge,
    LocalEventAdapter,
    HttpEventAdapter,
    WebSocketEventAdapter
} from './EventAdapters';

// Example 1: Basic EventManager usage
export class BasicEventExample {
    private eventManager: EventManager;
    private gameEmitter: GameEventEmitter;

    constructor() {
        // Create EventManager with basic configuration
        this.eventManager = EventManager.createInstance({
            enablePersistence: true,
            maxEventHistory: 500,
            enableReplay: true,
            middleware: [
                LoggingMiddleware,
                ThrottlingMiddleware(50) // Max 50 events per second
            ]
        });

        this.gameEmitter = new GameEventEmitter(this.eventManager);
        this.setupEventListeners();
    }

    private setupEventListeners(): void {
        // Listen to spin events
        this.eventManager.on(GameEventTypes.SPIN_STARTED, (event) => {
            console.log('Spin started for player:', event.context.playerId);
        });

        this.eventManager.on(GameEventTypes.SPIN_COMPLETED, (event) => {
            console.log('Spin completed with result:', event.data.result);
        });

        // Listen to win events with filtering
        this.eventManager.on(GameEventTypes.WIN_DETECTED, (event) => {
            console.log('Win detected:', event.data.winAmount);
        }, {
            filter: (event) => event.data.winAmount > 100 // Only big wins
        });

        // One-time listener
        this.eventManager.once(GameEventTypes.BIG_WIN_TRIGGERED, (event) => {
            console.log('First big win!', event.data.winAmount);
        });
    }

    public simulateGameSession(): void {
        // Simulate a game session
        this.gameEmitter.emitSpinStarted(10, 'player1', 'session123');
        
        setTimeout(() => {
            this.gameEmitter.emitWinDetected(50, [], 'player1', 'session123');
        }, 1000);
        
        setTimeout(() => {
            this.gameEmitter.emitSpinCompleted({ totalWin: 50 }, 'player1', 'session123');
        }, 2000);
    }
}

// Example 2: Advanced EventManager with custom middleware
export class AdvancedEventExample {
    private eventManager: EventManager;
    private gameEmitter: GameEventEmitter;

    constructor() {
        this.eventManager = EventManager.createInstance({
            enablePersistence: true,
            maxEventHistory: 1000,
            enableReplay: true,
            middleware: [
                LoggingMiddleware,
                ThrottlingMiddleware(100),
                this.createAnalyticsMiddleware(),
                this.createErrorHandlingMiddleware()
            ]
        });

        this.gameEmitter = new GameEventEmitter(this.eventManager);
        this.setupAdvancedListeners();
    }

    private createAnalyticsMiddleware() {
        return {
            name: 'analytics',
            execute: (event, next) => {
                // Track events for analytics
                this.trackEvent(event);
                next();
            }
        };
    }

    private createErrorHandlingMiddleware() {
        return {
            name: 'error-handling',
            execute: (event, next) => {
                try {
                    next();
                } catch (error) {
                    console.error('Error in event processing:', error);
                    this.eventManager.emit(GameEventTypes.SYSTEM_ERROR, {
                        error: error.message,
                        originalEvent: event
                    });
                }
            }
        };
    }

    private trackEvent(event: any): void {
        // In a real implementation, this would send to analytics service
        console.log('Analytics: Tracking event', event.type);
    }

    private setupAdvancedListeners(): void {
        // Player-specific event filtering
        this.eventManager.on('*', (event) => {
            console.log('All events:', event.type);
        }, {
            filter: (event) => event.context.playerId === 'player1'
        });

        // High-priority system events
        this.eventManager.on(GameEventTypes.SYSTEM_ERROR, (event) => {
            console.error('System error occurred:', event.data);
        }, { priority: 10 });

        // Balance change tracking
        this.eventManager.on(GameEventTypes.PLAYER_BALANCE_CHANGED, (event) => {
            const { oldBalance, newBalance, change } = event.data;
            console.log(`Balance changed: ${oldBalance} -> ${newBalance} (${change > 0 ? '+' : ''}${change})`);
        });
    }

    public simulateAdvancedSession(): void {
        // Simulate various game events
        this.gameEmitter.emitBalanceChanged(1000, 950, 'player1', 'session123');
        this.gameEmitter.emitSpinStarted(50, 'player1', 'session123');
        this.gameEmitter.emitBigWinTriggered(500, 'player1', 'session123');
        this.gameEmitter.emitBalanceChanged(950, 1450, 'player1', 'session123');
    }
}

// Example 3: EventManager with different adapters
export class AdapterEventExample {
    private eventManager: EventManager;
    private bridge: EventBridge;
    private gameEmitter: GameEventEmitter;

    constructor() {
        this.eventManager = EventManager.createInstance();
        this.bridge = new EventBridge(this.eventManager);
        this.gameEmitter = new GameEventEmitter(this.eventManager);
    }

    // Local adapter example
    public async setupLocalAdapter(): Promise<void> {
        const localAdapter = EventAdapterFactory.createLocalAdapter(this.eventManager);
        this.bridge.setAdapter(localAdapter);
        await this.bridge.connect();
        console.log('Local adapter connected');
    }

    // HTTP adapter example
    public async setupHttpAdapter(baseUrl: string, apiKey?: string): Promise<void> {
        const httpAdapter = EventAdapterFactory.createHttpAdapter({ baseUrl, apiKey });
        this.bridge.setAdapter(httpAdapter);
        await this.bridge.connect();
        console.log('HTTP adapter connected');
    }

    // WebSocket adapter example
    public async setupWebSocketAdapter(url: string): Promise<void> {
        const wsAdapter = EventAdapterFactory.createWebSocketAdapter({ url });
        this.bridge.setAdapter(wsAdapter);
        await this.bridge.connect();
        console.log('WebSocket adapter connected');
    }

    public simulateEvents(): void {
        this.gameEmitter.emitSpinStarted(25, 'player1', 'session123');
        this.gameEmitter.emitWinDetected(100, [], 'player1', 'session123');
        this.gameEmitter.emitSpinCompleted({ totalWin: 100 }, 'player1', 'session123');
    }
}

// Example 4: Event replay and history
export class EventReplayExample {
    private eventManager: EventManager;
    private gameEmitter: GameEventEmitter;

    constructor() {
        this.eventManager = EventManager.createInstance({
            enablePersistence: true,
            maxEventHistory: 2000,
            enableReplay: true
        });

        this.gameEmitter = new GameEventEmitter(this.eventManager);
        this.setupReplayListeners();
    }

    private setupReplayListeners(): void {
        // Listen to all events for replay
        this.eventManager.on('*', (event) => {
            console.log('Replay event:', event.type, event.data);
        });
    }

    public async simulateAndReplay(): Promise<void> {
        // Simulate some events
        this.gameEmitter.emitSpinStarted(10, 'player1', 'session123');
        this.gameEmitter.emitWinDetected(50, [], 'player1', 'session123');
        this.gameEmitter.emitSpinCompleted({ totalWin: 50 }, 'player1', 'session123');

        // Wait a bit
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Replay events for player1
        console.log('Replaying events for player1...');
        this.eventManager.replayEvents({
            playerId: 'player1'
        });

        // Get event history
        const history = this.eventManager.getEventHistory({
            eventTypes: [GameEventTypes.SPIN_STARTED, GameEventTypes.SPIN_COMPLETED]
        });
        console.log('Event history:', history);
    }
}

// Example 5: Integration with existing game systems
export class GameIntegrationExample {
    private eventManager: EventManager;
    private gameEmitter: GameEventEmitter;

    constructor() {
        this.eventManager = EventManager.createInstance({
            enablePersistence: true,
            middleware: [LoggingMiddleware]
        });

        this.gameEmitter = new GameEventEmitter(this.eventManager);
        this.setupGameIntegration();
    }

    private setupGameIntegration(): void {
        // This would integrate with your existing SpinController, etc.
        this.eventManager.on(GameEventTypes.SPIN_STARTED, (event) => {
            // Trigger your existing spin logic
            console.log('Integrating with SpinController...');
        });

        this.eventManager.on(GameEventTypes.REEL_STARTED, (event) => {
            // Trigger reel animations
            console.log('Starting reel animation for reel:', event.data.reelIndex);
        });

        this.eventManager.on(GameEventTypes.REEL_STOPPED, (event) => {
            // Handle reel stop
            console.log('Reel stopped with symbols:', event.data.finalSymbols);
        });
    }

    public integrateWithSpinController(): void {
        // This would be called from your existing SpinController
        this.gameEmitter.emitSpinStarted(10, 'player1', 'session123');
        
        // Simulate reel events
        for (let i = 0; i < 5; i++) {
            setTimeout(() => {
                this.gameEmitter.emitReelStarted(i, 'player1', 'session123');
            }, i * 200);
            
            setTimeout(() => {
                this.gameEmitter.emitReelStopped(i, [1, 2, 3], 'player1', 'session123');
            }, i * 200 + 1000);
        }
    }
}

// Usage examples
export function runEventManagerExamples(): void {
    console.log('=== EventManager Examples ===');

    // Basic example
    const basicExample = new BasicEventExample();
    basicExample.simulateGameSession();

    // Advanced example
    const advancedExample = new AdvancedEventExample();
    advancedExample.simulateAdvancedSession();

    // Adapter example
    const adapterExample = new AdapterEventExample();
    adapterExample.setupLocalAdapter().then(() => {
        adapterExample.simulateEvents();
    });

    // Replay example
    const replayExample = new EventReplayExample();
    replayExample.simulateAndReplay();

    // Integration example
    const integrationExample = new GameIntegrationExample();
    integrationExample.integrateWithSpinController();
}

// Export for use in other files
export {
    EventManager,
    GameEventEmitter,
    GameEventTypes,
    EventAdapterFactory,
    EventBridge
};
