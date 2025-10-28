import { Container } from "pixi.js";
import { SignalSubscription, signals, SIGNAL_EVENTS } from "../controllers/SignalManager";
import { ResponsiveConfig } from "../utils/ResponsiveManager";

export abstract class FreeSpinContainer extends Container {
    private resizeSubscription?: SignalSubscription;

    constructor() {
        super();

        this.resizeSubscription = signals.on(SIGNAL_EVENTS.SCREEN_RESIZE, (responsiveConfig) => {
            this.onResize(responsiveConfig);
        });
    }

    public abstract showPopup(): void;

    public abstract hidePopup(): void;

    /**
     * @description Handle resize events
     * @param config Responsive configuration such as orientation, dimensions, etc.
     */
    protected onResize(responsiveConfig: ResponsiveConfig): void { }

    /**
     * @description Clean up resources
     * @param options Destruction options from PIXI.Container
     */
    public override destroy(options?: boolean | { children?: boolean; texture?: boolean; baseTexture?: boolean; }): void {
        this.resizeSubscription?.unsubscribe();
        this.resizeSubscription = undefined;

        super.destroy(options);
    }
}