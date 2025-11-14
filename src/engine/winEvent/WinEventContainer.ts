import { Container, Text } from "pixi.js";
import { Counter } from "../utils/Counter";
import { GameConfig } from "../../config/GameConfig";
import { ResponsiveConfig } from "../utils/ResponsiveManager";
import { SIGNAL_EVENTS, signals, SignalSubscription } from "../controllers/SignalManager";
import { SpriteText } from "../utils/SpriteText";

export abstract class WinEventContainer extends Container {
    protected _resizeSubscription?: SignalSubscription;
    protected _counter!: Counter;
    protected _amountText!: SpriteText;
    protected _winEventType: number = 0;
    protected _isAnimating: boolean = false;
    protected _isWinEventSkipped: boolean = false;
    protected _currentWinAmount: number = 0;
    protected _targetWinAmount: number = 0;
    protected _duration: number = GameConfig.WIN_EVENT.duration;
    protected _tweenObj: { value: number } = { value: 0 };

    constructor() {
        super();
        
        this.alpha = 0;
        this.visible = false;
        this.interactive = true;
        this.cursor = "pointer";

        this._resizeSubscription = signals.on(SIGNAL_EVENTS.SCREEN_RESIZE, (responsiveConfig) => {
            this.onResize(responsiveConfig);
        });
    }

    // Hooks
    public async beforeWinEvent(): Promise<void> { }
    public abstract playWinEventAnimation(): void;
    public playCoinAnimation(): void { }
    public stopCoinAnimation(): void { }
    public async afterWinEvent(): Promise<void> { }

    // Counter logic
    public async playCounterAnimation(): Promise<void> {
        await this._counter.playCounterAnimation({
            current: this._currentWinAmount,
            target: this._targetWinAmount,
            duration: this._duration,
            ease: "power1.out",
            currency: "$",
            startScale: { x: 0.2, y: 0.2 },
            endScale: { x: 0.5, y: 0.5 },
        });
    }

    // Reset
    public async resetScene(): Promise<void> {
        this.visible = false;
        this.alpha = 0;
        this._isAnimating = false;
        this._isWinEventSkipped = false;
        this._currentWinAmount = 0;
        this._targetWinAmount = 0;
        this._tweenObj = { value: 0 };
        this._amountText.setText("");
    }

    // Skip
    public skipWinEvent(): void {
        this._isWinEventSkipped = true;
        this._counter.skipCounterAnimation();
    }

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
        this._resizeSubscription?.unsubscribe();
        this._resizeSubscription = undefined;

        super.destroy(options);
    }

    //#region Getters/Setters
    public get isWinEventActive(): boolean {
        return this._isAnimating;
    }
    public set isWinEventActive(value: boolean) {
        this._isAnimating = value;
    }

    public get targetWinAmount(): number {
        return this._targetWinAmount;
    }
    public set targetWinAmount(value: number) {
        this._targetWinAmount = value;
    }

    public get currentWinAmount(): number {
        return this._currentWinAmount;
    }
    public set currentWinAmount(value: number) {
        this._currentWinAmount = value;
    }

    public get winEventType(): number {
        return this._winEventType;
    }
    public set winEventType(value: number) {
        this._winEventType = value;
    }

    public get isWinEventSkipped(): boolean {
        return this._isWinEventSkipped;
    }
    public set isWinEventSkipped(value: boolean) {
        this._isWinEventSkipped = value;
    }

    public get duration(): number {
        return this._duration;
    }
    //#endregion
}