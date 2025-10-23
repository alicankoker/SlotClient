import { Application, Container, Sprite } from "pixi.js";
import { GameConfig } from "../../config/GameConfig";
import { SIGNAL_EVENTS, signals, SignalSubscription } from "../controllers/SignalManager";
import { ResponsiveConfig } from "../utils/ResponsiveManager";

export abstract class BackgroundContainer extends Container {
    protected _app: Application;
    protected _resizeSubscription?: SignalSubscription;
    protected _backgroundSprite!: Sprite;

    protected constructor(app: Application, textureKey: string) {
        super();

        this._app = app;

        this.createBackground(textureKey);
        this.setupBackgroundElements();

        this._resizeSubscription = signals.on(SIGNAL_EVENTS.SCREEN_RESIZE, (responsiveConfig) => {
            this.onResize(responsiveConfig);
        });
    }

    protected createBackground(textureKey: string): void {
        this._backgroundSprite = Sprite.from(textureKey);
        this._backgroundSprite.label = "BackgroundSprite";
        this._backgroundSprite.anchor.set(0.5, 0.5);
        this._backgroundSprite.position.set(GameConfig.REFERENCE_RESOLUTION.width / 2, GameConfig.REFERENCE_RESOLUTION.height / 2);
        this.addChild(this._backgroundSprite);
    }

    protected setupBackgroundElements(): void { }

    /**
     * @description Handle resize events
     * @param config Responsive configuration such as orientation, dimensions, etc.
     */
    protected onResize(responsiveConfig: ResponsiveConfig): void { }

    /**
     * @description Clean up resources
     * @param options Destruction options from PIXI.Container
     */
    public override destroy(): void {
        this._resizeSubscription?.unsubscribe();
        this._resizeSubscription = undefined;

        super.destroy();
    }
}