import { gsap } from "gsap";
import { SIGNAL_EVENTS, signals } from "../controllers/SignalManager";
import { debug } from "../utils/debug";
import { WinEventContainer } from "./WinEventContainer";
import { WinEventType } from "../types/IWinEvents";

export abstract class WinEventController<T extends WinEventContainer> {
    protected view: T;
    private _onSkip: () => void;

    constructor(view: T) {
        this.view = view;
        this._onSkip = this.skipWinEvent.bind(this);
    }

    public async showWinEvent(amount: number, type: WinEventType): Promise<void> {
        if (this.view.isWinEventActive) return;

        this.view.targetWinAmount = amount;
        this.view.winEventType = Object.values(WinEventType).indexOf(type);

        window.addEventListener("click", this._onSkip, { once: true });

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
        window.removeEventListener("click", this._onSkip);
        
        return new Promise((resolve) => {
            gsap.to(this.view, {
                alpha: 0,
                duration: 0.25,
                ease: "none",
                delay: 2,
                onComplete: () => {
                    this.view.resetScene().then(() => {
                        debug.log("WinEvent", "Win Event animation stopped.");
                        resolve();
                    });
                },
            });
        });
    }
}