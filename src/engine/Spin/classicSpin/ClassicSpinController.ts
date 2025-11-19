import { eventBus } from "../../../communication/EventManagers/WindowEventManager";
import { GameConfig } from "../../../config/GameConfig";
import { SpinConfig } from "../../../config/SpinConfig";
import { GameServer } from "../../../server/GameServer";
import { AutoPlayController } from "../../AutoPlay/AutoPlayController";
import { AnimationContainer } from "../../components/AnimationContainer";
import { Bonus } from "../../components/Bonus";
import { signals } from "../../controllers/SignalManager";
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

    this.eventListeners();
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

      this.reelsController.getReelsContainer().setChainAnimation(true, true); // TODO: it must update for each reels and it should be getting slow down accordingly

      if (this.onSpinStartCallback) {
        this.onSpinStartCallback();
      }

      if (FreeSpinController.instance().isRunning === false) {
        eventBus.emit("setWinBox");
        AutoPlayController.instance().isRunning === false && eventBus.emit("setMessageBox", { variant: "default", message: "GOOD LUCK!" });
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

      await this.setSymbolsToSpinContainer(this._symbols);

      this._symbols = response.reels;

      this._soundManager.play("spin", true, 0.75); // Play spin sound effect

      this.startSpinAnimation(response);

      if (this._spinMode === GameConfig.SPIN_MODES.NORMAL || FreeSpinController.instance().isRunning) {
        console.log("Normal spin mode delay");
        await Utils.delay(SpinConfig.REEL_SPEED_UP_DURATION);
        console.log("Slowing down reels");
        await Utils.delay(SpinConfig.SPIN_DURATION, signal);
        console.log("Initiating reel slow down");
        (this.container as ClassicSpinContainer).slowDown();

        //this._isForceStopped === false && this.reelsController.slowDown();

        console.log("Waiting for reel slow down duration");
        await Utils.delay(SpinConfig.REEL_SLOW_DOWN_DURATION, signal);
      } else if (this._spinMode === GameConfig.SPIN_MODES.FAST) {
        console.log("Fast spin mode delay");
        await Utils.delay(SpinConfig.FAST_SPIN_SPEED);
        console.log("Initiating reel slow down");
      } else {
        console.log("Turbo spin mode delay");
        await Utils.delay(SpinConfig.TURBO_SPIN_SPEED);
        console.log("Initiating reel slow down");
      }

      console.log("Starting reel stop sequence");
      (this.container as ClassicSpinContainer).startStopSequence();
      console.log("Started reel stop sequence");
      (this._spinMode === GameConfig.SPIN_MODES.NORMAL || FreeSpinController.instance().isRunning) && await Utils.delay(SpinConfig.REEL_STOPPING_DURATION);
      console.log("Reel stop sequence completed");
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

  private eventListeners(): void {
    signals.on("reelStopped", async (reelIndex) => {
      console.log("Reel stopped:", reelIndex);
      await this.setReelToStaticContainer(this._symbols[reelIndex], reelIndex as number);
      //this.reelsController.getReelsContainer().getStaticContainer()?.playExpectedBonusAnimation(reelIndex, this._symbols[reelIndex]);
    });
  }

  // Symbol transfer methods
  protected async setSymbolsToSpinContainer(initialGrid: number[][]): Promise<void> {
    const reelsContainer = this.reelsController.getReelsContainer();
    const staticContainer = reelsContainer.getStaticContainer();
    const spinContainer = this.container;

    if (!staticContainer || !spinContainer || !reelsContainer) {
      return;
    }

    // Show spin container symbols
    spinContainer.getSymbols().forEach((column) => {
      column.forEach((symbol) => {
        if (symbol) symbol.visible = true;
      });
    });

    // Hide static container symbols
    staticContainer.getSymbols().forEach((symbols) => {
      symbols.forEach((symbol) => {
        symbol.visible = false;
      });
    });

    spinContainer.displayInitialGrid(initialGrid);
  }

  // use for each reelstop
  protected async setReelToStaticContainer(finalGrid: number[], reelIndex: number): Promise<void> {
    const reelsContainer = this.reelsController.getReelsContainer();
    const staticContainer = reelsContainer.getStaticContainer();
    const spinContainer = this.container;

    if (!staticContainer || !spinContainer || !reelsContainer) {
      return;
    }

    spinContainer.getSymbols()[reelIndex].forEach((symbol) => {
      if (symbol) {
        symbol.visible = false;
      }
    });

    // Update symbols for the specific reel
    await staticContainer.updateSymbols(finalGrid, reelIndex); // Assuming single reel

    reelIndex === GameConfig.GAME_RULES.reelCount - 1 && signals.emit("allReelsLanded");
  }
}
