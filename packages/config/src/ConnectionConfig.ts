// Connection configuration
// This can be overridden by the game package if needed
export interface IConnectionConfig {
    BACKEND_URL: string;
    USER_ID: string | undefined;
}

// Default connection config
// This should be set by the game package before SocketConnection is used
let connectionConfig: IConnectionConfig = {
    BACKEND_URL: "https://rngengine.com",
    USER_ID: undefined,
};

export function setConnectionConfig(config: Partial<IConnectionConfig>): void {
    connectionConfig = { ...connectionConfig, ...config };
}

export function getConnectionConfig(): IConnectionConfig {
    return connectionConfig;
}

export default connectionConfig;

