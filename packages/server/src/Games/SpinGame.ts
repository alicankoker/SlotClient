import { SpinResponseData } from "@slotclient/engine/types/ICommunication";

export class SpinGame {
    public static readonly gameID: number = 0;

    public generateSpinData(): SpinResponseData {
        return {
            success: true,
            result: {
                spinId: '123',
                totalWin: 0,
                steps: [],
                fsWon: false,
                bonusWon: false
            }
        }
    }
}