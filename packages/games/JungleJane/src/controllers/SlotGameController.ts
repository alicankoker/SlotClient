import { Application } from 'pixi.js';
import { SlotGame } from '../SlotGame';

export class SlotGameController {
    private static instance: SlotGameController;
    private app!: Application;
    private slotGame?: SlotGame;

    private constructor() {}

    public static getInstance(): SlotGameController {
        if (!SlotGameController.instance) {
            SlotGameController.instance = new SlotGameController();
        }
        return SlotGameController.instance;
    }

    public init(app: Application): void {
        this.app = app;
        this.slotGame = new SlotGame(this.app);
    }
}
