// Default connection config
// This should be set by the game package before SocketConnection is used
let connectionConfig = {
    BACKEND_URL: "https://rngengine.com",
    USER_ID: undefined,
};
export function setConnectionConfig(config) {
    connectionConfig = { ...connectionConfig, ...config };
}
export function getConnectionConfig() {
    return connectionConfig;
}
export default connectionConfig;
