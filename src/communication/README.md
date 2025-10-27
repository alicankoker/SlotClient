# EventManager - Communication System

A comprehensive event management system for the slot game that can serve as a separate API for event handling and communication.

## Features

- **Event Management**: Publish/subscribe pattern with filtering and middleware support
- **Multiple Adapters**: Local, HTTP, WebSocket, and WebWorker communication adapters
- **Event Persistence**: Store and replay events with configurable history
- **Middleware System**: Extensible middleware for logging, throttling, and custom processing
- **TypeScript Support**: Full type safety and IntelliSense support
- **Game Integration**: Pre-built game event types and emitters

## Quick Start

```typescript
import { EventManager, GameEventEmitter, GameEventTypes } from './communication';

// Create EventManager instance
const eventManager = EventManager.createInstance({
    enablePersistence: true,
    maxEventHistory: 1000,
    enableReplay: true
});

// Create game event emitter
const gameEmitter = new GameEventEmitter(eventManager);

// Listen to events
eventManager.on(GameEventTypes.SPIN_STARTED, (event) => {
    console.log('Spin started:', event.data);
});

// Emit events
gameEmitter.emitSpinStarted(10, 'player1', 'session123');
```

## Core Components

### EventManager

The main event management class that handles event publishing, subscription, and processing.

```typescript
const eventManager = EventManager.createInstance({
    enablePersistence: true,    // Store events in history
    maxEventHistory: 1000,     // Maximum events to store
    enableReplay: true,        // Allow event replay
    middleware: [              // Custom middleware
        LoggingMiddleware,
        ThrottlingMiddleware(50)
    ]
});
```

### GameEventEmitter

Convenience class for emitting game-specific events with proper typing.

```typescript
const gameEmitter = new GameEventEmitter(eventManager);

// Emit various game events
gameEmitter.emitSpinStarted(betAmount, playerId, sessionId);
gameEmitter.emitWinDetected(winAmount, matches, playerId, sessionId);
gameEmitter.emitWinEventTriggered(winAmount, playerId, sessionId);
gameEmitter.emitBalanceChanged(oldBalance, newBalance, playerId, sessionId);
```

### Event Adapters

Different communication backends for event distribution.

#### Local Adapter
Events stay within the same process.

```typescript
import { EventAdapterFactory } from './communication';

const localAdapter = EventAdapterFactory.createLocalAdapter(eventManager);
```

#### HTTP Adapter
Events sent via HTTP requests with polling for incoming events.

```typescript
const httpAdapter = EventAdapterFactory.createHttpAdapter({
    baseUrl: 'https://api.example.com',
    apiKey: 'your-api-key'
});
```

#### WebSocket Adapter
Real-time bidirectional event communication.

```typescript
const wsAdapter = EventAdapterFactory.createWebSocketAdapter({
    url: 'wss://api.example.com/events'
});
```

#### WebWorker Adapter
Events handled in a separate thread.

```typescript
const workerAdapter = EventAdapterFactory.createWebWorkerAdapter({
    workerScript: '/workers/event-worker.js'
});
```

### Event Bridge

Connects EventManager with different adapters for seamless communication.

```typescript
import { EventBridge } from './communication';

const bridge = new EventBridge(eventManager);
bridge.setAdapter(httpAdapter);
await bridge.connect();
```

## Event Types

Pre-defined game event types for consistency:

```typescript
enum GameEventTypes {
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
```

## Event Filtering

Filter events based on custom criteria:

```typescript
eventManager.on(GameEventTypes.WIN_DETECTED, (event) => {
    console.log('Big win!', event.data.winAmount);
}, {
    filter: (event) => event.data.winAmount > 100
});
```

## Middleware

Extend event processing with custom middleware:

```typescript
const customMiddleware = {
    name: 'analytics',
    execute: (event, next) => {
        // Track event for analytics
        analytics.track(event.type, event.data);
        next();
    }
};

eventManager.addMiddleware(customMiddleware);
```

Built-in middleware:
- `LoggingMiddleware`: Log all events
- `ThrottlingMiddleware(maxEventsPerSecond)`: Rate limit events
- `PlayerFilterMiddleware(playerId)`: Filter events by player

