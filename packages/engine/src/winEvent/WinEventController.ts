import { gsap } from "gsap";
import { SIGNAL_EVENTS, signals } from "../controllers/SignalManager";
import { debug } from "../utils/debug";
import { WinEventContainer } from "./WinEventContainer";
import { WinEventType } from "../types/IWinEvents";

export abstract class WinEventController<T extends WinEventContainer> {
    protected view: T;
    private _onSkip: () => void;
    private onWinEventCompleteCallback?: () => void;

    constructor(view: T) {
        this.view = view;
        this._onSkip = this.skipWinEvent.bind(this);
    }

    public async showWinEvent(amount: number, type: WinEventType): Promise<void> {
        if (this.view.isWinEventActive) return;

        this.view.targetWinAmount = amount;
        this.view.winEventType = Object.values(WinEventType).indexOf(type);

        this.view.app.canvas.onpointerdown = this._onSkip;
        window.addEventListener("keydown", (e: KeyboardEvent) => {
            if (e.code === "Space") {
                this._onSkip();
            }
        }, { once: true });

        debug.log("WinEvent", "Win Event animation started.");

        gsap.to(this.view, {
            alpha: 1,
            duration: 0.25,
            ease: "none",
            onStart: () => {
                this.view.visible = true;
            }
        });

        await this.view.beforeWinEvent();
        (this.view as any)._isAnimating = true;
        (this.view as any)._isWinEventSkipped = false;

        signals.emit(SIGNAL_EVENTS.WIN_EVENT_STARTED);

        this.view.playWinEventAnimation();
        this.view.playCoinAnimation();
        await this.view.playCounterAnimation();
        this.view.stopCoinAnimation();

        await this.stopWinEventAnimation();

        signals.emit(SIGNAL_EVENTS.WIN_EVENT_STOPPED);

        await this.view.afterWinEvent();
    }

    protected skipWinEvent(): void {
        this.view.skipWinEvent();
    }

    protected async stopWinEventAnimation(): Promise<void> {        
        this.view.app.canvas.onpointerdown = null;
        window.removeEventListener("keydown", this._onSkip);

        return new Promise((resolve) => {
            const hideWinEvent = async () => {
                this.view.app.canvas.onpointerdown = null;
                window.removeEventListener("keydown", hideWinEvent);

                if (this.onWinEventCompleteCallback) {
                    this.onWinEventCompleteCallback();
                }

                gsap.to(this.view, {
                    alpha: 0,
                    duration: 0.25,
                    ease: "none",
                    onComplete: () => {
                        this.view.resetScene().then(() => {
                            debug.log("WinEvent", "Win Event animation stopped.");
                            resolve();
                        });
                    },
                });
            };

            this.view.app.canvas.onpointerdown = hideWinEvent;
            window.addEventListener("keydown", (key) => {
                if (key.code === "Space") {
                    hideWinEvent();
                }
            });
        });
    }

    public onWinEventComplete(callback: () => void): void {
        this.onWinEventCompleteCallback = callback;
    }
}