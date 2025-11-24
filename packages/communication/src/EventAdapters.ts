// EventAdapters - Different communication adapters for EventManager
// These allow the EventManager to work with various communication backends

import { debug } from '@slotclient/engine/utils/debug';
import { EventManager, GameEvent, EventData, EventContext } from './EventManagers/EventManager';

export interface EventAdapter {
    emit(event: GameEvent): Promise<boolean>;
    subscribe(eventType: string, callback: (event: GameEvent) => void): string;
    unsubscribe(subscriptionId: string): boolean;
    connect(): Promise<void>;
    disconnect(): Promise<void>;
    isConnected(): boolean;
}

export interface EventAdapterConfig {
    [key: string]: any;
}

// Local Event Adapter - Events stay within the same process
export class LocalEventAdapter implements EventAdapter {
    private eventManager: EventManager;
    private subscriptions: Map<string, (event: GameEvent) => void> = new Map();
    private connected = false;

    constructor(eventManager: EventManager) {
        this.eventManager = eventManager;
    }

    async connect(): Promise<void> {
        this.connected = true;
        debug.log('LocalEventAdapter: Connected to local event system');
    }

    async disconnect(): Promise<void> {
        this.connected = false;
        this.subscriptions.clear();
        debug.log('LocalEventAdapter: Disconnected from local event system');
    }

    isConnected(): boolean {
        return this.connected;
    }

    async emit(event: GameEvent): Promise<boolean> {
        if (!this.connected) {
            debug.warn('LocalEventAdapter: Not connected, cannot emit event');
            return false;
        }

        try {
            this.eventManager.emit(event.type, event.data, event.context);
            return true;
        } catch (error) {
            debug.error('LocalEventAdapter: Error emitting event:', error);
            return false;
        }
    }

    subscribe(eventType: string, callback: (event: GameEvent) => void): string {
        const subscriptionId = this.eventManager.on(eventType, callback);
        this.subscriptions.set(subscriptionId, callback);
        return subscriptionId;
    }

    unsubscribe(subscriptionId: string): boolean {
        const success = this.eventManager.off(subscriptionId);
        this.subscriptions.delete(subscriptionId);
        return success;
    }
}

// HTTP Event Adapter - Events sent via HTTP requests
export class HttpEventAdapter implements EventAdapter {
    private baseUrl: string;
    private apiKey?: string;
    private connected = false;
    private subscriptions: Map<string, (event: GameEvent) => void> = new Map();
    private pollingInterval?: NodeJS.Timeout;

    constructor(config: { baseUrl: string; apiKey?: string }) {
        this.baseUrl = config.baseUrl;
        this.apiKey = config.apiKey;
    }

    async connect(): Promise<void> {
        this.connected = true;
        debug.log('HttpEventAdapter: Connected to HTTP event system');
    }

    async disconnect(): Promise<void> {
        this.connected = false;
        if (this.pollingInterval) {
            clearInterval(this.pollingInterval);
        }
        this.subscriptions.clear();
        debug.log('HttpEventAdapter: Disconnected from HTTP event system');
    }

    isConnected(): boolean {
        return this.connected;
    }

    private getHeaders(): HeadersInit {
        const headers: HeadersInit = {
            'Content-Type': 'application/json',
        };
        
        if (this.apiKey) {
            headers['Authorization'] = `Bearer ${this.apiKey}`;
        }
        
        return headers;
    }

