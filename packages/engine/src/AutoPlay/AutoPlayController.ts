import type { ISlotGameController } from "@slotclient/types/ISlotGameController";
import { eventBus } from "@slotclient/types";
import { GameDataManager } from "../data/GameDataManager";
import { ReelsController } from "../reels/ReelsController";
import { debug } from "../utils/debug";
import { signals } from "../controllers/SignalManager";
import { ConfigProvider, IGameConfig } from "@slotclient/config";

export class AutoPlayController {
    private static _instance: AutoPlayController;

    private _slotGameController: ISlotGameController
    private _reelsController: ReelsController;
    private _gameConfig: IGameConfig;
    protected _autoPlayCount: number = 0;
    protected _autoPlayed: number = 0;
    protected _isAutoPlaying: boolean = false;
    protected _autoPlayDuration: number = 1000;
    protected _autoPlayTimeoutID: ReturnType<typeof setTimeout> | null = null;

    private constructor(slotGameController: ISlotGameController, reelsController: ReelsController) {
        this._slotGameController = slotGameController;
        this._reelsController = reelsController;
        this._gameConfig = ConfigProvider.getInstance().getGameConfig();

        this._autoPlayDuration = this._gameConfig.AUTO_PLAY.delay || 1000;

        this.eventListeners();
    }

    public static getInstance(slotGameController: ISlotGameController, reelsController: ReelsController): AutoPlayController {
        if (!AutoPlayController._instance) {
            AutoPlayController._instance = new AutoPlayController(slotGameController, reelsController);
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
        if (this._isAutoPlaying || this._reelsController.getIsSpinning()) {
            return;
        }

        this._autoPlayCount = count;
        this._autoPlayed = 0;
        this._isAutoPlaying = true;
        GameDataManager.getInstance().isAutoPlaying = true;

        eventBus.emit("setBatchComponentState", {
            componentNames: ['autoplayButton', 'mobileAutoplayButton'],
            stateOrUpdates: 'spinning',
        })
        eventBus.emit("setBatchComponentState", {
            componentNames: ['mobileBetButton', 'betButton', 'settingsButton', 'creditButton'],
            stateOrUpdates: { disabled: true }
        });
        eventBus.emit("setMessageBox", { variant: "autoPlay", message: this._autoPlayCount.toString() });

        const staticContainer = this._reelsController.getStaticContainer();
        if (staticContainer) staticContainer.allowLoop = false; // Disable looped win animation during auto play

        void this.continueAutoPlay();

        debug.log("Auto play started with count:", this._autoPlayCount);
    }

    //TO-DO: This needs to be moved to somewhere else
    /**
     * @description Continue auto play if conditions are met.
     * @returns True if auto play continues, false otherwise.
     */
    public async continueAutoPlay(): Promise<boolean> {
        if (!this._isAutoPlaying || this._reelsController.getIsSpinning() || this._autoPlayCount <= 0) {
            this.stopAutoPlay();
            return false;
        }

        // Set up the auto play timeout
        this._autoPlayTimeoutID = setTimeout(async () => {
            const spinResult = await this._slotGameController.executeGameSpin('spin');
            
            if (spinResult === false) {
                this.stopAutoPlay();
                return;
            }

            this._autoPlayCount -= 1;
            this._autoPlayed += 1;

            this._autoPlayCount > 0 && eventBus.emit("setMessageBox", { variant: "autoPlay", message: this._autoPlayCount.toString() });

            if (this._autoPlayCount <= 0) {
                const staticContainer = this._reelsController.getStaticContainer();
                // Re-enable looped win animation after last auto play spin
                if (staticContainer) staticContainer.allowLoop = this._gameConfig.WIN_ANIMATION.winLoop ?? true;
            }

            debug.log("Continuing auto play, remaining count:", this._autoPlayCount);
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

        eventBus.emit("setBatchComponentState", {
            componentNames: ['autoplayButton', 'mobileAutoplayButton'],
            stateOrUpdates: 'default',
        });
        eventBus.emit("setBatchComponentState", {
            componentNames: ['mobileBetButton', 'betButton', 'settingsButton', 'creditButton'],
            stateOrUpdates: { disabled: false }
        });
        eventBus.emit("setMessageBox");

        const staticContainer = this._reelsController.getStaticContainer();
        // Re-enable looped win animation after auto play stops
        if (staticContainer)
            staticContainer.allowLoop = this._gameConfig.WIN_ANIMATION.winLoop ?? true;

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