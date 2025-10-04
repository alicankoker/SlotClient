//controller for player events

import { PlayerEvents } from "../Channels/EventChannels";
import { EventManager } from "./EventManager";

export class PlayerEventsManager {
    private eventManager: EventManager;

    constructor(eventManager: EventManager) {
        this.eventManager = eventManager;
    }

    public emitPlayerBalanceChanged(playerId: string, balance: number) {
        this.eventManager.emit(PlayerEvents.BALANCE_CHANGED, { playerId, balance });
    }

    public emitPlayerBetChanged(playerId: string, bet: number) {
        this.eventManager.emit(PlayerEvents.BET_CHANGED, { playerId, bet });
    }

    public emitPlayerLevelUp(playerId: string) {
        this.eventManager.emit(PlayerEvents.LEVEL_UP, { playerId });
    }

    public emitGetPlayerData(playerId: string) {
        this.eventManager.emit(PlayerEvents.GET_PLAYER_DATA, { playerId });
    }
}