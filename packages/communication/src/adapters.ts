import { debug } from '@slotclient/engine/utils/debug';
import { CommunicationAdapter, SpinRequest, SpinResponse } from './index';

// 1. LOCAL ADAPTER - Uses your existing GameServer
export class LocalAdapter implements CommunicationAdapter {
    async requestSpin(request: SpinRequest): Promise<SpinResponse> {
        // Use your existing GameServer for local testing
        const { GameServer } = await import('@slotclient/server/GameServer');
        const gameServer = GameServer.getInstance();
        
        const response = await gameServer.processSpinRequest({
            betAmount: request.betAmount
        });

        return {
            success: response.success,
            result: response.result,
            error: response.error
        };
    }

    async requestBalance(playerId: string): Promise<{ balance: number; success: boolean }> {
        // Mock balance for local testing
        return { balance: 1000, success: true };
    }

    async requestGameState(playerId: string): Promise<any> {
        return { playerId, status: 'active' };
    }
}

// 2. HTTP ADAPTER - For external REST API
export class HttpAdapter implements CommunicationAdapter {
    private baseUrl: string;
    private apiKey?: string;

    constructor(baseUrl: string, apiKey?: string) {
        this.baseUrl = baseUrl;
        this.apiKey = apiKey;
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

    async requestSpin(request: SpinRequest): Promise<SpinResponse> {
        try {
            const response = await fetch(`${this.baseUrl}/api/spin`, {
                method: 'POST',
                headers: this.getHeaders(),
                body: JSON.stringify(request)
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            return await response.json();
        } catch (error) {
            return {
                success: false,
                error: `HTTP request failed: ${error}`
            };
        }
    }

    async requestBalance(playerId: string): Promise<{ balance: number; success: boolean }> {
        try {
            const response = await fetch(`${this.baseUrl}/api/balance/${playerId}`, {
                headers: this.getHeaders()
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            debug.error('Balance request failed:', error);
            return { balance: 0, success: false };
        }
    }

    async requestGameState(playerId: string): Promise<any> {
        try {
            const response = await fetch(`${this.baseUrl}/api/gamestate/${playerId}`, {
                headers: this.getHeaders()
            });
            return await response.json();
        } catch (error) {
            return { error: 'Failed to get game state' };
        }
    }
}

// 3. WEBSOCKET ADAPTER - For real-time communication
export class WebSocketAdapter implements CommunicationAdapter {
    private ws: WebSocket | null = null;
    private messageHandlers: Map<string, (data: any) => void> = new Map();
    private requestId = 0;
    private pendingRequests: Map<string, { resolve: Function; reject: Function }> = new Map();

    constructor(private wsUrl: string) {}

    private async ensureConnection(): Promise<void> {
        if (this.ws?.readyState === WebSocket.OPEN) {
            return;
        }

        return new Promise((resolve, reject) => {
            this.ws = new WebSocket(this.wsUrl);
            
            this.ws.onopen = () => resolve();
            this.ws.onerror = (error) => reject(error);
            
            this.ws.onmessage = (event) => {
                try {
                    const message = JSON.parse(event.data);
                    this.handleMessage(message);
                } catch (error) {
                    debug.error('Failed to parse WebSocket message:', error);
                }
            };
        });
    }

    private handleMessage(message: any): void {
        if (message.requestId && this.pendingRequests.has(message.requestId)) {
            const { resolve } = this.pendingRequests.get(message.requestId)!;
            this.pendingRequests.delete(message.requestId);
            resolve(message.data);
        }
    }

    private async sendRequest(type: string, data: any): Promise<any> {
        await this.ensureConnection();
        
        const requestId = `req_${++this.requestId}`;
        const message = { type, data, requestId };

        return new Promise((resolve, reject) => {
            this.pendingRequests.set(requestId, { resolve, reject });
            this.ws!.send(JSON.stringify(message));
            
            // Timeout after 30 seconds
            setTimeout(() => {
                if (this.pendingRequests.has(requestId)) {
                    this.pendingRequests.delete(requestId);
                    reject(new Error('Request timeout'));
                }
            }, 30000);
        });
    }

    async requestSpin(request: SpinRequest): Promise<SpinResponse> {
        try {
            return await this.sendRequest('spin', request);
        } catch (error) {
            return { success: false, error: `WebSocket error: ${error}` };
        }
    }

    async requestBalance(playerId: string): Promise<{ balance: number; success: boolean }> {
        try {
            return await this.sendRequest('balance', { playerId });
        } catch (error) {
            return { balance: 0, success: false };
        }
    }

    async requestGameState(playerId: string): Promise<any> {
        try {
            return await this.sendRequest('gamestate', { playerId });
        } catch (error) {
            return { error: 'WebSocket request failed' };
        }
    }
}

// 4. WEB WORKER ADAPTER - For running communication in a separate thread
export class WebWorkerAdapter implements CommunicationAdapter {
    private worker: Worker | null = null;
    private messageId = 0;
    private pendingMessages: Map<number, { resolve: Function; reject: Function }> = new Map();

    constructor(private workerScript: string) {
        this.initWorker();
    }

    private initWorker(): void {
        this.worker = new Worker(this.workerScript);
        
        this.worker.onmessage = (event) => {
            const { id, success, data, error } = event.data;
            
            if (this.pendingMessages.has(id)) {
                const { resolve, reject } = this.pendingMessages.get(id)!;
                this.pendingMessages.delete(id);
                
                if (success) {
                    resolve(data);
                } else {
                    reject(new Error(error));
                }
            }
        };

        this.worker.onerror = (error) => {
            debug.error('Web Worker error:', error);
        };
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
                    reject(new Error('Worker request timeout'));
                }
            }, 30000);
        });
    }

    async requestSpin(request: SpinRequest): Promise<SpinResponse> {
        try {
            return await this.postMessage('spin', request);
        } catch (error) {
            return { success: false, error: `Worker error: ${error}` };
        }
    }

    async requestBalance(playerId: string): Promise<{ balance: number; success: boolean }> {
        try {
            return await this.postMessage('balance', { playerId });
        } catch (error) {
            return { balance: 0, success: false };
        }
    }

    async requestGameState(playerId: string): Promise<any> {
        try {
            return await this.postMessage('gamestate', { playerId });
        } catch (error) {
            return { error: 'Worker request failed' };
        }
    }
} 