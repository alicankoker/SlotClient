// Communication interfaces for external systems
export interface SpinRequest {
    playerId: string;
    betAmount: number;
    gameMode?: string;
    sessionId?: string;
}

export interface SpinResponse {
    success: boolean;
    transactionId?: string;
    result?: any;
    error?: string;
}

export interface CommunicationAdapter {
    requestSpin(request: SpinRequest): Promise<SpinResponse>;
    requestBalance(playerId: string): Promise<{ balance: number; success: boolean }>;
    requestGameState(playerId: string): Promise<any>;
}

// Event-driven communication bridge
export class CommunicationBridge {
    private static instance: CommunicationBridge;
    private adapter: CommunicationAdapter | null = null;
    private eventListeners: Map<string, Function[]> = new Map();

    private constructor() {
        // Initialize event system
    }

    public static getInstance(): CommunicationBridge {
        if (!CommunicationBridge.instance) {
            CommunicationBridge.instance = new CommunicationBridge();
        }
        return CommunicationBridge.instance;
    }

    // Set the adapter (can be local, remote service, web worker, etc.)
    public setAdapter(adapter: CommunicationAdapter): void {
        this.adapter = adapter;
        this.emit('adapter-connected', adapter);
    }

    // Event system for loose coupling
    public on(event: string, callback: Function): void {
        if (!this.eventListeners.has(event)) {
            this.eventListeners.set(event, []);
        }
        this.eventListeners.get(event)!.push(callback);
    }

    public emit(event: string, data?: any): void {
        const listeners = this.eventListeners.get(event);
        if (listeners) {
            listeners.forEach(callback => callback(data));
        }
    }

    // Main communication methods
    public async requestSpin(request: SpinRequest): Promise<SpinResponse> {
        if (!this.adapter) {
            return { success: false, error: 'No communication adapter configured' };
        }

        try {
            this.emit('spin-request', request);
            const response = await this.adapter.requestSpin(request);
            this.emit('spin-response', response);
            return response;
        } catch (error) {
            const errorResponse = { success: false, error: `Communication failed: ${error}` };
            this.emit('spin-error', errorResponse);
            return errorResponse;
        }
    }

    public async requestBalance(playerId: string): Promise<{ balance: number; success: boolean }> {
        if (!this.adapter) {
            return { balance: 0, success: false };
        }

        try {
            return await this.adapter.requestBalance(playerId);
        } catch (error) {
            console.error('Balance request failed:', error);
            return { balance: 0, success: false };
        }
    }
}

// Legacy singleton for backward compatibility
export default class Communication {
    private static instance: Communication;
    private bridge: CommunicationBridge;

    private constructor() {
        this.bridge = CommunicationBridge.getInstance();
    }

    public static getInstance(): Communication {
        if (!Communication.instance) {
            Communication.instance = new Communication();
        }
        return Communication.instance;
    }

    public requestSpin(): void {
        // For now, use a default request - in real implementation you'd get these values
        const request: SpinRequest = {
            playerId: 'player1',
            betAmount: 10,
            sessionId: 'session123'
        };

        this.bridge.requestSpin(request).then(response => {
            console.log('Spin response:', response);
            // Handle response in your game logic
        });
    }

    // Expose bridge for advanced usage
    public getBridge(): CommunicationBridge {
        return this.bridge;
    }
}