import { SpinConfig } from "@slotclient/config/SpinConfig";
import { SpinContainer } from "../SpinContainer";
import { SpinController, SpinControllerConfig } from "../SpinController";
import { GameDataManager } from "../../data/GameDataManager";
import { Utils } from "../../utils/Utils";
import { CascadeStepData, IResponseData, IResponseDataNew } from "../../types/ICommunication";
import { ISpinState } from "../../types/ISpinConfig";
import { debug } from "../../utils/debug";
import { signals } from "../../controllers/SignalManager";
import { CascadeSpinContainer } from "./CascadeSpinContainer";

export class CascadeSpinController extends SpinController {
    constructor(container: CascadeSpinContainer, config: SpinControllerConfig) {
        super(container, config);
    }

    protected currentStepId: number = 0;

    // Main spin orchestration methods
    public async executeSpin(): Promise<void> {
        if (this.currentState !== 'idle') {
            const error = `SpinController: Cannot start spin - current state is ${this.currentState}`;
            debug.warn(error);
            this.handleError(error);
        }

        this._abortController = new AbortController();
        const signal = this._abortController.signal;

        this._isForceStopped = false;

        try {
            while (this.currentStepId < (GameDataManager.getInstance().getResponseData() as IResponseDataNew).steps.length) {
                if (this.currentStepId == 0) {
                    await (this.container as CascadeSpinContainer).moveOutExistingSymbols();
                    //await this.container.moveInNextSymbols();
                    this.currentStepId++;
                } else {
                    const reelsBeforeExplosion = (GameDataManager.getInstance().getResponseData() as IResponseDataNew).steps[this.currentStepId].reelsBefore;
                    const previousReels = GameDataManager.getInstance().getSymbolsBeforeSpin();
                    //await this.setSymbolsToSpinContainer(previousReels!);
                    //await this.processCascadeSequence();

                    //this.setState(ISpinState.SPINNING); 

                    /*if (this.onSpinStartCallback) {
                        this.onSpinStartCallback();
                    }*/

                    // Simulate server request (replace with actual server call)    
                    const response: IResponseDataNew = GameDataManager.getInstance().getResponseData() as IResponseDataNew;

                    if (!response) {
                        this.handleError('Unknown server error');
                        throw new Error('SpinController: No response from server');
                    }

                    /*if (this._spinMode === this.gameConfig.SPIN_MODES.NORMAL) {
                        await Utils.delay(SpinConfig.SPIN_DURATION, signal);
        
                        this._isForceStopped === false && this.reelsController.slowDown();
                    }*/


                    await this.setSymbolsToSpinContainer(response.steps[this.currentStepId].reelsBefore);

                    // Step 3: Process cascade sequence (if any)
                    //await this.processCascadeSequence();
                    await this.processCascadeStep(response.steps[this.currentStepId]);

                    await Utils.delay(2000);

                    //this.setState(ISpinState.COMPLETED);
                    //this.reelsController.getReelsContainer()?.getSpinContainer()?.stopSpin();

                    //await this.reelsController.setMode(ISpinState.IDLE);
                    //this.setState(ISpinState.IDLE);
                    this.currentStepId++;
                }
            }
        } catch (error) {
            debug.error('SpinController: Spin execution error', error);
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            this.handleError(errorMessage);
            throw error;
        }
    }

    // Cascade processing methods
    protected async processCascadeSequence(): Promise<void> {
        if (!this.currentCascadeSteps || this.currentCascadeSteps.length === 0) {
            debug.log("SpinController: No cascade steps to process");
            return;
        }

        debug.log(
            `SpinController: Processing ${this.currentCascadeSteps.length} cascade steps`
        );

        for (const step of this.currentCascadeSteps) {
            await this.processCascadeStep(step);

            // Notify about cascade step
            if (this.onCascadeStepCallback) {
                this.onCascadeStepCallback(step);
            }

            // Small delay between steps for visual clarity
            await Utils.delay(500);
        }
    }

    protected async processCascadeStep(step: CascadeStepData): Promise<void> {
        debug.log(`SpinController: Processing cascade step ${step.roundId}`);

        // Get the spin container (assuming it's a CascadeSpinContainer)
        const spinContainer = this.reelsController
            .getReelsContainer()
            ?.getSpinContainer() as unknown as CascadeSpinContainer;

        // Process the cascade step
        await spinContainer.processCascadeStep(step);
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
                symbol.setIdle();
            });
        });

        spinContainer.displayInitialGrid(initialGrid);
    }

    public async startSpinAnimation(spinData: IResponseData): Promise<void> {
        await this.container.startSpin(spinData);
        Utils.delay(3500);
    }

    // Removed duplicate startSpinAnimation method since it's already defined elsewhere

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

        reelIndex === this.gameConfig.GAME_RULES.reelCount - 1 && signals.emit("allReelsLanded");
    }
}