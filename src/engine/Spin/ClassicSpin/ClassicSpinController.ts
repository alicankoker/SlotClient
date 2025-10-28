import { GameConfig } from "../../../config/GameConfig";
import { SpinConfig } from "../../../config/SpinConfig";
import { GameDataManager } from "../../data/GameDataManager";
import { IReelMode } from "../../reels/ReelController";
import { GridData, SpinResponseData } from "../../types/ICommunication";
import { ISpinState } from "../../types/ISpinConfig";
import { debug } from "../../utils/debug";
import { Utils } from "../../utils/Utils";
import { SpinContainer } from "../SpinContainer";
import { SpinController, SpinControllerConfig } from "../SpinController";

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

      if (this.onSpinStartCallback) {
        this.onSpinStartCallback();
      }

      // Simulate server request (replace with actual server call)
      const response: SpinResponseData =
        GameDataManager.getInstance().getSpinData();

      if (!response.success || !response.result) {
        this.handleError(response.error || "Unknown server error");
        return response;
      }
      const initialGrid = response.result.steps[0].gridBefore;
      await this.transferSymbolsToSpinContainer(initialGrid);

      const finalGrid = response.result.steps[0].gridAfter;
      this.onSpinCompleteCallback = async () => {
        await this.transferSymbolsToStaticContainer(finalGrid);
        await this.reelsController.playRandomWinAnimation();
      }

      this._soundManager.play("spin", true, 0.75); // Play spin sound effect

      this.startSpinAnimation(response.result);

      Utils.delay(SpinConfig.REEL_SPEED_UP_DURATION);

      if (this._spinMode === GameConfig.SPIN_MODES.NORMAL) {
        await Utils.delay(SpinConfig.SPIN_DURATION, signal);
        this.container.setMode(IReelMode.SLOWING);

        this._isForceStopped === false && this.reelsController.slowDown();

        await Utils.delay(SpinConfig.REEL_SLOW_DOWN_DURATION, signal);
      } else {
        await Utils.delay(SpinConfig.FAST_SPIN_SPEED);
      }

      this.container.setMode(IReelMode.STOPPING);
      this.container.stopSpin();

      this._soundManager.stop("spin");
      this._soundManager.play("stop", false, 0.75); // Play stop sound effect

      if (this.onSpinCompleteCallback) {
        this.onSpinCompleteCallback(response);
      }

      //await this.reelsController.setMode(ISpinState.IDLE);
      this.setState(ISpinState.IDLE);

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
}
