// controller for spin events

import { EventManager } from "./EventManager";
import { SpinEvents } from "../Channels/EventChannels";

export class SpinEventsManager {
    private eventManager: EventManager;

    constructor(eventManager: EventManager) {
        this.eventManager = eventManager;
    }

    public emitSpinStarted(playerId: string, bet: number) {
        this.eventManager.emit(SpinEvents.STARTED, { playerId, bet });
    }

    public emitSpinCompleted(playerId: string, result: any) {
        this.eventManager.emit(SpinEvents.COMPLETED, { playerId, result });
    }

    public emitSpinFailed(playerId: string, error: string) {
        this.eventManager.emit(SpinEvents.FAILED, { playerId, error });
    }

    public emitSpinRequest(playerId: string, bet: number) {
        this.eventManager.emit(SpinEvents.REQUEST, { playerId, bet });
    }
}