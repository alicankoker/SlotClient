import { GameConfig } from "../../../config/GameConfig";
import { SpinConfig } from "../../../config/SpinConfig";
import { SpinContainer } from "../SpinContainer";
import { SpinController, SpinControllerConfig } from "../SpinController";
import { GameDataManager } from "../../data/GameDataManager";
import { Utils } from "../../utils/Utils";
import { GridData, IResponseData, SpinResponseData, SpinResultData } from "../../types/ICommunication";
import { ISpinState } from "../../types/ISpinConfig";
import { WinEventType } from "../../types/IWinEvents";
import { debug } from "../../utils/debug";

export class CascadeSpinController extends SpinController {
    constructor(container: SpinContainer, config: SpinControllerConfig) {
        super(container, config);
    }


    // Main spin orchestration methods
    public async executeSpin(): Promise<IResponseData> {
        if (this.currentState !== 'idle') {
            const error = `SpinController: Cannot start spin - current state is ${this.currentState}`;
            debug.warn(error);
            this.handleError(error);
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

            if (!response) {
                this.handleError('Unknown server error');
                throw new Error('SpinController: No response from server');
            }

            /*this.currentSpinId = response.result.spinId;
            this.currentCascadeSteps = response.result.cascadeSteps;
            this.finalGridData = response.result.finalGrid; // Store final grid

            debug.log('CascadeSpinController: Initial symbols from server:', response.result.initialGrid.symbols);

            // Step 1: Transfer symbols from StaticContainer to SpinContainer
            await this.transferSymbolsToSpinContainer(response.result.previousGrid);

            await Utils.delay(500);

            debug.log(response.result.initialGrid);*/
            //this._soundManager.play('spin', true, 0.75); // Play spin sound effect

            // Step 2: Start spinning animation
            // await this.startSpinAnimation(response.result);

            await Utils.delay(3500);

            if (this._spinMode === GameConfig.SPIN_MODES.NORMAL) {
                await Utils.delay(SpinConfig.SPIN_DURATION, signal);

                this._isForceStopped === false && this.reelsController.slowDown();
            }

            // Step 3: Process cascade sequence (if any)
            await this.processCascadeSequence();

            // Step 4: Transfer final symbols back to StaticContainer
            //await this.transferSymbolsToStaticContainer(response.result.finalGrid);

            //this.reelsController.stopSpin();
            this.setState(ISpinState.COMPLETED);
            this.reelsController.getReelsContainer()?.getSpinContainer()?.stopSpin();

            this._soundManager.stop('spin');
            this._soundManager.play('stop', false, 0.75); // Play stop sound effect

            // if (this.onSpinCompleteCallback) {
            //     this.onSpinCompleteCallback(response);
            // }

            await this.reelsController.setMode(ISpinState.IDLE);
            this.setState(ISpinState.IDLE);

            if (this.reelsController.checkWinCondition()) {
                if (this._isAutoPlaying && GameConfig.AUTO_PLAY.stopOnWin) {
                    this.stopAutoPlay();
                }

                GameConfig.WIN_EVENT.enabled && await this._winEvent.getController().showWinEvent(15250, WinEventType.INSANE); // Example big win amount and type

                const isSkipped = (this._isAutoPlaying && GameDataManager.getInstance().isWinAnimationSkipped && this._autoPlayCount > 0);
                GameConfig.WIN_ANIMATION.enabled && await this.reelsController.setupWinAnimation(isSkipped);
            }

            /*if (this._isAutoPlaying) {
                this.continueAutoPlay();
            }*/

            return response;
        } catch (error) {
            debug.error('SpinController: Spin execution error', error);
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            this.handleError(errorMessage);
            throw error;
        }
    }

    // Symbol transfer methods
    protected async transferSymbolsToSpinContainer(initialGrid: number[][]): Promise<void> {
        debug.log('SpinController: Transferring symbols from StaticContainer to SpinContainer');


        const reelsContainer = this.reelsController.getReelsContainer();
        const staticContainer = reelsContainer?.getStaticContainer();
        const spinContainer = this.container;

        if (!staticContainer || !spinContainer) {
            debug.error('SpinController: Missing containers for symbol transfer');
            return;
        }

        // Hide static container symbols and clear them
        staticContainer.visible = false;
        debug.log('SpinController: StaticContainer hidden and cleared');

        // Show spin container and display initial grid
        spinContainer.visible = true;
        debug.log('SpinController: SpinContainer shown');

        if ('displayInitialGrid' in spinContainer) {
            (spinContainer as any).displayInitialGrid(initialGrid);
            debug.log('SpinController: Initial grid displayed on SpinContainer');
        }
    }

    public async startSpinAnimation(spinData: IResponseData): Promise<void> {
        await this.container.startSpin(spinData);
        Utils.delay(3500);
    }

    // Removed duplicate startSpinAnimation method since it's already defined elsewhere

}