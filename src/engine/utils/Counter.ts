import { Text } from "pixi.js";
import { gsap } from "gsap";
import { Helpers } from "./Helpers";

interface CounterProps {
    text: Text;
}

interface CounterAnimationProps {
    current?: number;
    target: number;
    duration: number;
    ease?: gsap.EaseString | gsap.EaseFunction;
}

export class Counter {
    protected _amountText: Text;
    protected _currentAmount: number = 0;
    protected _targetAmount: number = 1000;
    protected _duration: number = 5;
    protected _ease: gsap.EaseString | gsap.EaseFunction = "power1.out";

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
    public playCounterAnimation({ current, target, duration, ease }: CounterAnimationProps): Promise<void> {
        this._currentAmount = current ?? 0;
        this._targetAmount = target;
        this._duration = duration;
        this._ease = ease ?? "power1.out";

        return new Promise((resolve) => {
            this._resolveCounter = resolve;

            this._amountText.text = this._currentAmount.toString();

            this._tweenObj = { value: this._currentAmount };

            gsap.to(this._tweenObj, {
                value: this._targetAmount,
                duration: this._duration,
                ease: this._ease,
                onStart: () => {
                    gsap.fromTo(this._amountText.scale, {
                        x: 0.5,
                        y: 0.5
                    }, {
                        x: 1,
                        y: 1,
                        duration: this._duration,
                        ease: this._ease
                    });
                },
                onUpdate: () => {
                    this._amountText.text = `$${Helpers.convertToDecimal(Math.floor(this._tweenObj.value)) as string}`;
                },
                onComplete: () => {
                    gsap.to(this._amountText.scale, {
                        x: 1,
                        y: 1,
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
            x: 1,
            y: 1,
            duration: 0.25,
            ease: "back.out(2)"
        });

        if (this._tweenObj.value < this._targetAmount) {
            this._amountText.text = `$${Helpers.convertToDecimal(this._targetAmount) as string}`;
        }
    }
}