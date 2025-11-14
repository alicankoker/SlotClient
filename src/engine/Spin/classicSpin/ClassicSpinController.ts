import { eventBus } from "../../../communication/EventManagers/WindowEventManager";
import { GameConfig } from "../../../config/GameConfig";
import { SpinConfig } from "../../../config/SpinConfig";
import { GameServer } from "../../../server/GameServer";
import { AutoPlayController } from "../../AutoPlay/AutoPlayController";
import { AnimationContainer } from "../../components/AnimationContainer";
import { Bonus } from "../../components/Bonus";
import { GameDataManager } from "../../data/GameDataManager";
import { FreeSpinController } from "../../freeSpin/FreeSpinController";
import { IReelMode } from "../../reels/ReelController";
import { StaticContainer } from "../../reels/StaticContainer";
import { GridData, IResponseData, SpinResponseData, SpinResultData } from "../../types/ICommunication";
import { ISpinState, SpinMode } from "../../types/ISpinConfig";
import { BackendToWinEventType, WinEventType } from "../../types/IWinEvents";
import { debug } from "../../utils/debug";
import { Utils } from "../../utils/Utils";
import { SpinContainer } from "../SpinContainer";
import { SpinController, SpinControllerConfig } from "../SpinController";
import { ClassicSpinContainer } from "./ClassicSpinContainer";

export class ClassicSpinController extends SpinController {
  constructor(container: SpinContainer, config: SpinControllerConfig) {
    super(container, config);
  }

  // Main spin orchestration methods
  public async executeSpin(): Promise<IResponseData> {
    if (this.currentState !== "idle") {
      const error = `SpinController: Cannot start spin - current state is ${this.currentState}`;
      debug.warn(error);
      this.handleError(error);
    }

    this._abortController = new AbortController();
    const signal = this._abortController.signal;

    this._isForceStopped = false;

    try {
      this.reelsController.resetWinAnimations();

      this.setState(ISpinState.SPINNING);

      this.reelsController.getReelsContainer().setChainAnimation(true, true, true); // TODO: it must update for each reels and it should be getting slow down accordingly

      if (this.onSpinStartCallback) {
        this.onSpinStartCallback();
      }

      eventBus.emit("setWinBox");
      if (FreeSpinController.instance().isRunning !== false && AutoPlayController.instance().isRunning !== false) {
        eventBus.emit("setMessageBox", { variant: "default", message: "GOOD LUCK!" });
      }

      eventBus.emit('setComponentState', {
        componentName: 'spinButton',
        stateOrUpdates: 'spinning',
      });

      // Simulate server request (replace with actual server call)
      const response: IResponseData = GameDataManager.getInstance().getResponseData();

      if (!response) {
        this.handleError(response || "Unknown server error");
        throw new Error("SpinController: No response from server");
      }

      const initialGrid = GameDataManager.getInstance().getSymbolsBeforeSpin()!;

      await this.transferSymbolsToSpinContainer(initialGrid);

      const finalGrid = response.reels;

      this.onSpinCompleteCallback = async (response: IResponseData) => {
        FreeSpinController.instance().isRunning === false && (FreeSpinController.instance().isRunning = GameDataManager.getInstance().checkFreeSpins());
        Bonus.instance().isActive = response.bonus ? true : false;

        eventBus.emit('setComponentState', {
          componentName: 'spinButton',
          stateOrUpdates: 'default',
        });

        this.reelsController.getReelsContainer().setChainAnimation(false, false, false);

        await this.transferSymbolsToStaticContainer(finalGrid);

        if (GameConfig.WIN_EVENT.enabled && response.winEventType !== 'normal') {
          const winAmount = response.totalWin;
          const backendType = response.winEventType;
          const enumType = BackendToWinEventType[backendType]!;

          await AnimationContainer.getInstance().playWinEventAnimation(winAmount, enumType);
        }

        const isSkipped = GameDataManager.getInstance().isWinAnimationSkipped && ((AutoPlayController.instance().isRunning && AutoPlayController.instance().autoPlayCount > 0) || (FreeSpinController.instance().isRunning === true));
        GameConfig.WIN_ANIMATION.enabled && await this.reelsController.setupWinAnimation(isSkipped);

        eventBus.emit("setBalance", response.balance.after);

        return;
      }

      this._soundManager.play("spin", true, 0.75); // Play spin sound effect

      this.startSpinAnimation(response);

      if (this._spinMode === GameConfig.SPIN_MODES.NORMAL) {
        await Utils.delay(SpinConfig.REEL_SPEED_UP_DURATION);
        await Utils.delay(SpinConfig.SPIN_DURATION, signal);
        (this.container as ClassicSpinContainer).slowDown();

        this._isForceStopped === false && this.reelsController.slowDown();

        await Utils.delay(SpinConfig.REEL_SLOW_DOWN_DURATION, signal);
      } else if (this._spinMode === GameConfig.SPIN_MODES.FAST) {
        await Utils.delay(SpinConfig.FAST_SPIN_SPEED);
      } else {
        await Utils.delay(SpinConfig.TURBO_SPIN_SPEED);
      }

      //this.container.setMode(IReelMode.STOPPING);
      //this.container.stopSpin();

      this._soundManager.stop("spin");
      this._soundManager.play("stop", false, 0.75); // Play stop sound effect

      //await this.reelsController.setMode(ISpinState.IDLE);
      this.setState(ISpinState.IDLE);

      await this.onSpinCompleteCallback(response);

      return response;
    } catch (error) {
      debug.error("SpinController: Spin execution error", error);
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      this.handleError(errorMessage);
      console.log("Error during spin execution:", errorMessage);
      throw error;
    }
  }

  public startSpinAnimation(spinData: IResponseData): void {
    (this.container as ClassicSpinContainer).startSpin(spinData);
  }

  // Symbol transfer methods
  protected async transferSymbolsToSpinContainer(initialGrid: number[][]): Promise<void> {
    debug.log("SpinController: Transferring symbols from StaticContainer to SpinContainer");

    const reelsContainer = this.reelsController.getReelsContainer();
    if (!reelsContainer) {
      debug.error("SpinController: No reels container available for symbol transfer");
      return;
    }

    const staticContainer = reelsContainer?.getStaticContainer();
    const spinContainer = this.container;

    if (!staticContainer || !spinContainer) {
      debug.error("SpinController: Missing containers for symbol transfer");
      return;
    }

    debug.log("SpinController: StaticContainer hidden and cleared");
    staticContainer.visible = false;

    // Show spin container and display initial grid
    spinContainer.visible = true;

    if (spinContainer instanceof SpinContainer) {
      debug.log("SpinController: Displaying initial grid on SpinContainer: ", initialGrid);
      await spinContainer.displayInitialGrid(initialGrid);
      debug.log("SpinController: Initial grid displayed on SpinContainer");
    }
  }
}
