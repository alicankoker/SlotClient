import { AnimationContainer } from "../components/AnimationContainer";
import { signals, SIGNAL_EVENTS } from "../controllers/SignalManager";
import { SpinController } from "../Spin/SpinController";

export class FreeSpinController {
    private spinController: SpinController;
    private animationContainer: AnimationContainer;
    private totalFreeSpins: number = 0;
    private remainingSpins: number = 0;
    private isActive: boolean = false;

    constructor(spinController: SpinController) {
        this.spinController = spinController;
        this.animationContainer = AnimationContainer.getInstance();
    }

    public executeFreeSpin(freeSpinCount: number): void {
        this.totalFreeSpins = freeSpinCount;
        this.remainingSpins = freeSpinCount;
        this.isActive = true;

        this.animationContainer.getFreeSpinCountText().visible = true;
        this.animationContainer.getFreeSpinCountText().text = this.remainingSpins.toString();

        signals.emit(SIGNAL_EVENTS.FREE_SPIN_STARTED, {
            total: this.totalFreeSpins,
        });

        this.playNext();
    }

    private async playNext(): Promise<void> {
        if (!this.isActive || this.remainingSpins <= 0) {
            this.complete();
            return;
        }

        const currentIndex = this.totalFreeSpins - this.remainingSpins + 1;

        this.animationContainer.getFreeSpinCountText().text = this.remainingSpins.toString();

        signals.emit(SIGNAL_EVENTS.FREE_SPIN_BEFORE_SPIN, {
            current: currentIndex,
            remaining: this.remainingSpins,
        });

        const response = await this.spinController.executeSpin();

        if (response?.result?.extraFreeSpins && response.result.extraFreeSpins > 0) {
            await this.addExtraFreeSpins(response.result.extraFreeSpins);
        }

        this.remainingSpins--;

        signals.emit(SIGNAL_EVENTS.FREE_SPIN_AFTER_SPIN, {
            remaining: this.remainingSpins,
            total: this.totalFreeSpins,
        });

        if (this.remainingSpins > 0) {
            this.playNext();
        } else {
            this.complete();
        }
    }

    private async addExtraFreeSpins(extraCount: number): Promise<void> {
        this.totalFreeSpins += extraCount;
        this.remainingSpins += extraCount;

        this.animationContainer.getPopupText().text = `You won ${extraCount} extra Free Spins!`;

        await this.animationContainer.playFreeSpinPopupAnimation();

        this.animationContainer.getFreeSpinCountText().text = this.remainingSpins.toString();

        signals.emit(SIGNAL_EVENTS.FREE_SPIN_RETRIGGER, {
            added: extraCount,
            newTotal: this.totalFreeSpins,
            remaining: this.remainingSpins,
        });
    }

    private complete(): void {
        this.isActive = false;

        this.animationContainer.getFreeSpinCountText().visible = false;

        signals.emit(SIGNAL_EVENTS.FREE_SPIN_COMPLETED, {
            total: this.totalFreeSpins,
        });
    }

    public stop(): void {
        this.isActive = false;
    }

    public get isRunning(): boolean {
        return this.isActive;
    }

    public get remaining(): number {
        return this.remainingSpins;
    }
}