    async emit(event: GameEvent): Promise<boolean> {
        if (!this.connected) {
            debug.warn('HttpEventAdapter: Not connected, cannot emit event');
            return false;
        }

        try {
            const response = await fetch(`${this.baseUrl}/api/events`, {
                method: 'POST',
                headers: this.getHeaders(),
                body: JSON.stringify(event)
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            return true;
        } catch (error) {
            debug.error('HttpEventAdapter: Error emitting event:', error);
            return false;
        }
    }

    subscribe(eventType: string, callback: (event: GameEvent) => void): string {
        const subscriptionId = `http_sub_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        this.subscriptions.set(subscriptionId, callback);
        
        // Start polling for events if not already started
        if (!this.pollingInterval) {
            this.startPolling();
        }
        
        return subscriptionId;
    }

    unsubscribe(subscriptionId: string): boolean {
        return this.subscriptions.delete(subscriptionId);
    }

    private startPolling(): void {
        this.pollingInterval = setInterval(async () => {
            if (!this.connected || this.subscriptions.size === 0) {
                return;
            }

            try {
                const response = await fetch(`${this.baseUrl}/api/events/poll`, {
                    method: 'GET',
                    headers: this.getHeaders()
                });

                if (response.ok) {
                    const events: GameEvent[] = await response.json();
                    events.forEach(event => {
                        this.subscriptions.forEach(callback => {
                            callback(event);
                        });
                    });
                }
            } catch (error) {
                debug.error('HttpEventAdapter: Error polling events:', error);
            }
        }, 1000); // Poll every second
    }
}

// WebSocket Event Adapter - Real-time event communication
export class WebSocketEventAdapter implements EventAdapter {
    private ws: WebSocket | null = null;
    private wsUrl: string;
    private connected = false;
    private subscriptions: Map<string, (event: GameEvent) => void> = new Map();
    private reconnectAttempts = 0;
    private maxReconnectAttempts = 5;
    private reconnectDelay = 1000;

    constructor(config: { url: string }) {
        this.wsUrl = config.url;
    }

    async connect(): Promise<void> {
        return new Promise((resolve, reject) => {
            try {
                this.ws = new WebSocket(this.wsUrl);
                
                this.ws.onopen = () => {
                    this.connected = true;
                    this.reconnectAttempts = 0;
                    debug.log('WebSocketEventAdapter: Connected to WebSocket event system');
                    resolve();
                };
                
                this.ws.onerror = (error) => {
                    debug.error('WebSocketEventAdapter: Connection error:', error);
                    reject(error);
                };
                
                this.ws.onclose = () => {
                    this.connected = false;
                    this.handleReconnect();
                };
                
                this.ws.onmessage = (event) => {
                    try {
                        const gameEvent: GameEvent = JSON.parse(event.data);
                        this.subscriptions.forEach(callback => {
                            callback(gameEvent);
                        });
                    } catch (error) {
                        debug.error('WebSocketEventAdapter: Error parsing event:', error);
                    }
                };
            } catch (error) {
                reject(error);
            }
        });
    }

    async disconnect(): Promise<void> {
        this.connected = false;
        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }
        this.subscriptions.clear();
        debug.log('WebSocketEventAdapter: Disconnected from WebSocket event system');
    }

    isConnected(): boolean {
        return this.connected && this.ws?.readyState === WebSocket.OPEN;
    }

    async emit(event: GameEvent): Promise<boolean> {
        if (!this.isConnected()) {
            debug.warn('WebSocketEventAdapter: Not connected, cannot emit event');
            return false;
        }

        try {
            this.ws!.send(JSON.stringify(event));
            return true;
        } catch (error) {
            debug.error('WebSocketEventAdapter: Error emitting event:', error);
            return false;
        }
    }

    subscribe(eventType: string, callback: (event: GameEvent) => void): string {
        const subscriptionId = `ws_sub_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        this.subscriptions.set(subscriptionId, callback);
        return subscriptionId;
    }

    unsubscribe(subscriptionId: string): boolean {
        return this.subscriptions.delete(subscriptionId);
    }

    private handleReconnect(): void {
        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
            debug.error('WebSocketEventAdapter: Max reconnection attempts reached');
            return;
        }

        this.reconnectAttempts++;
        const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
        
        debug.log(`WebSocketEventAdapter: Attempting to reconnect in ${delay}ms (attempt ${this.reconnectAttempts})`);
        
        setTimeout(() => {
            this.connect().catch(error => {
                debug.error('WebSocketEventAdapter: Reconnection failed:', error);
            });
        }, delay);
    }
}

// WebWorker Event Adapter - Events handled in a separate thread
export class WebWorkerEventAdapter implements EventAdapter {
    private worker: Worker | null = null;
    private workerScript: string;
    private connected = false;
    private subscriptions: Map<string, (event: GameEvent) => void> = new Map();
    private messageId = 0;
    private pendingMessages: Map<number, { resolve: Function; reject: Function }> = new Map();

    constructor(config: { workerScript: string }) {
        this.workerScript = config.workerScript;
    }

