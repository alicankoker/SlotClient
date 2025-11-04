import { GameServer } from "../../server/GameServer";
import { AnimationContainer } from "../components/AnimationContainer";
import { signals, SIGNAL_EVENTS } from "../controllers/SignalManager";
import { GameDataManager } from "../data/GameDataManager";
import { SpinController } from "../Spin/SpinController";
import { Helpers } from "../utils/Helpers";

export class FreeSpinController {
    private static instance: FreeSpinController;
    private spinController: SpinController;
    private animationContainer: AnimationContainer;
    private totalWin: number = 0;
    private totalFreeSpins: number = 0;
    private remainingSpins: number = 0;
    private isActive: boolean = false;

    private resolvePromise?: (value: { totalWin: number, freeSpinCount: number }) => void;
    private rejectPromise?: (reason?: any) => void;

    private constructor(spinController: SpinController) {
        this.spinController = spinController;
        this.animationContainer = AnimationContainer.getInstance();
    }

    public static getInstance(spinController: SpinController): FreeSpinController {
        if (!FreeSpinController.instance) {
            FreeSpinController.instance = new FreeSpinController(spinController);
        }
        return FreeSpinController.instance;
    }

    /**
     * @description Executes the free spin sequence with the given count.
     * @param freeSpinCount 
     * @returns Promise<void>
     */
    public async executeFreeSpin(freeSpinCount: number, initialWin: number): Promise<{ totalWin: number, freeSpinCount: number }> {
        this.totalFreeSpins = freeSpinCount;
        this.remainingSpins = freeSpinCount;
        this.totalWin = initialWin;

        signals.emit(SIGNAL_EVENTS.FREE_SPIN_STARTED, {
            total: this.totalFreeSpins,
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

        const response = await GameServer.getInstance().processSpinRequest({
            betAmount: 0,
            gameMode: "freespin",
            forcedFS: false
        });

        this.totalWin += response.result?.steps[0].wins.reduce((acc, win) => acc + win.match.winAmount, 0) || 0;

        console.log("Free Spin Total Win:", this.totalWin);

        GameDataManager.getInstance().setSpinData(response);

        this.animationContainer.getFreeSpinRemainText().text = `FREESPIN ${(this.remainingSpins - 1).toString()} REMAINING`;

        await this.spinController.executeSpin();

        if (response?.result?.extraFreeSpins && response.result.extraFreeSpins > 0) {
            await this.addExtraFreeSpins(response.result.extraFreeSpins);
        }

        this.remainingSpins--;

        signals.emit(SIGNAL_EVENTS.FREE_SPIN_AFTER_SPIN, {
            remaining: this.remainingSpins,
            total: this.totalFreeSpins,
        });

        if (this.remainingSpins > 0 && this.isActive) {
            await this.playNext();
        } else {
            this.complete();
        }
    }

    /**
     * @description Adds extra free spins to the current session.
     * @param extraCount The number of extra free spins to add.
     * @returns Promise<void>
     */
    private async addExtraFreeSpins(extraCount: number): Promise<void> {
        this.totalFreeSpins += extraCount;
        this.remainingSpins += extraCount;

        this.animationContainer.getPopupCountText().text = `${extraCount}`;
        this.animationContainer.getPopupFreeSpinsText().text = `EXTRA FREESPINS!`;

        await this.animationContainer.playFreeSpinPopupAnimation();

        this.animationContainer.getFreeSpinRemainText().text = `FREESPIN ${(this.remainingSpins - 1).toString()} REMAINING`;

        signals.emit(SIGNAL_EVENTS.FREE_SPIN_RETRIGGER, {
            added: extraCount,
            newTotal: this.totalFreeSpins,
            remaining: this.remainingSpins,
        });
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

        this.animationContainer.getFreeSpinRemainContainer().visible = false;
        this.animationContainer.getFreeSpinRemainText().text = ``;

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
        this.isActive = value;
    }

    public get remaining(): number {
        return this.remainingSpins;
    }
}