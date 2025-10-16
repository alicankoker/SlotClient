import { Application, Container, Text } from "pixi.js";
import { SIGNAL_EVENTS, signals } from "../controllers/SignalManager";
import { debug } from "../utils/debug";
import { Counter } from "../utils/Counter";
import { GameConfig } from "../../config/GameConfig";
import { gsap } from "gsap";
import { BigWinType } from "../types/GameTypes";

export abstract class BigWinContainer extends Container {
    protected _counter!: Counter;
    protected _bigWinType: number = 0
    protected _isAnimating: boolean = false;
    protected _isBigWinSkipped: boolean = false;
    protected _amountText!: Text;
    protected _currentWinAmount: number = 0;
    protected _targetWinAmount: number = 0;
    protected _duration: number = GameConfig.BIG_WIN.duration;
    protected _tweenObj: { value: number } = { value: 0 };
    protected _onSkip: () => void;

    constructor() {
        super();
        this.alpha = 0;
        this.visible = false;
        this.interactive = true;
        this.cursor = "pointer"

        this._onSkip = this.skipBigWin.bind(this);
    }

    /**
     * @description Initialize the BigWin animation.
     */
    public async showBigWin(amount:number, type: BigWinType): Promise<void> {
        if (this._isAnimating) {
            return;
        }

        this._targetWinAmount = amount;
        this._bigWinType = Object.values(BigWinType).indexOf(type);

        window.addEventListener("click", this._onSkip, { once: true });

        console.log("BigWin", "Big Win animation started.");

        gsap.to(this, {
            alpha: 1,
            duration: 0.25,
            ease: "none",
            onStart: () => {
                this.visible = true;
            }
        });

        await this.beforeBigWin();

        this._isAnimating = true;
        this._isBigWinSkipped = false;

        signals.emit(SIGNAL_EVENTS.BIG_WIN_STARTED);

        this.playBigWinAnimation();
        this.playCoinAnimation();
        await this.playCounterAnimation();
        this.stopCoinAnimation();
        await this.stopBigWinAnimation();

        signals.emit(SIGNAL_EVENTS.BIG_WIN_STOPPED);

        await this.afterBigWin();
    }

    /**
     * @description Hook to run before the big win animation starts.
     * This can be overridden by subclasses to perform actions before the big win animation.
     * @returns Promise that resolves when the pre-animation actions are complete.
     */
    protected async beforeBigWin(): Promise<void> { }

    /**
     * @description Hook to run after the big win animation ends.
     * This can be overridden by subclasses to perform actions after the big win animation.
     * @returns Promise that resolves when the post-animation actions are complete.
     */
    protected async afterBigWin(): Promise<void> { }

    /**
     * @description Play the big win animation.
     * This method should be implemented by subclasses to define how the big win animation is played.
     * Current amount and target amount should be set here.
     * @returns Promise that resolves when the big win animation is complete.
     */
    protected abstract playBigWinAnimation(): void;

    /**
     * @description Play the counter animation for the big win.
     * This method should be implemented by subclasses to define how the counter animation is played.
     * @returns Promise that resolves when the counter animation is complete.
     */
    protected async playCounterAnimation(): Promise<void> {
        await this._counter.playCounterAnimation({
            current: this._currentWinAmount,
            target: this._targetWinAmount,
            duration: this._duration,
            ease: "power1.out"
        });
    }

    /**
     * @description Play the coin animation for the big win.
     * This method should be implemented by subclasses to define how the coin animation is played.
     */
    protected playCoinAnimation(): void { };

    /**
     * @description Stop the coin animation for the big win.
     * This method should be implemented by subclasses to define how the coin animation is stopped.
     */
    protected stopCoinAnimation(): void { };

    /**
     * @description Skip the big win animation.
     * This method might be overridden by subclasses to define how the big win animation is skipped.
     */
    protected skipBigWin(): void {
        if (!this._isAnimating || !GameConfig.BIG_WIN.canSkip) {
            debug.warn("BigWin", "Animation is not running or cannot be skipped, no skip action performed.");
            return;
        }

        this._isBigWinSkipped = true;

        this.alpha = 1;

        this._counter.skipCounterAnimation()
    }

    /**
     * @description Stop the animation and hide the big win display.
     * This method might be overridden by subclasses to define what should happen when the animation stops and how the big win display is hidden.
     */
    protected async stopBigWinAnimation(): Promise<void> {
        if (!this._isAnimating) {
            debug.warn("BigWin", "Animation is not running, no stop action performed.");
            return;
        }

        window.removeEventListener("click", this._onSkip);

        return new Promise((resolve) => {
            gsap.to(this, {
                alpha: 0,
                duration: 0.25,
                ease: "none",
                delay: 2,
                onComplete: () => {
                    this.visible = false;

                    this._bigWinType = 0;
                    this._isAnimating = false;
                    this._isBigWinSkipped = false;
                    this._amountText.text = "";
                    this._currentWinAmount = 0;
                    this._targetWinAmount = 0;
                    this._duration = GameConfig.BIG_WIN.duration;
                    this._tweenObj = { value: 0 };

                    console.log("BigWin", "Big Win animation stopped.");

                    resolve();
                }
            });
        });
    }

    //#region Getters and Setters
    /**
     * @description Get the isBigWinActive property.
     */
    public get isBigWinActive(): boolean {
        return this._isAnimating;
    }
    //#endregion
}