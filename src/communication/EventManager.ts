// EventManager - A comprehensive event system for the slot game
// This can serve as a separate API for event handling and communication

export interface EventData {
    [key: string]: any;
}

export interface EventContext {
    timestamp: number;
    source: string;
    sessionId?: string;
    playerId?: string;
    metadata?: Record<string, any>;
}

export interface GameEvent {
    id: string;
    type: string;
    data: EventData;
    context: EventContext;
    version: number;
}

export interface EventSubscription {
    id: string;
    eventType: string;
    callback: EventCallback;
    filter?: EventFilter;
    once?: boolean;
    priority?: number;
}

export type EventCallback = (event: GameEvent) => void | Promise<void>;

export type EventFilter = (event: GameEvent) => boolean;

export interface EventMiddleware {
    name: string;
    execute: (event: GameEvent, next: () => void) => void | Promise<void>;
}

export interface EventManagerConfig {
    enablePersistence?: boolean;
    maxEventHistory?: number;
    enableReplay?: boolean;
    middleware?: EventMiddleware[];
    defaultContext?: Partial<EventContext>;
}

export interface EventReplayOptions {
    fromTimestamp?: number;
    toTimestamp?: number;
    eventTypes?: string[];
    playerId?: string;
    sessionId?: string;
}

export class EventManager {
    private static instance: EventManager;
    private subscriptions: Map<string, EventSubscription> = new Map();
    private eventHistory: GameEvent[] = [];
    private middleware: EventMiddleware[] = [];
    private config: EventManagerConfig;
    private eventIdCounter = 0;
    private isProcessing = false;

    private constructor(config: EventManagerConfig = {}) {
        this.config = {
            enablePersistence: true,
            maxEventHistory: 1000,
            enableReplay: true,
            middleware: [],
            defaultContext: {
                timestamp: Date.now(),
                source: 'EventManager'
            },
            ...config
        };
        
        this.middleware = this.config.middleware || [];
    }

    public static getInstance(config?: EventManagerConfig): EventManager {
        if (!EventManager.instance) {
            EventManager.instance = new EventManager(config);
        }
        return EventManager.instance;
    }

    public static createInstance(config?: EventManagerConfig): EventManager {
        return new EventManager(config);
    }

    // Core event methods
    public emit(eventType: string, data: EventData, context?: Partial<EventContext>): string {
        const eventId = this.generateEventId();
        const fullContext: EventContext = {
            ...this.config.defaultContext!,
            timestamp: Date.now(),
            ...context
        };

        const event: GameEvent = {
            id: eventId,
            type: eventType,
            data,
            context: fullContext,
            version: 1
        };

        this.processEvent(event);
        return eventId;
    }

    public async emitAsync(eventType: string, data: EventData, context?: Partial<EventContext>): Promise<string> {
        const eventId = this.generateEventId();
        const fullContext: EventContext = {
            ...this.config.defaultContext!,
            timestamp: Date.now(),
            ...context
        };

        const event: GameEvent = {
            id: eventId,
            type: eventType,
            data,
            context: fullContext,
            version: 1
        };

        await this.processEventAsync(event);
        return eventId;
    }

    public on(eventType: string, callback: EventCallback, options?: {
        filter?: EventFilter;
        once?: boolean;
        priority?: number;
    }): string {
        const subscriptionId = this.generateSubscriptionId();
        const subscription: EventSubscription = {
            id: subscriptionId,
            eventType,
            callback,
            filter: options?.filter,
            once: options?.once || false,
            priority: options?.priority || 0
        };

        this.subscriptions.set(subscriptionId, subscription);
        return subscriptionId;
    }

    public once(eventType: string, callback: EventCallback, filter?: EventFilter): string {
        return this.on(eventType, callback, { once: true, filter });
    }

    public off(subscriptionId: string): boolean {
        return this.subscriptions.delete(subscriptionId);
    }

    public offAll(eventType?: string): number {
        if (eventType) {
            let count = 0;
            for (const [id, subscription] of this.subscriptions) {
                if (subscription.eventType === eventType) {
                    this.subscriptions.delete(id);
                    count++;
                }
            }
            return count;
        } else {
            const count = this.subscriptions.size;
            this.subscriptions.clear();
            return count;
        }
    }

    // Event processing
    private processEvent(event: GameEvent): void {
        if (this.config.enablePersistence) {
            this.addToHistory(event);
        }

        this.executeMiddleware(event, () => {
            this.dispatchEvent(event);
        });
    }

    private async processEventAsync(event: GameEvent): Promise<void> {
        if (this.config.enablePersistence) {
            this.addToHistory(event);
        }

        await this.executeMiddlewareAsync(event, async () => {
            await this.dispatchEventAsync(event);
        });
    }

