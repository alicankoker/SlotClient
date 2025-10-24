import { Container } from "pixi.js";
import { SIGNAL_EVENTS, signals, SignalSubscription } from "../controllers/SignalManager";
import { ResponsiveConfig } from "../utils/ResponsiveManager";

export abstract class BonusContainer extends Container {
    private resizeSubscription?: SignalSubscription;

    constructor() {
        super();
        
        this.resizeSubscription = signals.on(SIGNAL_EVENTS.SCREEN_RESIZE, (responsiveConfig) => {
            this.onResize(responsiveConfig);
        });
    }

    /**
     * @description Before a bonus is selected (e.g., setup animation)
     */
    protected beforeSelect(): void { }

    /**
     * @description When a bonus is selected (main animation)
     */
    protected abstract onBonusSelected(): void;

    /**
     * @description After a bonus is selected (e.g., transition out)
     */
    protected afterSelect(): void { }

    /**
     * @description Reset the bonus animations
     */
    protected abstract resetScene(): void;

    /**
     * @description When the bonus is completed visually
     */
    protected abstract onBonusCompleted(): void;

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