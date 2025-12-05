import { Texture } from "pixi.js";
import { BackgroundContainer } from "@slotclient/engine/background/BackgroundContainer";
import { BackgroundController } from "@slotclient/engine/background/BackgroundController";
import { ResponsiveConfig } from "@slotclient/engine/utils/ResponsiveManager";

export class Background extends BackgroundContainer {
    private static _instance: Background;
    private _controller: BackgroundController<Background>;

    private constructor(texture: Texture) {
        super();

        this.position.set(0, 250);

        this.initialize(texture);

        this._controller = this.createController();

        this.setupBackgroundFilter();
    }

    public static getInstance(texture: Texture): Background {
        if (!this._instance) {
            this._instance = new Background(texture);
        }
        return this._instance;
    }

    public static instance(): Background {
        return this._instance;
    }

    private createController(): BackgroundController<Background> {
        return new (class extends BackgroundController<Background> { })(this);
    }

    private setupBackgroundFilter(): void {
        // const blurFilter = new BlurFilter();
        // blurFilter.strength = 10;
        // blurFilter.quality = 10;
        // this.filters = [blurFilter];
    }

    protected setupBackgroundElements(): void {
        super.setupBackgroundElements();
    }

    public setFreeSpinMode(enabled: boolean): void {
        this.setBackgroundTexture(enabled ? 'freespin_background' : 'base_background');
    }

    protected onResize(responsiveConfig: ResponsiveConfig): void {
        super.onResize(responsiveConfig);

        switch (responsiveConfig.orientation) {
            case this._gameConfig.ORIENTATION.landscape:
                this.position.set(0, 250);
                break;
            case this._gameConfig.ORIENTATION.portrait:
                this.position.set(0, -20);
                break;
        }
    }

    public getController(): BackgroundController<Background> {
        return this._controller;
    }
}