    private executeMiddleware(event: GameEvent, next: () => void): void {
        let index = 0;

        const executeNext = () => {
            if (index < this.middleware.length) {
                const middleware = this.middleware[index++];
                middleware.execute(event, executeNext);
            } else {
                next();
            }
        };

        executeNext();
    }

    private async executeMiddlewareAsync(event: GameEvent, next: () => Promise<void>): Promise<void> {
        for (const middleware of this.middleware) {
            await new Promise<void>((resolve) => {
                middleware.execute(event, resolve);
            });
        }
        await next();
    }

    private dispatchEvent(event: GameEvent): void {
        const relevantSubscriptions = Array.from(this.subscriptions.values())
            .filter(sub => sub.eventType === event.type)
            .filter(sub => !sub.filter || sub.filter(event))
            .sort((a, b) => (b.priority || 0) - (a.priority || 0));

        for (const subscription of relevantSubscriptions) {
            try {
                subscription.callback(event);
                
                if (subscription.once) {
                    this.subscriptions.delete(subscription.id);
                }
            } catch (error) {
                console.error(`Error in event callback for ${event.type}:`, error);
            }
        }
    }

    private async dispatchEventAsync(event: GameEvent): Promise<void> {
        const relevantSubscriptions = Array.from(this.subscriptions.values())
            .filter(sub => sub.eventType === event.type)
            .filter(sub => !sub.filter || sub.filter(event))
            .sort((a, b) => (b.priority || 0) - (a.priority || 0));

        for (const subscription of relevantSubscriptions) {
            try {
                await subscription.callback(event);
                
                if (subscription.once) {
                    this.subscriptions.delete(subscription.id);
                }
            } catch (error) {
                console.error(`Error in async event callback for ${event.type}:`, error);
            }
        }
    }

    // History and replay
    private addToHistory(event: GameEvent): void {
        this.eventHistory.push(event);
        
        if (this.config.maxEventHistory && this.eventHistory.length > this.config.maxEventHistory) {
            this.eventHistory = this.eventHistory.slice(-this.config.maxEventHistory);
        }
    }

    public getEventHistory(options?: EventReplayOptions): GameEvent[] {
        if (!this.config.enablePersistence) {
            return [];
        }

        let filtered = [...this.eventHistory];

        if (options) {
            if (options.fromTimestamp) {
                filtered = filtered.filter(e => e.context.timestamp >= options.fromTimestamp!);
            }
            if (options.toTimestamp) {
                filtered = filtered.filter(e => e.context.timestamp <= options.toTimestamp!);
            }
            if (options.eventTypes) {
                filtered = filtered.filter(e => options.eventTypes!.includes(e.type));
            }
            if (options.playerId) {
                filtered = filtered.filter(e => e.context.playerId === options.playerId);
            }
            if (options.sessionId) {
                filtered = filtered.filter(e => e.context.sessionId === options.sessionId);
            }
        }

        return filtered;
    }

    public replayEvents(options?: EventReplayOptions): void {
        if (!this.config.enableReplay) {
            console.warn('Event replay is disabled');
            return;
        }

        const events = this.getEventHistory(options);
        events.forEach(event => {
            this.dispatchEvent(event);
        });
    }

    public async replayEventsAsync(options?: EventReplayOptions): Promise<void> {
        if (!this.config.enableReplay) {
            console.warn('Event replay is disabled');
            return;
        }

        const events = this.getEventHistory(options);
        for (const event of events) {
            await this.dispatchEventAsync(event);
        }
    }

    // Middleware management
    public addMiddleware(middleware: EventMiddleware): void {
        this.middleware.push(middleware);
    }

    public removeMiddleware(name: string): boolean {
        const index = this.middleware.findIndex(m => m.name === name);
        if (index !== -1) {
            this.middleware.splice(index, 1);
            return true;
        }
        return false;
    }

    // Utility methods
    public getSubscriptionCount(eventType?: string): number {
        if (eventType) {
            return Array.from(this.subscriptions.values())
                .filter(sub => sub.eventType === eventType).length;
        }
        return this.subscriptions.size;
    }

    public getEventTypes(): string[] {
        const types = new Set<string>();
        this.subscriptions.forEach(sub => types.add(sub.eventType));
        return Array.from(types);
    }

    public clearHistory(): void {
        this.eventHistory = [];
    }

    public getConfig(): EventManagerConfig {
        return { ...this.config };
    }

    public updateConfig(newConfig: Partial<EventManagerConfig>): void {
        this.config = { ...this.config, ...newConfig };
    }

    // ID generation
    private generateEventId(): string {
        return `event_${++this.eventIdCounter}_${Date.now()}`;
    }

