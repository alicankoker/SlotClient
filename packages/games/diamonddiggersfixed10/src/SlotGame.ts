import { Application } from 'pixi.js';

export class SlotGame {
    private app: Application;

    constructor(app: Application) {
        this.app = app;
        this.createSlotGame();
    }

    private createSlotGame(): void {
        // TODO: Implement your game logic here
        console.log('SlotGame initialized');
    }
}
