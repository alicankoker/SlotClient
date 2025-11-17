import { Application, Texture } from "pixi.js";
import { BackgroundContainer } from "../background/BackgroundContainer";
import { BackgroundController } from "../background/BackgroundController";
import { ResponsiveConfig } from "../utils/ResponsiveManager";
import { GameConfig } from "../../config/GameConfig";
import { Spine } from "@esotericsoftware/spine-pixi-v8";
import { AssetsConfig } from "../../config/AssetsConfig";

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

    public static getInstance(texture?: Texture): Background {
        if (!this._instance) {
            this._instance = new Background(texture || Texture.from('base_background'));
        }
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
            case GameConfig.ORIENTATION.landscape:
                this.position.set(0, 250);
                break;
            case GameConfig.ORIENTATION.portrait:
                this.position.set(0, -20);
                break;
        }
    }

    public getController(): BackgroundController<Background> {
        return this._controller;
    }
}