    private generateSubscriptionId(): string {
        return `sub_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    // Cleanup
    public destroy(): void {
        this.subscriptions.clear();
        this.eventHistory = [];
        this.middleware = [];
        this.isProcessing = false;
    }
}

// Built-in middleware examples
export const LoggingMiddleware: EventMiddleware = {
    name: 'logging',
    execute: (event, next) => {
        console.log(`[EventManager] ${event.type}:`, event.data);
        next();
    }
};

export const ThrottlingMiddleware = (maxEventsPerSecond: number = 100): EventMiddleware => {
    let lastEmitTime = 0;
    const minInterval = 1000 / maxEventsPerSecond;

    return {
        name: 'throttling',
        execute: (event, next) => {
            const now = Date.now();
            if (now - lastEmitTime >= minInterval) {
                lastEmitTime = now;
                next();
            }
        }
    };
};

export const PlayerFilterMiddleware = (playerId: string): EventMiddleware => ({
    name: 'player-filter',
    execute: (event, next) => {
        if (!event.context.playerId || event.context.playerId === playerId) {
            next();
        }
    }
});

// Game-specific event types
export enum GameEventTypes {
    // Spin events
    SPIN_STARTED = 'spin:started',
    SPIN_COMPLETED = 'spin:completed',
    SPIN_FAILED = 'spin:failed',
    
    // Reel events
    REEL_STARTED = 'reel:started',
    REEL_STOPPED = 'reel:stopped',
    REEL_SLOWING = 'reel:slowing',
    
    // Win events
    WIN_DETECTED = 'win:detected',
    WIN_ANIMATION_STARTED = 'win:animation:started',
    WIN_ANIMATION_COMPLETED = 'win:animation:completed',
    BIG_WIN_TRIGGERED = 'win:big:triggered',
    
    // Player events
    PLAYER_BALANCE_CHANGED = 'player:balance:changed',
    PLAYER_BET_CHANGED = 'player:bet:changed',
    PLAYER_LEVEL_UP = 'player:level:up',
    
    // UI events
    UI_BUTTON_CLICKED = 'ui:button:clicked',
    UI_PANEL_OPENED = 'ui:panel:opened',
    UI_PANEL_CLOSED = 'ui:panel:closed',
    
    // System events
    SYSTEM_ERROR = 'system:error',
    SYSTEM_WARNING = 'system:warning',
    SYSTEM_INFO = 'system:info'
}

// Convenience methods for common game events
export class GameEventEmitter {
    private eventManager: EventManager;

    constructor(eventManager: EventManager) {
        this.eventManager = eventManager;
    }

    // Spin events
    public emitSpinStarted(betAmount: number, playerId: string, sessionId?: string): string {
        return this.eventManager.emit(GameEventTypes.SPIN_STARTED, {
            betAmount,
            playerId
        }, { playerId, sessionId });
    }

    public emitSpinCompleted(result: any, playerId: string, sessionId?: string): string {
        return this.eventManager.emit(GameEventTypes.SPIN_COMPLETED, {
            result,
            playerId
        }, { playerId, sessionId });
    }

    public emitSpinFailed(error: string, playerId: string, sessionId?: string): string {
        return this.eventManager.emit(GameEventTypes.SPIN_FAILED, {
            error,
            playerId
        }, { playerId, sessionId });
    }

    // Reel events
    public emitReelStarted(reelIndex: number, playerId: string, sessionId?: string): string {
        return this.eventManager.emit(GameEventTypes.REEL_STARTED, {
            reelIndex
        }, { playerId, sessionId });
    }

    public emitReelStopped(reelIndex: number, finalSymbols: number[], playerId: string, sessionId?: string): string {
        return this.eventManager.emit(GameEventTypes.REEL_STOPPED, {
            reelIndex,
            finalSymbols
        }, { playerId, sessionId });
    }

    // Win events
    public emitWinDetected(winAmount: number, matches: any[], playerId: string, sessionId?: string): string {
        return this.eventManager.emit(GameEventTypes.WIN_DETECTED, {
            winAmount,
            matches
        }, { playerId, sessionId });
    }

    public emitBigWinTriggered(winAmount: number, playerId: string, sessionId?: string): string {
        return this.eventManager.emit(GameEventTypes.BIG_WIN_TRIGGERED, {
            winAmount
        }, { playerId, sessionId });
    }

    // Player events
    public emitBalanceChanged(oldBalance: number, newBalance: number, playerId: string, sessionId?: string): string {
        return this.eventManager.emit(GameEventTypes.PLAYER_BALANCE_CHANGED, {
            oldBalance,
            newBalance,
            change: newBalance - oldBalance
        }, { playerId, sessionId });
    }

    // UI events
    public emitButtonClicked(buttonId: string, playerId: string, sessionId?: string): string {
        return this.eventManager.emit(GameEventTypes.UI_BUTTON_CLICKED, {
            buttonId
        }, { playerId, sessionId });
    }

    // System events
    public emitError(error: string, details?: any, playerId?: string, sessionId?: string): string {
        return this.eventManager.emit(GameEventTypes.SYSTEM_ERROR, {
            error,
            details
        }, { playerId, sessionId });
    }
}
