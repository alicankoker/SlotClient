import { Sprite, Texture, Application } from "pixi.js";
import { signals, SCREEN_SIGNALS, SignalSubscription } from './controllers/SignalManager';
import { GameConfig } from "../config/GameConfig";
import { debug } from "./utils/debug";
import { ResponsiveConfig } from "./utils/ResponsiveManager";

export class Background extends Sprite {
    private app: Application;
    private resizeSubscription?: SignalSubscription;

    constructor(app: Application) {
        super(Texture.EMPTY);

        this.app = app;

        // Set initial size and position
        this.setupBackground();
        this.setupResizeHandler();
    }

    private setupBackground(): void {
        this.anchor.set(0.5, 0.5);
        this.position.set(GameConfig.REFERENCE_RESOLUTION.width / 2, GameConfig.REFERENCE_RESOLUTION.height / 2);
    }

    private setupResizeHandler(): void {
        // Subscribe to resize events using the signal system
        this.resizeSubscription = signals.on(SCREEN_SIGNALS.SCREEN_RESIZE, this.onResize.bind(this));
    }

    private onResize(responsiveConfig?: ResponsiveConfig): void {
        const assetName = responsiveConfig?.isMobile ? (responsiveConfig.orientation === GameConfig.ORIENTATION.landscape ? "background_landscape_1080" : "background_portrait_1080") : "background_landscape_1080";
        this.texture = Texture.from(assetName);
    }

    public destroy(): void {
        // Clean up resize subscription
        if (this.resizeSubscription) {
            this.resizeSubscription.unsubscribe();
            this.resizeSubscription = undefined;
        }

        // Call parent destroy
        super.destroy();
    }
}