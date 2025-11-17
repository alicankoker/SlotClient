import { GameDataManager } from "../../engine/data/GameDataManager";
import { IPayload } from "../../engine/types/ICommunication";
import config from "../../game/config";
import { io, Socket } from "socket.io-client";
import { Nexus } from "../../nexus/Nexus";

export class SocketConnection {
    private static instance: SocketConnection;
    private _socket: Socket;

    private constructor() {
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

                this._socket.on("disconnect", (reason) => {
                    reject(new Error(`Disconnected: ${reason}`));
                });

                this._socket.on("connect_error", (err) => {
                    reject(new Error(`Connection error: ${err.message}`));
                });

                this._socket.on("error", (error) => {
                    reject(new Error(`Socket error: ${error}`));
                    console.error("Socket error:", error);
                });

                this._socket.on("reconnect", (attemptNumber) => {
                    console.log(`Reconnected after ${attemptNumber} attempts`);
                });

                this._socket.once("ready", (data: any) => {
                    console.log("Socket ready:", data.data);
                    GameDataManager.getInstance().setInitialData(data.data);
                    Nexus.getInstance().setGameDefaults(data.data);
                    Nexus.getInstance().setUIDefaults(data.data);
                    resolve();
                });
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