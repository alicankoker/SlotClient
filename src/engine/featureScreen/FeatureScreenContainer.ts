import { Application, Container } from "pixi.js";
import { ResponsiveConfig } from "../utils/ResponsiveManager";
import { SIGNAL_EVENTS, signals, SignalSubscription } from "../controllers/SignalManager";

export abstract class FeatureScreenContainer extends Container {
    protected _app: Application;
    protected _resizeSubscription?: SignalSubscription;
    protected _resolveClose?: () => void;

    constructor(app: Application) {
        super();

        this._app = app;

        this._resizeSubscription = signals.on(SIGNAL_EVENTS.SCREEN_RESIZE, (responsiveConfig) => {
            this.onResize(responsiveConfig);
        });
    }

    /**
     * @description Ekranın ana elementlerini oluşturur.
     */
    protected abstract setupFeatureElements(): void;

    /**
     * @description Preview döngüsünü başlatır.
     */
    protected abstract startPreviewCycle(): void;

    /**
     * @description Preview döngüsünü durdurur.
     */
    protected abstract stopPreviewCycle(): void;

    /**
     * @description Kapanmayı bekleyen promise döner.
     */
    public async waitForClose(): Promise<void> {
        return new Promise<void>((resolve) => {
            this._resolveClose = resolve;
        });
    }

    /**
     * @description View kapatıldığında çağrılır.
     */
    protected abstract closeFeatureScreen(): void;

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
        this.stopPreviewCycle();

        super.destroy();
    }
}