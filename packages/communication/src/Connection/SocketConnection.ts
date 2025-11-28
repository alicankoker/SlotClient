import { IPayload } from "@slotclient/engine/types/ICommunication";
import { getConnectionConfig } from "@slotclient/config";
import { io, Socket } from "socket.io-client";
import { signals } from "@slotclient/engine/controllers/SignalManager";

export class SocketConnection {
    private static instance: SocketConnection;
    private _socket: Socket;

    private constructor() {
        const config = getConnectionConfig();
        console.log("Backend URL from env:", config.BACKEND_URL);
        console.log("User ID from config:", config.USER_ID);

        this._socket = io(config.BACKEND_URL, { auth: { id: config.USER_ID }, autoConnect: true });
    }

    public static getInstance(): SocketConnection {
        if (!SocketConnection.instance) {
            SocketConnection.instance = new SocketConnection();
        }
        return SocketConnection.instance;
    }

    public async connect(): Promise<void> {
        return new Promise((resolve, reject) => {
            this._socket.on("connect", () => {
                console.log("Connected to backend via Socket.IO:", this._socket.id);

                this._socket.on("connect_error", (status) => {
                    reject(new Error(`Connection error: ${status.message}`));
                });

                this._socket.on("reconnect", (attemptNumber) => {
                    console.log(`Reconnected after ${attemptNumber} attempts`);
                });

                this._socket.on("disconnect", () => {
                    // disconnected
                    signals.emit("showErrorPopup", { code: "disconnected" });
                    console.warn("Socket error:", "disconnected");
                    reject(new Error(`Socket error: disconnected`));
                });

                this._socket.on("error", (status) => {
                    // invalid session - session expired
                    signals.emit("showErrorPopup", { code: status.code });
                    console.warn("Socket error:", status.code);
                    reject(new Error(`Socket error: ${status.message}`));
                });

                this._socket.on("duplicate_session", (status) => {
                    // duplicate session
                    signals.emit("showErrorPopup", { code: status.code });
                    console.warn("Socket error:", status.code);
                    reject(new Error(`Socket error: ${status.message}`));
                });

                this._socket.once("ready", (data: any) => {
                    signals.emit("socketReady", data);
                    console.log("Socket ready:", data.data);
                    resolve();
                });
            });

            this._socket.on("connect_error", (status) => {
                signals.emit("showErrorPopup", { code: "connect_error" });
                console.warn("Connection error:", status.message);
                reject(new Error(`Connection error: ${status.message}`));
            });
        });
    }

    public request(payload: IPayload): Promise<any> {
        return new Promise((resolve, reject) => {
            this._socket.emit("event", payload, (response: any) => {
                if (response.error) {
                    reject(response.error);
                } else {
                    resolve(response.data);
                }
            });
        });
    }

    public reconnect(): void {
        if (this._socket.connected) {
            console.log("Socket already connected.");
            return;
        }

        this._socket.connect();
    }
}