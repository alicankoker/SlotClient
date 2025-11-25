import { GameDataManager } from "@slotclient/engine/data/GameDataManager";
import { getConnectionConfig } from "@slotclient/config/ConnectionConfig";
import { io } from "socket.io-client";
import { Nexus } from "@slotclient/nexus/Nexus";
export class SocketConnection {
    constructor() {
        const config = getConnectionConfig();
        console.log("Backend URL from env:", config.BACKEND_URL);
        console.log("User ID from config:", config.USER_ID);
        this._socket = io(config.BACKEND_URL, { auth: { id: config.USER_ID }, autoConnect: true });
    }
    static getInstance() {
        if (!SocketConnection.instance) {
            SocketConnection.instance = new SocketConnection();
        }
        return SocketConnection.instance;
    }
    async connect() {
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
                this._socket.once("ready", (data) => {
                    console.log("Socket ready:", data.data);
                    GameDataManager.getInstance().setInitialData(data.data);
                    Nexus.getInstance().setGameDefaults(data.data);
                    Nexus.getInstance().setUIDefaults(data.data);
                    resolve();
                });
            });
        });
    }
    request(payload) {
        return new Promise((resolve, reject) => {
            this._socket.emit("event", payload, (response) => {
                if (response.error) {
                    reject(response.error);
                }
                else {
                    resolve(response.data);
                }
            });
        });
    }
    reconnect() {
        if (this._socket.connected) {
            console.log("Socket already connected.");
            return;
        }
        this._socket.connect();
    }
}
