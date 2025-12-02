import type { ISlotGameController } from "@slotclient/types/ISlotGameController";
import { eventBus } from "@slotclient/types";
import { signals, SIGNAL_EVENTS } from "../controllers/SignalManager";
import { GameDataManager } from "../data/GameDataManager";
import { Helpers } from "../utils/Helpers";

export class FreeSpinController {
    private static _instance: FreeSpinController;
    private slotGameController: ISlotGameController;
    private totalWin: number = 0;
    private totalFreeSpins: number = 0;
    private remainingSpins: number = 0;
    private isActive: boolean = false;

    private resolvePromise?: (value: { totalWin: number, freeSpinCount: number }) => void;
    private rejectPromise?: (reason?: any) => void;

    private constructor(slotGameController: ISlotGameController) {
        this.slotGameController = slotGameController;
    }

    public static getInstance(slotGameController: ISlotGameController): FreeSpinController {
        if (!FreeSpinController._instance) {
            FreeSpinController._instance = new FreeSpinController(slotGameController);
        }
        return FreeSpinController._instance;
    }

    public static instance(): FreeSpinController {
        return FreeSpinController._instance;
    }

    /**
     * @description Executes the free spin sequence with the given count.
     * @param ramainRounds 
     * @returns Promise<void>
     */
    public async executeFreeSpin(totalRounds: number, remainRounds: number, initialWin: number): Promise<{ totalWin: number, freeSpinCount: number }> {
        this.totalFreeSpins = totalRounds;
        this.remainingSpins = remainRounds;
        this.totalWin = initialWin;

        signals.emit(SIGNAL_EVENTS.FREE_SPIN_STARTED, {
            total: this.remaining,
        });

        return new Promise<{ totalWin: number, freeSpinCount: number }>((resolve, reject) => {
            this.resolvePromise = () => resolve({ totalWin: this.totalWin, freeSpinCount: this.totalFreeSpins });
            this.rejectPromise = reject;
            this.playNext();
        });
    }

    /**
     * @description Plays the next free spin in the sequence.
     * @returns Promise<void>
     */
    private async playNext(): Promise<void> {
        if (!this.isActive || this.remainingSpins <= 0) {
            this.complete();
            return;
        }

        const currentIndex = this.totalFreeSpins - this.remainingSpins + 1;

        signals.emit(SIGNAL_EVENTS.FREE_SPIN_BEFORE_SPIN, {
            current: currentIndex,
            remaining: this.remainingSpins,
        });

        await Helpers.delay(1000);

        eventBus.emit("setMessageBox", { variant: "freeSpin", message: (this.remainingSpins - 1).toString() });

        await this.slotGameController.executeGameSpin('freeSpin');

        signals.once("spinCompleted", async (response) => {
            this.totalWin = response.freeSpin?.featureWin || 0;

            eventBus.emit("setWinBox", { variant: "default", amount: Helpers.convertToDecimal(this.totalWin) as string });

            this.remainingSpins--;

            if (response && response.freeSpin && response.freeSpin.extraRounds > 0) {
                await this.addExtraFreeSpins(response.freeSpin.extraRounds);
            }

            signals.emit(SIGNAL_EVENTS.FREE_SPIN_AFTER_SPIN, {
                remaining: this.remainingSpins,
                total: this.totalFreeSpins,
            });

            if (this.remainingSpins > 0 && this.isActive) {
                await this.playNext();
            } else {
                this.complete();
            }
        });
    }

    /**
     * @description Adds extra free spins to the current session.
     * @param extraCount The number of extra free spins to add.
     * @returns Promise<void>
     */
    private async addExtraFreeSpins(extraCount: number): Promise<void> {
        this.totalFreeSpins += extraCount;
        this.remainingSpins += extraCount;

        signals.emit(SIGNAL_EVENTS.FREE_SPIN_RETRIGGER, {
            added: extraCount,
            newTotal: this.totalFreeSpins,
            remaining: this.remainingSpins,
        });

        await new Promise<void>((resolve) => {
            signals.once(SIGNAL_EVENTS.FREE_SPIN_RETRIGGERED, () => resolve());
        });

        eventBus.emit("setMessageBox", { variant: "freeSpin", message: (this.remainingSpins - 1).toString() });
    }

    /**
     * @description Completes the free spin session and resolves the promise.
     * @returns Promise<void>
     */
    private async complete(): Promise<{ totalWin: number, freeSpinCount: number }> {
        signals.emit(SIGNAL_EVENTS.FREE_SPIN_COMPLETED, {
            total: this.totalFreeSpins,
            totalWin: this.totalWin,
        });

        eventBus.emit("setMessageBox");

        if (this.resolvePromise) {
            this.resolvePromise({ totalWin: this.totalWin, freeSpinCount: this.totalFreeSpins });
            this.resolvePromise = undefined;
            this.rejectPromise = undefined;
        }

        return { totalWin: this.totalWin, freeSpinCount: this.totalFreeSpins };
    }

    /**
     * @description Stops the free spin session manually.
     * @returns Promise<void>
     */
    public stop(): Promise<void> {
        if (!this.isActive) return Promise.resolve();

        if (this.rejectPromise) {
            this.rejectPromise("Free spins manually stopped.");
        }

        signals.emit(SIGNAL_EVENTS.FREE_SPIN_COMPLETED, {
            total: this.totalFreeSpins,
        });

        return Promise.resolve();
    }

    public get isRunning(): boolean {
        return this.isActive;
    }

    public set isRunning(value: boolean) {
        GameDataManager.getInstance().isFreeSpinning = value;
        this.isActive = value;
    }

    public get remaining(): number {
        return this.remainingSpins;
    }
}