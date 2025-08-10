export interface INexusPlayerData {
    playerId: string;
    balance: number;
    currency: string;
    sessionId: string;
    lastActivity: number;
}

export interface SpinTransaction {
    transactionId: string;
    spinId: string;
    playerId: string;
    betAmount: number;
    winAmount: number;
    timestamp: number;
    status: 'pending' | 'completed' | 'failed';
}

export interface NexusSpinRequest {
    playerId: string;
    betAmount: number;
    gameMode?: string;
}

export interface NexusSpinResponse {
    success: boolean;
    error?: string;
    transaction?: SpinTransaction;
    gameResult?: any; // This will contain the pure game logic result
    newBalance?: number;
}