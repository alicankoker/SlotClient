import { CommunicationBridge } from './index';
import { LocalAdapter, HttpAdapter, WebSocketAdapter, WebWorkerAdapter } from './adapters';
import { debug } from '@slotclient/engine/utils/debug';

export enum CommunicationMode {
    LOCAL = 'local',
    HTTP = 'http',
    WEBSOCKET = 'websocket',
    WEBWORKER = 'webworker'
}

export interface CommunicationConfig {
    mode: CommunicationMode;
    httpConfig?: {
        baseUrl: string;
        apiKey?: string;
    };
    websocketConfig?: {
        url: string;
    };
    webworkerConfig?: {
        scriptPath: string;
    };
}

export class CommunicationManager {
    private static instance: CommunicationManager;
    private bridge: CommunicationBridge;
    private currentConfig: CommunicationConfig | null = null;

    private constructor() {
        this.bridge = CommunicationBridge.getInstance();
    }

    public static getInstance(): CommunicationManager {
        if (!CommunicationManager.instance) {
            CommunicationManager.instance = new CommunicationManager();
        }
        return CommunicationManager.instance;
    }

    public async configure(config: CommunicationConfig): Promise<void> {
        this.currentConfig = config;

        switch (config.mode) {
            case CommunicationMode.LOCAL:
                debug.log('🏠 Using local communication adapter');
                this.bridge.setAdapter(new LocalAdapter());
                break;

            case CommunicationMode.HTTP:
                if (!config.httpConfig) {
                    throw new Error('HTTP config required for HTTP mode');
                }
                debug.log('🌐 Using HTTP communication adapter:', config.httpConfig.baseUrl);
                this.bridge.setAdapter(new HttpAdapter(
                    config.httpConfig.baseUrl,
                    config.httpConfig.apiKey
                ));
                break;

            case CommunicationMode.WEBSOCKET:
                if (!config.websocketConfig) {
                    throw new Error('WebSocket config required for WebSocket mode');
                }
                debug.log('⚡ Using WebSocket communication adapter:', config.websocketConfig.url);
                this.bridge.setAdapter(new WebSocketAdapter(config.websocketConfig.url));
                break;

            case CommunicationMode.WEBWORKER:
                if (!config.webworkerConfig) {
                    throw new Error('WebWorker config required for WebWorker mode');
                }
                debug.log('🔧 Using WebWorker communication adapter:', config.webworkerConfig.scriptPath);
                this.bridge.setAdapter(new WebWorkerAdapter(config.webworkerConfig.scriptPath));
                break;

            default:
                throw new Error(`Unsupported communication mode: ${config.mode}`);
        }
    }

    public getBridge(): CommunicationBridge {
        return this.bridge;
    }

    public getCurrentConfig(): CommunicationConfig | null {
        return this.currentConfig;
    }

    // Convenience method for quick setup
    public static async setupLocal(): Promise<CommunicationManager> {
        const manager = CommunicationManager.getInstance();
        await manager.configure({ mode: CommunicationMode.LOCAL });
        return manager;
    }

    public static async setupHttp(baseUrl: string, apiKey?: string): Promise<CommunicationManager> {
        const manager = CommunicationManager.getInstance();
        await manager.configure({
            mode: CommunicationMode.HTTP,
            httpConfig: { baseUrl, apiKey }
        });
        return manager;
    }

    public static async setupWebSocket(url: string): Promise<CommunicationManager> {
        const manager = CommunicationManager.getInstance();
        await manager.configure({
            mode: CommunicationMode.WEBSOCKET,
            websocketConfig: { url }
        });
        return manager;
    }

    public static async setupWebWorker(scriptPath: string): Promise<CommunicationManager> {
        const manager = CommunicationManager.getInstance();
        await manager.configure({
            mode: CommunicationMode.WEBWORKER,
            webworkerConfig: { scriptPath }
        });
        return manager;
    }
} 