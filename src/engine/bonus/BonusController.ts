import { BonusContainer } from "./BonusContainer";

export abstract class BonusController<T extends BonusContainer> {
    protected view: T;
    public data: any;

    constructor(view: T) {
        this.view = view;
    }

    /**
     * @description Send bonus data to the server
     * @param data The bonus data to send
     */
    public async sendBonusData(data: any): Promise<void> {
        // const response = await new Promise<any>((resolve, reject) => {
        //     socket.emit("event", { action: "bonus", data }, (res: any) => {
        //         if (!res.error) resolve(res);
        //         else reject(res.error);
        //     });
        // });

        // this.onDataReceived(response.data);
    }

    /**
     * @description Handle received bonus data from the server
     * @param data The received bonus data
     */
    public onDataReceived(data: any): void {
        console.log("Bonus data received:", data);
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