    async connect(): Promise<void> {
        return new Promise((resolve, reject) => {
            try {
                this.worker = new Worker(this.workerScript);
                
                this.worker.onmessage = (event) => {
                    const { id, type, data, error } = event.data;
                    
                    if (id && this.pendingMessages.has(id)) {
                        const { resolve, reject } = this.pendingMessages.get(id)!;
                        this.pendingMessages.delete(id);
                        
                        if (error) {
                            reject(new Error(error));
                        } else {
                            resolve(data);
                        }
                    } else if (type === 'event') {
                        // Handle incoming events
                        const gameEvent: GameEvent = data;
                        this.subscriptions.forEach(callback => {
                            callback(gameEvent);
                        });
                    }
                };

                this.worker.onerror = (error) => {
                    debug.error('WebWorkerEventAdapter: Worker error:', error);
                    reject(error);
                };

                this.connected = true;
                debug.log('WebWorkerEventAdapter: Connected to WebWorker event system');
                resolve();
            } catch (error) {
                reject(error);
            }
        });
    }

    async disconnect(): Promise<void> {
        this.connected = false;
        if (this.worker) {
            this.worker.terminate();
            this.worker = null;
        }
        this.subscriptions.clear();
        this.pendingMessages.clear();
        debug.log('WebWorkerEventAdapter: Disconnected from WebWorker event system');
    }

    isConnected(): boolean {
        return this.connected && this.worker !== null;
    }

    private postMessage(type: string, data: any): Promise<any> {
        const id = ++this.messageId;
        
        return new Promise((resolve, reject) => {
            this.pendingMessages.set(id, { resolve, reject });
            this.worker!.postMessage({ id, type, data });
            
            // Timeout after 30 seconds
            setTimeout(() => {
                if (this.pendingMessages.has(id)) {
                    this.pendingMessages.delete(id);
                    reject(new Error('Worker message timeout'));
                }
            }, 30000);
        });
    }

    async emit(event: GameEvent): Promise<boolean> {
        if (!this.isConnected()) {
            debug.warn('WebWorkerEventAdapter: Not connected, cannot emit event');
            return false;
        }

        try {
            await this.postMessage('emit', event);
            return true;
        } catch (error) {
            debug.error('WebWorkerEventAdapter: Error emitting event:', error);
            return false;
        }
    }

    subscribe(eventType: string, callback: (event: GameEvent) => void): string {
        const subscriptionId = `worker_sub_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        this.subscriptions.set(subscriptionId, callback);
        return subscriptionId;
    }

    unsubscribe(subscriptionId: string): boolean {
        return this.subscriptions.delete(subscriptionId);
    }
}

// Event Adapter Factory
export class EventAdapterFactory {
    public static createLocalAdapter(eventManager: EventManager): LocalEventAdapter {
        return new LocalEventAdapter(eventManager);
    }

    public static createHttpAdapter(config: { baseUrl: string; apiKey?: string }): HttpEventAdapter {
        return new HttpEventAdapter(config);
    }

    public static createWebSocketAdapter(config: { url: string }): WebSocketEventAdapter {
        return new WebSocketEventAdapter(config);
    }

    public static createWebWorkerAdapter(config: { workerScript: string }): WebWorkerEventAdapter {
        return new WebWorkerEventAdapter(config);
    }
}

// Event Bridge - Connects EventManager with different adapters
export class EventBridge {
    private eventManager: EventManager;
    private adapter: EventAdapter | null = null;
    private isForwarding = false;

    constructor(eventManager: EventManager) {
        this.eventManager = eventManager;
    }

    public setAdapter(adapter: EventAdapter): void {
        this.adapter = adapter;
    }

    public async connect(): Promise<void> {
        if (this.adapter) {
            await this.adapter.connect();
            this.startForwarding();
        }
    }

    public async disconnect(): Promise<void> {
        this.stopForwarding();
        if (this.adapter) {
            await this.adapter.disconnect();
        }
    }

    private startForwarding(): void {
        if (this.isForwarding || !this.adapter) {
            return;
        }

        this.isForwarding = true;
        
        // Forward events from EventManager to adapter
        this.eventManager.on('*', async (event) => {
            if (this.adapter && this.adapter.isConnected()) {
                await this.adapter.emit(event);
            }
        });

        // Forward events from adapter to EventManager
        this.adapter.subscribe('*', (event) => {
            this.eventManager.emit(event.type, event.data, event.context);
        });
    }

    private stopForwarding(): void {
        this.isForwarding = false;
    }

    public isConnected(): boolean {
        return this.adapter ? this.adapter.isConnected() : false;
    }
}
