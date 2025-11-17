import { Text } from "pixi.js";
import { gsap } from "gsap";
import { Helpers } from "./Helpers";
import { SpriteText } from "./SpriteText";

interface CounterProps {
    text: Text | SpriteText;
}

interface CounterAnimationProps {
    current?: number;
    target: number;
    duration: number;
    ease?: gsap.EaseString | gsap.EaseFunction;
    currency: string;
    startScale?: { x: number, y: number };
    endScale?: { x: number, y: number };
}

export class Counter {
    protected _amountText: Text | SpriteText;
    protected _currentAmount: number = 0;
    protected _targetAmount: number = 1000;
    protected _duration: number = 5;
    protected _ease: gsap.EaseString | gsap.EaseFunction = "power1.out";
    protected _currency: string = "$";
    protected _startScale: { x: number, y: number } = { x: 0.5, y: 0.5 };
    protected _endScale: { x: number, y: number } = { x: 1, y: 1 };

    protected _tweenObj: { value: number } = { value: 0 };
    protected _resolveCounter?: () => void;

    /**
     * @description Creates a Counter instance to animate numerical text changes.
     */
    constructor({ text }: CounterProps) {
        this._amountText = text;
    }

    /**
     * @description Play the counter animation.
     * @param parameters The animation parameters such as current, target, duration and ease.
     * Current is the starting value. Target is the ending value.
     * @returns A promise that resolves when the animation is complete.
     */
    public playCounterAnimation({ current, target, duration, ease, currency, startScale, endScale }: CounterAnimationProps): Promise<void> {
        this._currentAmount = current ?? 0;
        this._targetAmount = target;
        this._duration = duration;
        this._ease = ease ?? "power1.out";
        this._currency = currency;
        this._startScale = startScale ?? { x: 1, y: 1 };
        this._endScale = endScale ?? { x: 1, y: 1 };

        return new Promise((resolve) => {
            this._resolveCounter = resolve;

            if (this._amountText instanceof Text) {
                this._amountText.text = this._currentAmount.toString();
            } else {
                this._amountText.setText(currency + this._currentAmount.toString());
            }

            this._tweenObj = { value: this._currentAmount };

            gsap.to(this._tweenObj, {
                value: this._targetAmount,
                duration: this._duration,
                ease: this._ease,
                onStart: () => {
                    gsap.fromTo(this._amountText.scale, {
                        x: this._startScale.x,
                        y: this._startScale.y
                    }, {
                        x: this._endScale.x,
                        y: this._endScale.y,
                        duration: this._duration,
                        ease: this._ease
                    });
                },
                onUpdate: () => {
                    if (this._amountText instanceof Text) {
                        this._amountText.text = Helpers.convertToDecimal(Math.floor(this._tweenObj.value)) as string;
                    } else {
                        this._amountText.setText(currency + Helpers.convertToDecimal(Math.floor(this._tweenObj.value)) as string);
                    }
                },
                onComplete: () => {
                    gsap.to(this._amountText.scale, {
                        x: this._endScale.x,
                        y: this._endScale.y,
                        duration: 0.25,
                        ease: "back.out(2)"
                    });

                    this.stopCounterAnimation();

                    resolve();
                    this._resolveCounter = undefined;
                }
            });
        });
    }

    /**
     * @description Skip the counter animation.
     */
    public skipCounterAnimation(): void {
        this._resolveCounter?.();
        this._resolveCounter = undefined;

        this.stopCounterAnimation();
    }

    /**
     * @description Stop the counter animation.
     */
    public stopCounterAnimation(): void {
        gsap.killTweensOf(this._tweenObj);
        gsap.killTweensOf(this._amountText.scale);

        gsap.to(this._amountText.scale, {
            x: this._endScale.x,
            y: this._endScale.y,
            duration: 0.25,
            ease: "back.out(2)"
        });

        if (this._tweenObj.value < this._targetAmount) {
            if (this._amountText instanceof Text) {
                this._amountText.text = `${this._currency}${Helpers.convertToDecimal(this._targetAmount) as string}`;
            } else {
                this._amountText.setText(`${this._currency}${Helpers.convertToDecimal(this._targetAmount) as string}`);
            }
        }
    }
}