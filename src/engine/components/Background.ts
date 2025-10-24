import { Application } from "pixi.js";
import { BackgroundContainer } from "../background/BackgroundContainer";
import { BackgroundController } from "../background/BackgroundController";
import { ResponsiveConfig } from "../utils/ResponsiveManager";

export class Background extends BackgroundContainer {
    private static _instance: Background;
    private _controller: BackgroundController<Background>;

    private constructor(app: Application) {
        super(app, 'background_base');

        this._controller = this.createController();

        this.setupBackgroundFilter();
    }

    public static getInstance(app: Application): Background {
        if (!this._instance) {
            this._instance = new Background(app);
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
    }

    protected onResize(responsiveConfig: ResponsiveConfig): void { }

    public getController(): BackgroundController<Background> {
        return this._controller;
    }
}