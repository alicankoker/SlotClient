import { GameServer } from "../../server/GameServer";
import { IBonusData } from "../types/ICommunication";
import { debug } from "../utils/debug";
import { BonusContainer } from "./BonusContainer";

export abstract class BonusController<T extends BonusContainer> {
    protected view: T;
    public data!: IBonusData;

    constructor(view: T) {
        this.view = view;
    }

    /**
     * @description Send bonus data to the server
     * @param data The bonus data to send
     */
    public async sendBonusAction(): Promise<IBonusData> {
        const response = await GameServer.getInstance().processRequest("bonus");
        this.onDataReceived(response.bonus.history[0]);

        return response.bonus.history[0];
    };

    /**
     * @description Handle received bonus data from the server
     * @param data The received bonus data
     */
    public onDataReceived(data: IBonusData): void {
        debug.log("Bonus data received:", data);
        this.data = data;
    }

    /**
     * @description Reset the bonus state
     */
    public abstract resetBonus(): void;

    /**
     * @description When the bonus is completed
     */
    public abstract onBonusCompleted(): void;
}