import { debug } from '@slotclient/engine/utils/debug';
import { CommunicationManager, CommunicationMode } from './config';

// Example initialization based on environment
export async function initializeCommunication(): Promise<void> {
    const environment = process.env.NODE_ENV || 'development';
    
    switch (environment) {
        case 'development':
            // Use local adapter for development
            await CommunicationManager.setupLocal();
            debug.log('✅ Communication initialized for DEVELOPMENT (Local)');
            break;
            
        case 'staging':
            // Use HTTP adapter for staging environment
            await CommunicationManager.setupHttp(
                'https://staging-api.yourgame.com',
                process.env.API_KEY
            );
            debug.log('✅ Communication initialized for STAGING (HTTP)');
            break;
            
        case 'production':
            // Use WebSocket for production for real-time communication
            await CommunicationManager.setupWebSocket(
                'wss://ws.yourgame.com/game'
            );
            debug.log('✅ Communication initialized for PRODUCTION (WebSocket)');
            break;
            
        default:
            // Fallback to local
            await CommunicationManager.setupLocal();
            debug.log('✅ Communication initialized with LOCAL fallback');
    }
}

// Example: Manual configuration
export async function setupCustomCommunication(): Promise<void> {
    const manager = CommunicationManager.getInstance();
    
    // Configure for external microservice
    await manager.configure({
        mode: CommunicationMode.HTTP,
        httpConfig: {
            baseUrl: 'https://your-game-service.com',
            apiKey: 'your-api-key-here'
        }
    });
    
    // Set up event listeners for debugging
    const bridge = manager.getBridge();
    bridge.on('spin-request', (request: any) => {
        debug.log('🎰 Spin requested:', request);
    });
    
    bridge.on('spin-response', (response: any) => {
        debug.log('📥 Spin response:', response);
    });
    
    bridge.on('spin-error', (error: any) => {
        debug.error('❌ Spin error:', error);
    });
}

// Example: Switch communication mode at runtime
export async function switchToExternalService(): Promise<void> {
    const manager = CommunicationManager.getInstance();
    
    debug.log('🔄 Switching to external communication service...');
    
    await manager.configure({
        mode: CommunicationMode.HTTP,
        httpConfig: {
            baseUrl: 'https://external-game-provider.com/api',
            apiKey: process.env.EXTERNAL_API_KEY
        }
    });
    
    debug.log('✅ Switched to external service');
}

// Example: Use WebWorker for heavy communication processing
export async function setupWorkerCommunication(): Promise<void> {
    await CommunicationManager.setupWebWorker('/workers/communication-worker.js');
    debug.log('✅ Communication running in Web Worker');
} 