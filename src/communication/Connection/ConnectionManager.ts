// connection manager for communication

import { EventManager } from "../EventManagers/EventManager";

export class ConnectionManager {
    private eventManager: EventManager;

    constructor(eventManager: EventManager) {
        this.eventManager = eventManager;
    }

    public connect() {
        //this.eventManager.connect();
    }

    public disconnect() {
        //this.eventManager.disconnect();
    }
}