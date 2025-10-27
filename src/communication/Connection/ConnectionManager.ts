// connection manager for communication

import { EventManager } from "../EventManagers/EventManager";
import { GameEvents, CommunicationEvents } from "../Channels/EventChannels";

export interface ConnectionConfig {
    host: string;
    port: number;
    protocol?: string;
    basePath?: string;
    timeout?: number;
    retryAttempts?: number;
    retryDelay?: number;
}

export interface ApiResponse {
    success: boolean;
    data?: any;
    error?: string;
    timestamp: number;
}

export interface SpinRequest {
    bet: number;
    lines: number;
    gameId?: string;
}

export interface SpinResponse {
    result: any;
    balance: number;
    winAmount: number;
    symbols: number[][];
    paylines: any[];
}

export class ConnectionManager {
    private eventManager: EventManager;
    private config: ConnectionConfig;
    private isConnected: boolean = false;
    private requestIdCounter: number = 0;

    constructor(eventManager: EventManager, config?: Partial<ConnectionConfig>) {
        this.eventManager = eventManager;
        this.config = {
            host: 'localhost',
            port: 3001,
            protocol: 'http',
            basePath: '/api',
            timeout: 10000,
            retryAttempts: 3,
            retryDelay: 1000,
            ...config
        };
        this.isConnected = true; // HTTP is always "connected"
    }

    public async connect(): Promise<void> {
        // For HTTP, we just test the connection
        try {
            await this.testConnection();
            console.log('[ConnectionManager] HTTP connection ready');
            this.eventManager.emit('connection:opened', { 
                url: `${this.config.protocol}://${this.config.host}:${this.config.port}${this.config.basePath}` 
            });
        } catch (error) {
            console.error('[ConnectionManager] Failed to connect:', error);
            this.eventManager.emit('connection:error', { error });
            throw error;
        }
    }

    public disconnect(): void {
        this.isConnected = false;
        this.eventManager.emit('connection:disconnected', {});
    }

    public async requestSpin(bet: number, lines: number, gameId: string = 'diamond_diggers'): Promise<SpinResponse> {
        const url = this.buildUrl(`/games/${gameId}`);
        const params = new URLSearchParams({
            action: 'spin',
            bet: bet.toString(),
            lines: lines.toString()
        });

        try {
            console.log(`[ConnectionManager] Requesting spin: ${url}?${params}`);
            this.eventManager.emit(GameEvents.SPIN_STARTED, { bet, lines, gameId });

            const response = await this.makeRequest(`${url}?${params}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                }
            });

            const spinResponse: SpinResponse = {
                result: response.data,
                balance: response.data.balance || 0,
                winAmount: response.data.winAmount || 0,
                symbols: response.data.symbols || [],
                paylines: response.data.paylines || []
            };

            this.eventManager.emit(GameEvents.SPIN_COMPLETED, spinResponse);
            return spinResponse;

        } catch (error) {
            console.error('[ConnectionManager] Spin request failed:', error);
            this.eventManager.emit(GameEvents.SPIN_FAILED, { error: error instanceof Error ? error.message : String(error), bet, lines });
            throw error;
        }
    }

    public async requestBalance(playerId: string): Promise<number> {
        const url = this.buildUrl('/player/balance');
        const params = new URLSearchParams({ playerId });

        try {
            console.log(`[ConnectionManager] Requesting balance: ${url}?${params}`);
            
            const response = await this.makeRequest(`${url}?${params}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                }
            });

            const balance = response.data.balance || 0;
            this.eventManager.emit(GameEvents.PLAYER_BALANCE_CHANGED, { balance, playerId });
            return balance;

        } catch (error) {
            console.error('[ConnectionManager] Balance request failed:', error);
            throw error;
        }
    }

    public async requestGameState(playerId: string, gameId: string = 'diamond_diggers'): Promise<any> {
        const url = this.buildUrl(`/games/${gameId}/state`);
        const params = new URLSearchParams({ playerId });

        try {
            console.log(`[ConnectionManager] Requesting game state: ${url}?${params}`);
            
            const response = await this.makeRequest(`${url}?${params}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                }
            });

            return response.data;

        } catch (error) {
            console.error('[ConnectionManager] Game state request failed:', error);
            throw error;
        }
    }

    private async testConnection(): Promise<void> {
        const url = this.buildUrl('/health');
        await this.makeRequest(url, { method: 'GET' });
    }

    private buildUrl(endpoint: string): string {
        return `${this.config.protocol}://${this.config.host}:${this.config.port}${this.config.basePath}${endpoint}`;
    }

    private async makeRequest(url: string, options: RequestInit = {}): Promise<ApiResponse> {
        const requestId = `req_${++this.requestIdCounter}_${Date.now()}`;
        
        const defaultOptions: RequestInit = {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            },
            ...options
        };

        for (let attempt = 1; attempt <= this.config.retryAttempts!; attempt++) {
            try {
                console.log(`[ConnectionManager] Making request (attempt ${attempt}): ${url}`);
                
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

                const response = await fetch(url, {
                    ...defaultOptions,
                    signal: controller.signal
                });

                clearTimeout(timeoutId);

                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }

                const data = await response.json();
                
                const apiResponse: ApiResponse = {
                    success: true,
                    data,
                    timestamp: Date.now()
                };

                console.log(`[ConnectionManager] Request successful:`, apiResponse);
                return apiResponse;

            } catch (error) {
                console.error(`[ConnectionManager] Request failed (attempt ${attempt}):`, error);
                
                if (attempt === this.config.retryAttempts) {
                    this.eventManager.emit('connection:error', { 
                        error: error instanceof Error ? error.message : String(error), 
                        url, 
                        requestId 
                    });
                    throw error;
                }

                // Wait before retry
                await new Promise(resolve => setTimeout(resolve, this.config.retryDelay! * attempt));
            }
        }

        throw new Error('Max retry attempts exceeded');
    }

    public getConnectionState(): { isConnected: boolean; baseUrl: string } {
        return {
            isConnected: this.isConnected,
            baseUrl: `${this.config.protocol}://${this.config.host}:${this.config.port}${this.config.basePath}`
        };
    }

    public updateConfig(newConfig: Partial<ConnectionConfig>): void {
        this.config = { ...this.config, ...newConfig };
    }
}