import { GameConfig } from "@slotclient/config/GameConfig";
import { GameDataManager } from "../data/GameDataManager";
import { debug } from "../utils/debug";
import { signals } from "../controllers/SignalManager";

export class AutoPlayController {
    private static _instance: AutoPlayController;

    protected _autoPlayCount: number = 0;
    protected _autoPlayed: number = 0;
    protected _isAutoPlaying: boolean = false;
    protected _autoPlayDuration: number = GameConfig.AUTO_PLAY.delay || 1000;
    protected _autoPlayTimeoutID: ReturnType<typeof setTimeout> | null = null;

    private constructor() {
        this.eventListeners();
    }

    public static getInstance(): AutoPlayController {
        if (!AutoPlayController._instance) {
            AutoPlayController._instance = new AutoPlayController();
        }
        return AutoPlayController._instance;
    }

    public static instance(): AutoPlayController {
        return AutoPlayController._instance;
    }

    private eventListeners(): void {
        signals.on("socketError", () => {
            if (this._isAutoPlaying) {
                this.stopAutoPlay();
            }
        });
    }

    /**
     * @description Start auto play with a specified count.
     * @param count The number of spins to auto play.
     * @returns A promise that resolves when auto play starts.
     */
    public async startAutoPlay(count: number): Promise<void> {
        if (this._isAutoPlaying || GameDataManager.getInstance().isSpinning) {
            return;
        }

        this._autoPlayCount = count;
        this._autoPlayed = 0;
        this._isAutoPlaying = true;
        GameDataManager.getInstance().isAutoPlaying = true;

        signals.emit("setBatchComponentState", {
            componentNames: ['autoplayButton', 'mobileAutoplayButton'],
            stateOrUpdates: 'spinning',
        })
        signals.emit("setBatchComponentState", {
            componentNames: ['mobileBetButton', 'betButton', 'settingsButton', 'creditButton'],
            stateOrUpdates: { disabled: true }
        });
        signals.emit("setMessageBox", { variant: "autoPlay", message: this._autoPlayCount.toString() });

        void this.continueAutoPlay();

        debug.log("Auto play started with count:", this._autoPlayCount);
    }

    //TO-DO: This needs to be moved to somewhere else
    /**
     * @description Continue auto play if conditions are met.
     * @returns True if auto play continues, false otherwise.
     */
    public async continueAutoPlay(): Promise<boolean> {
        if (!this._isAutoPlaying || GameDataManager.getInstance().isSpinning || this._autoPlayCount <= 0) {
            this.stopAutoPlay();
            return false;
        }

        // Set up the auto play timeout
        this._autoPlayTimeoutID = setTimeout(() => {
            signals.emit('startSpin', 'spin');

            signals.once("spinCompleted", (spinResult) => {
                if ((spinResult as boolean) === false) {
                    this.stopAutoPlay();
                    return;
                }

                this._autoPlayCount -= 1;
                this._autoPlayed += 1;

                this._autoPlayCount > 0 && signals.emit("setMessageBox", { variant: "autoPlay", message: this._autoPlayCount.toString() });

                debug.log("Continuing auto play, remaining count:", this._autoPlayCount);
            });
        }, this._autoPlayDuration);

        return true;
    }

    /**
     * @description Stop auto play.
     */
    public stopAutoPlay(): void {
        if (!this._isAutoPlaying) {
            return;
        }

        this._autoPlayCount = 0;
        this._autoPlayed = 0;
        this._isAutoPlaying = false;

        GameDataManager.getInstance().isAutoPlaying = false;

        signals.emit("setBatchComponentState", {
            componentNames: ['autoplayButton', 'mobileAutoplayButton'],
            stateOrUpdates: 'default',
        });

        signals.emit("setBatchComponentState", {
            componentNames: ['mobileBetButton', 'betButton', 'settingsButton', 'creditButton'],
            stateOrUpdates: { disabled: false }
        });

        signals.emit("setMessageBox");

        if (this._autoPlayTimeoutID) {
            clearTimeout(this._autoPlayTimeoutID);
            this._autoPlayTimeoutID = null;
        }

        debug.log("Auto play stopped");
    }

    public get isRunning(): boolean {
        return this._isAutoPlaying;
    }

    public get autoPlayCount(): number {
        return this._autoPlayCount;
    }

    public get autoPlayedCount(): number {
        return this._autoPlayed;
    }
}