## Event History and Replay

Store and replay events for debugging and analysis:

```typescript
// Get event history
const history = eventManager.getEventHistory({
    playerId: 'player1',
    eventTypes: [GameEventTypes.SPIN_STARTED],
    fromTimestamp: Date.now() - 3600000 // Last hour
});

// Replay events
eventManager.replayEvents({
    playerId: 'player1',
    eventTypes: [GameEventTypes.WIN_DETECTED]
});
```

## Integration with Existing Game

Integrate with your existing game controllers:

```typescript
// In your SpinController
class SpinController {
    private eventManager: EventManager;
    private gameEmitter: GameEventEmitter;

    constructor() {
        this.eventManager = EventManager.getInstance();
        this.gameEmitter = new GameEventEmitter(this.eventManager);
    }

    async executeSpin(request: SpinRequestData): Promise<SpinResponseData> {
        // Emit spin started event
        this.gameEmitter.emitSpinStarted(request.betAmount, request.playerId);
        
        try {
            // Your existing spin logic
            const result = await this.processSpin(request);
            
            // Emit completion event
            this.gameEmitter.emitSpinCompleted(result, request.playerId);
            
            return result;
        } catch (error) {
            // Emit error event
            this.gameEmitter.emitSpinFailed(error.message, request.playerId);
            throw error;
        }
    }
}
```

## Examples

See `EventManagerExample.ts` for comprehensive usage examples including:
- Basic event management
- Advanced middleware usage
- Different adapter configurations
- Event replay and history
- Game system integration

## API Reference

### EventManager

#### Methods

- `emit(eventType: string, data: EventData, context?: Partial<EventContext>): string`
- `emitAsync(eventType: string, data: EventData, context?: Partial<EventContext>): Promise<string>`
- `on(eventType: string, callback: EventCallback, options?: EventOptions): string`
- `once(eventType: string, callback: EventCallback, filter?: EventFilter): string`
- `off(subscriptionId: string): boolean`
- `offAll(eventType?: string): number`
- `getEventHistory(options?: EventReplayOptions): GameEvent[]`
- `replayEvents(options?: EventReplayOptions): void`
- `replayEventsAsync(options?: EventReplayOptions): Promise<void>`
- `addMiddleware(middleware: EventMiddleware): void`
- `removeMiddleware(name: string): boolean`

### GameEventEmitter

#### Methods

- `emitSpinStarted(betAmount: number, playerId: string, sessionId?: string): string`
- `emitSpinCompleted(result: any, playerId: string, sessionId?: string): string`
- `emitSpinFailed(error: string, playerId: string, sessionId?: string): string`
- `emitReelStarted(reelIndex: number, playerId: string, sessionId?: string): string`
- `emitReelStopped(reelIndex: number, finalSymbols: number[], playerId: string, sessionId?: string): string`
- `emitWinDetected(winAmount: number, matches: any[], playerId: string, sessionId?: string): string`
- `emitWinEventTriggered(winAmount: number, playerId: string, sessionId?: string): string`
- `emitBalanceChanged(oldBalance: number, newBalance: number, playerId: string, sessionId?: string): string`
- `emitButtonClicked(buttonId: string, playerId: string, sessionId?: string): string`
- `emitError(error: string, details?: any, playerId?: string, sessionId?: string): string`

## Configuration

The EventManager can be configured with various options:

```typescript
interface EventManagerConfig {
    enablePersistence?: boolean;        // Store events in history
    maxEventHistory?: number;          // Maximum events to store
    enableReplay?: boolean;            // Allow event replay
    middleware?: EventMiddleware[];    // Custom middleware
    defaultContext?: Partial<EventContext>; // Default event context
}
```

## Performance Considerations

- Use throttling middleware to limit event frequency
- Consider using WebWorker adapter for heavy event processing
- Limit event history size for memory management
- Use event filtering to reduce unnecessary processing
- Consider batching events for HTTP/WebSocket adapters

## Future Enhancements

- Event compression for large payloads
- Event clustering and batching
- Advanced analytics and metrics
- Event schema validation
- Real-time event monitoring dashboard
- Event-driven state management integration
