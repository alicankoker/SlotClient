import { eventBus } from "../../../communication/EventManagers/WindowEventManager";
import { GameConfig } from "../../../config/GameConfig";
import { SpinConfig } from "../../../config/SpinConfig";
import { GameServer } from "../../../server/GameServer";
import { AnimationContainer } from "../../components/AnimationContainer";
import { GameDataManager } from "../../data/GameDataManager";
import { FreeSpinController } from "../../freeSpin/FreeSpinController";
import { IReelMode } from "../../reels/ReelController";
import { GridData, SpinResponseData, SpinResultData } from "../../types/ICommunication";
import { ISpinState } from "../../types/ISpinConfig";
import { WinEventType } from "../../types/IWinEvents";
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
  public async executeSpin(): Promise<SpinResponseData> {
    if (this.currentState !== "idle") {
      const error = `SpinController: Cannot start spin - current state is ${this.currentState}`;
      debug.warn(error);
      this.handleError(error);
      return { success: false, error };
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

      eventBus.emit("setWinData1", "");
      eventBus.emit("setWinData2", "GOOD LUCK!");

      eventBus.emit('setComponentState', {
        componentName: 'spinButton',
        stateOrUpdates: 'spinning',
      });

      // Simulate server request (replace with actual server call)
      const response: SpinResponseData = GameDataManager.getInstance().getSpinData();

      if (!response.success || !response.result) {
        this.handleError(response.error || "Unknown server error");
        return response;
      }

      const initialGrid = response.result.steps[0].gridBefore;

      await this.transferSymbolsToSpinContainer(initialGrid);

      const finalGrid = response.result.steps[0].gridAfter;

      this.onSpinCompleteCallback = async () => {
        FreeSpinController.getInstance(this).isRunning === false && (FreeSpinController.getInstance(this).isRunning = GameDataManager.getInstance().checkFreeSpins());

        eventBus.emit('setComponentState', {
          componentName: 'spinButton',
          stateOrUpdates: 'default',
        });

        this.reelsController.getReelsContainer().setChainAnimation(false, false, false);

        await this.transferSymbolsToStaticContainer(finalGrid);

        GameConfig.WIN_EVENT.enabled && await AnimationContainer.getInstance().getWinEvent().getController().showWinEvent(15250, WinEventType.INSANE); // Example big win amount and type

        const isSkipped = GameConfig.FREE_SPIN.skipAnimations === true && ((this._isAutoPlaying && this._autoPlayCount > 0) || (FreeSpinController.getInstance(this).isRunning === true));
        GameConfig.WIN_ANIMATION.enabled && await this.reelsController.setupWinAnimation(isSkipped);

        // if (this._isAutoPlaying && GameConfig.AUTO_PLAY.stopOnWin) {
        //   this.stopAutoPlay();
        // }

        if (this._isAutoPlaying && FreeSpinController.getInstance(this).isRunning === false) {
          this.continueAutoPlay();
        }
      }

      this._soundManager.play("spin", true, 0.75); // Play spin sound effect

      this.startSpinAnimation(response.result);

      Utils.delay(SpinConfig.REEL_SPEED_UP_DURATION);

      if (this._spinMode === GameConfig.SPIN_MODES.NORMAL) {
        await Utils.delay(SpinConfig.SPIN_DURATION, signal);
        this.container.setMode(IReelMode.SLOWING);

        this._isForceStopped === false && this.reelsController.slowDown();
        this.reelsController.getReelsContainer().chainSpeed

        await Utils.delay(SpinConfig.REEL_SLOW_DOWN_DURATION, signal);
      } else {
        await Utils.delay(SpinConfig.FAST_SPIN_SPEED);
      }

      this.container.setMode(IReelMode.STOPPING);
      this.container.stopSpin();

      this._soundManager.stop("spin");
      this._soundManager.play("stop", false, 0.75); // Play stop sound effect

      //await this.reelsController.setMode(ISpinState.IDLE);
      this.setState(ISpinState.IDLE);

      const onSpinComplete = await this.onSpinCompleteCallback(response);

      /*if (this.reelsController.checkWinCondition()) {
                if (this._isAutoPlaying && GameConfig.AUTO_PLAY.stopOnWin) {
                    this.stopAutoPlay();
                }

                GameConfig.BIG_WIN.enabled && await this._bigWinContainer.showBigWin(15250, BigWinType.INSANE); // Example big win amount and type

                const isSkipped = (this._isAutoPlaying && GameConfig.AUTO_PLAY.skipAnimations === true && this._autoPlayCount > 0);
                GameConfig.WIN_ANIMATION.enabled && await this.reelsController.playRandomWinAnimation(isSkipped);
            }*/

      /*if (this._isAutoPlaying) {
                this.continueAutoPlay();
            }*/

      return response;
    } catch (error) {
      debug.error("SpinController: Spin execution error", error);
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      this.handleError(errorMessage);
      return { success: false, error: errorMessage };
    }
  }

  public startSpinAnimation(spinData: SpinResultData): void {
    (this.container as ClassicSpinContainer).startSpin(spinData);
  }
  // Symbol transfer methods
  protected async transferSymbolsToSpinContainer(
    initialGrid: GridData
  ): Promise<void> {
    debug.log("SpinController: Transferring symbols from StaticContainer to SpinContainer");

    const reelsContainer = this.reelsController.getReelsContainer();
    if (!reelsContainer) {
      debug.error(
        "SpinController: No reels container available for symbol transfer"
      );
      return;
    }

    const staticContainer = reelsContainer?.getStaticContainer();
    const spinContainer = this.container;

    if (!staticContainer || !spinContainer) {
      debug.error("SpinController: Missing containers for symbol transfer");
      return;
    }

    // Hide static container symbols and clear them
    staticContainer.visible = false;

    debug.log("SpinController: StaticContainer hidden and cleared");
    staticContainer.visible = false;

    // Show spin container and display initial grid
    spinContainer.visible = true;

    if (spinContainer instanceof SpinContainer) {
      debug.log("SpinController: Displaying initial grid on SpinContainer: ", initialGrid.symbols);
      (spinContainer as any).displayInitialGrid(initialGrid);
      debug.log("SpinController: Initial grid displayed on SpinContainer");
    }
  }

  //TO-DO: This needs to be moved to somewhere else
  /**
   * @description Start auto play with a specified count.
   * @param count The number of spins to auto play.
   * @returns A promise that resolves when auto play starts.
   */
  public async startAutoPlay(count: number, betAmount: number = 10, gameMode: string = "manual"): Promise<void> {
    if (this._isAutoPlaying || this.getIsSpinning()) {
      return;
    }

    this._autoPlayCount = count;
    this._autoPlayed = 0;
    this._isAutoPlaying = true;

    const text = `Starting Auto Play: ${this._autoPlayCount}`;
    this.reelsController.getReelsContainer().setAutoPlayCount(this._autoPlayCount, text);
    this.reelsController.getReelsContainer().getAutoPlayCountText().visible = true;

    const staticContainer = this.reelsController.getStaticContainer();
    if (staticContainer) staticContainer.allowLoop = false; // Disable looped win animation during auto play

    void this.continueAutoPlay(betAmount, gameMode);

    debug.log("Auto play started with count:", this._autoPlayCount);
  }

  //TO-DO: This needs to be moved to somewhere else
  /**
   * @description Continue auto play if conditions are met.
   * @returns True if auto play continues, false otherwise.
   */
  public async continueAutoPlay(betAmount: number = 10, gameMode: string = "manual"): Promise<boolean> {
    if (!this._isAutoPlaying || this.getIsSpinning() || this._autoPlayCount <= 0) {
      this.stopAutoPlay();
      return false;
    }

    // Set up the auto play timeout
    this._autoPlayTimeoutID = setTimeout(async () => {
      const response = await GameServer.getInstance().processSpinRequest({
        betAmount,
        gameMode
      });

      GameDataManager.getInstance().setSpinData(response)
      this.executeSpin(); // Replace with actual bet amount

      // Check if the spin was successful. If not, stop auto play.
      if (!response) {
        this.stopAutoPlay();
        return false;
      }

      this._autoPlayCount -= 1;
      this._autoPlayed += 1;

      const text = `Auto Plays Left: ${this._autoPlayCount}`;
      this.reelsController.getReelsContainer().setAutoPlayCount(this._autoPlayCount, text);

      if (this._autoPlayCount <= 0) {
        const staticContainer = this.reelsController.getStaticContainer();
        // Re-enable looped win animation after last auto play spin
        if (staticContainer) staticContainer.allowLoop = GameConfig.WIN_ANIMATION.winLoop ?? true;
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

    const text = `Auto Play Stopped`;
    this.reelsController
      .getReelsContainer()
      .setAutoPlayCount(this._autoPlayCount, text);
    this.reelsController.getReelsContainer().getAutoPlayCountText().visible =
      false;

    const staticContainer = this.reelsController.getStaticContainer();
    // Re-enable looped win animation after auto play stops
    if (staticContainer)
      staticContainer.allowLoop = GameConfig.WIN_ANIMATION.winLoop ?? true;

    if (this._autoPlayTimeoutID) {
      clearTimeout(this._autoPlayTimeoutID);
      this._autoPlayTimeoutID = null;
    }

    debug.log("Auto play stopped");
  }
}
