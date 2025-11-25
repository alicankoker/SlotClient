export interface IConnectionConfig {
    BACKEND_URL: string;
    USER_ID: string | undefined;
}
declare let connectionConfig: IConnectionConfig;
export declare function setConnectionConfig(config: Partial<IConnectionConfig>): void;
export declare function getConnectionConfig(): IConnectionConfig;
export default connectionConfig;
//# sourceMappingURL=ConnectionConfig.d.ts.map