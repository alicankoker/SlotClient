import { GameConfig } from "../../../config/GameConfig";
import { SpinConfig } from "../../../config/SpinConfig";
import { GameDataManager } from "../../data/GameDataManager";
import { BigWinType, ISpinState, SpinResponseData } from "../../types/GameTypes";
import { Utils } from "../../utils/Utils";
import { SpinContainer } from "../SpinContainer";
import { SpinController, SpinControllerConfig } from "../SpinController";

export class ClassicSpinController extends SpinController {
    constructor(container: SpinContainer, config: SpinControllerConfig) {
        super(container, config);
    }


    // Main spin orchestration methods
    public async executeSpin(): Promise<SpinResponseData> {
        if (this.currentState !== 'idle') {
            const error = `SpinController: Cannot start spin - current state is ${this.currentState}`;
            console.warn(error);
            this.handleError(error);
            return { success: false, error };
        }

        this._abortController = new AbortController();
        const signal = this._abortController.signal;

        this._isForceStopped = false;

        try {
            this.setState(ISpinState.SPINNING);

            if (this.onSpinStartCallback) {
                this.onSpinStartCallback();
            }

            // Simulate server request (replace with actual server call)
            const response = GameDataManager.getInstance().getSpinData();

            if (!response.success || !response.result) {
                this.handleError(response.error || 'Unknown server error');
                return response;
            }

            //await this.transferSymbolsToSpinContainer(response.result.initialGrid);
            
            this._soundManager.play('spin', true, 0.75); // Play spin sound effect

            if (this._spinMode === GameConfig.SPIN_MODES.NORMAL) {
                await Utils.delay(SpinConfig.SPIN_DURATION, signal);

                this._isForceStopped === false && this.reelsController.slowDown();

                await Utils.delay(SpinConfig.REEL_SLOW_DOWN_DURATION, signal);
            } else {
                await Utils.delay(SpinConfig.FAST_SPIN_SPEED);
            }
            
            //this.reelsController.stopSpin();
            //this.setState(ISpinState.COMPLETED);
            //this.reelsController.getReelsContainer()?.getSpinContainer()?.stopSpin();

            this._soundManager.stop('spin');
            this._soundManager.play('stop', false, 0.75); // Play stop sound effect

            if (this.onSpinCompleteCallback) {
                this.onSpinCompleteCallback(response);
            }

            //await this.reelsController.setMode(ISpinState.IDLE);
            this.setState(ISpinState.IDLE);

            if (this.reelsController.checkWinCondition()) {
                if (this._isAutoPlaying && GameConfig.AUTO_PLAY.stopOnWin) {
                    this.stopAutoPlay();
                }

                GameConfig.BIG_WIN.enabled && await this._bigWinContainer.showBigWin(15250, BigWinType.INSANE); // Example big win amount and type

                const isSkipped = (this._isAutoPlaying && GameConfig.AUTO_PLAY.skipAnimations === true && this._autoPlayCount > 0);
                GameConfig.WIN_ANIMATION.enabled && await this.reelsController.playRandomWinAnimation(isSkipped);
            }

            /*if (this._isAutoPlaying) {
                this.continueAutoPlay();
            }*/

            return response;
        } catch (error) {
            console.error('SpinController: Spin execution error', error);
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            this.handleError(errorMessage);
            return { success: false, error: errorMessage };
        }
    }

}