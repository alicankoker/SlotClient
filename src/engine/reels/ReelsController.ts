import { Application } from 'pixi.js';
import { ReelsContainer } from './ReelsContainer';
import { ReelController, IReelMode } from './ReelController';
import { StaticContainer } from './StaticContainer';
import { SpinContainer } from './SpinContainer';
import { GameConfig } from '../../config/GameConfig';
import {
    InitialGridData,
    CascadeStepData,
    ISpinState,
    WinConfig,
    SpinMode
} from '../types/GameTypes';
import { Helpers } from '../utils/Helpers';
import { SpinConfig } from '../../config/SpinConfig';
import { debug } from '../utils/debug';
import { GameRulesConfig } from '../../config/GameRulesConfig';

export class ReelsController {
    private app: Application;
    private reelsContainer!: ReelsContainer;
    private reelControllers: ReelController[] = [];

    // State management
    private currentMode: ISpinState = ISpinState.IDLE;
    private isSpinning: boolean = false;
    private _spinMode: SpinMode = GameConfig.SPIN_MODES.NORMAL as SpinMode;

    // Animation and timing
    private spinStartTime: number = 0;
    private spinPromises: Promise<void>[] = [];
    protected bottomSymbolYPos: number = 0;

    constructor(initData: InitialGridData, app: Application) {
        this.app = app;

        this.initializeContainers();
        this.initializeControllers(initData);
        this.connectControllers();
    }

    private initializeContainers(): void {
        this.reelsContainer = new ReelsContainer(this.app);
    }

    private initializeControllers(initData: InitialGridData): void {
        const numberOfReels = GameConfig.GRID_LAYOUT.columns;

        for (let i = 0; i < numberOfReels; i++) {
            const reelController = new ReelController(i, initData);
            this.reelControllers.push(reelController);
        }
    }

    private connectControllers(): void {
        // Get the single containers that handle all reels
        const spinContainer = this.reelsContainer.getSpinContainer();
        const staticContainer = this.reelsContainer.getStaticContainer(); // Single container for all reels

        if (!spinContainer) {
            debug.error('ReelsController: No SpinContainer available');
            return;
        }

        if (!staticContainer) {
            debug.error('ReelsController: No StaticContainer available');
            return;
        }

        for (let i = 0; i < this.reelControllers.length; i++) {
            this.reelControllers[i].setViews(staticContainer, spinContainer);
        }
    }

    // Mode management
    public async setMode(mode: ISpinState): Promise<void> {
        if (this.currentMode === mode) return;

        debug.log(`ReelsController: Switching from ${this.currentMode} to ${mode}`);
        this.currentMode = mode;

        // Update container mode
        this.reelsContainer.setMode(Helpers.getReelModeBySpinState(mode));

        // Update all reel controllers
        await Promise.all(this.reelControllers.map(controller => {
            return controller.setModeBySpinState(mode);
        }));
    }

    /**
     * @description Check the win condition for the current spin. Currently, it always returns true. It must be implemented.
     * @returns True if the win condition is met, false otherwise.
     */
    public checkWinCondition(): boolean {
        // Implement win condition logic
        return true; // Placeholder
    }

    /**
     * @description Set random win display data.
     * @returns The win configuration data.
     */
    private setWinDisplayData(): WinConfig {
        // Implement win display data logic
        const multiplier: number = Math.max(1, Math.floor(Math.random() * 5)); // Placeholder for multiplier
        const amount: number = Math.round(Math.random() * 100) * multiplier; // Placeholder for win amount with multiplier (if multiplier bigger than 1)
        const line: number = Math.floor(Math.random() * 25) + 1; // Placeholder for line
        const length = Math.max(Math.round(Math.random() * GameRulesConfig.GRID.reelCount), 3);
        const baseLine = GameRulesConfig.WINNING_LINES[line];
        const symbolIds: number[] = baseLine.slice(0, length); // Placeholder for symbol IDs

        return {
            multiplier,
            amount,
            line,
            symbolIds
        };
    }

    /**
     * @description Play a random win animation.
     * @param isSkipped Whether the animation is skipped.
     */
    public async playRandomWinAnimation(isSkipped: boolean = false): Promise<void> {
        // set win display datas
        const winData = this.setWinDisplayData();
        const winData2 = this.setWinDisplayData();
        const winData3 = this.setWinDisplayData();
        const staticContainer = this.reelsContainer.getStaticContainer();
        const winLinesContainer = this.reelsContainer.getWinLinesContainer();

        if (winLinesContainer && GameConfig.WIN_ANIMATION.winlineVisibility) {
            winLinesContainer.visible = true;
        }

        // Play the win animations. If skipped, play the skipped animation, otherwise play the full animation.
        if (isSkipped) {
            const amount = winData.amount + winData2.amount + winData3.amount;
            const lines = [winData.line, winData2.line, winData3.line];

            await staticContainer?.playSkippedWinAnimation(amount, lines);
        } else {
            this.reelsContainer.playFrameAnimation();
            await staticContainer?.setAnimation([winData, winData2, winData3]);
        }
    }

    /**
     * @description Skip all win animations.
     */
    public skipWinAnimations(): void {
        const staticContainer = this.reelsContainer.getStaticContainer();

        staticContainer?.skipWinAnimations();
    }

    /**
     * @description Reset all win animations.
     */
    public resetWinAnimations(): void {
        this.reelsContainer.stopFrameAnimation();

        const staticContainer = this.reelsContainer.getStaticContainer();

        staticContainer?.resetWinAnimations();
    }

    public getMode(): ISpinState {
        return this.currentMode;
    }

    // Spinning functionality
    public async startSpin(finalSymbols: number[][]): Promise<void> {
        if (this.isSpinning) {
            debug.warn('ReelsController: Spin already in progress');
            return;
        }

        this.resetWinAnimations();

        this.isSpinning = true;
        this.spinStartTime = Date.now();
        this.setMode(ISpinState.SPINNING);

        // Start all reels spinning with staggered timing
        /*this.spinPromises = this.reelControllers.map((controller, index) => {
            return new Promise<void>((resolve) => {
                //const delay = index * 150; // 150ms stagger between reels
                //const duration = 2000 + (index * 200); // Increasing duration for each reel
                
                //setTimeout(() => {
                    const reelSymbols = finalSymbols[index] || [];
                    controller.startSpin(reelSymbols, 0, resolve);
                //}, delay);
            });
        });
        
        // Wait for all reels to complete
        await Promise.all(this.spinPromises);*/
        this.reelControllers.forEach(controller => {
            controller.startSpin(finalSymbols[0], 0, () => { });
        });

        if (this._spinMode === GameConfig.SPIN_MODES.NORMAL) {
            await this.delay(SpinConfig.SPIN_DURATION);

            await this.delay(SpinConfig.REEL_SLOW_DOWN_DURATION);
        }

        this.isSpinning = false;

        debug.log('ReelsController: All reels completed spinning');
    }

    public stopSpin(): void {
        this.reelControllers.forEach(controller => {
            controller.stopSpin();
        });
    }

    public slowDown(): void {
        this.reelControllers.forEach(controller => {
            controller.slowDown();
        });
    }

    // Utility methods
    private delay(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    public forceStopAllReels(): void {
        if (!this.isSpinning) return;

        this.reelControllers.forEach(controller => {
            controller.forceStop();
        });

        this.isSpinning = false;
    }

    // Cascading functionality
    /*public async displayInitialGrid(gridData: InitialGridData): Promise<void> {
        this.setMode('cascading');
        
        // Update all containers with initial grid
        this.reelsContainer.displayInitialGrid(gridData);
        
        // Update all controllers
        this.reelControllers.forEach(controller => {
            controller.displayInitialGrid(gridData);
        });
    }*/

    /*public async processCascadeStep(stepData: CascadeStepData): Promise<void> {
        if (this.currentMode !== 'cascading') {
            debug.warn('ReelsController: Not in cascading mode');
            return;
        }
        
        // Process cascade step in containers
        this.reelsContainer.processCascadeStep(stepData);
        
        // Process cascade step in controllers
        this.reelControllers.forEach(controller => {
            controller.processCascadeStep(stepData);
        });
    }*/

    // Symbol access and manipulation
    public setSymbolsForReel(reelIndex: number, symbols: number[]): boolean {
        const controller = this.getReelController(reelIndex);
        if (controller) {
            controller.setSymbols(symbols);
            return true;
        }
        return false;
    }

    public getSymbolsForReel(reelIndex: number): number[] {
        const controller = this.getReelController(reelIndex);
        return controller ? controller.getSymbols() : [];
    }

    public getSymbolAt(reelIndex: number, position: number): number | null {
        const controller = this.getReelController(reelIndex);
        return controller ? controller.getSymbolIdAt(position) : null;
    }

    public updateSymbolAt(reelIndex: number, position: number, symbolId: number): boolean {
        const controller = this.getReelController(reelIndex);
        return controller ? controller.updateSymbolAt(position, symbolId) : false;
    }

    // Update method for game loop
    public update(deltaTime: number = 0): void {
        // Update all reel controllers
        this.reelControllers.forEach(controller => {
            controller.update(deltaTime);
        });

        // Update spinning state based on individual reel states
        this.updateSpinningState();

        // Update any timing-related logic
        this.updateTimingLogic(deltaTime);
    }

    private updateSpinningState(): void {
        // Check if any reels are still spinning
        const anySpinning = this.reelControllers.some(controller => controller.getIsSpinning());

        // Update overall spinning state
        if (this.isSpinning && !anySpinning) {
            // All reels have finished spinning
            this.isSpinning = false;
            debug.log('ReelsController: All reels have finished spinning');
        }
    }

    private updateTimingLogic(deltaTime: number): void {
        // Handle any timing-based logic here
        // This can be used for:
        // - Spin duration tracking
        // - Stagger timing between reels
        // - Delay-based state transitions
        // - Performance monitoring

        if (this.isSpinning && this.spinStartTime > 0) {
            const elapsedTime = Date.now() - this.spinStartTime;
            // Future: Add spin duration monitoring, timeouts, etc.
        }
    }

    // Controller access
    public getReelController(reelIndex: number): ReelController | null {
        return reelIndex >= 0 && reelIndex < this.reelControllers.length
            ? this.reelControllers[reelIndex] : null;
    }

    public getAllReelControllers(): ReelController[] {
        return [...this.reelControllers];
    }

    // Container access
    public getReelsContainer(): ReelsContainer {
        return this.reelsContainer;
    }

    public getSpinContainer(): SpinContainer | undefined {
        // Return the single SpinContainer (reelIndex is ignored since there's only one)
        return this.reelsContainer.getSpinContainer();
    }

    public getStaticContainer(): StaticContainer | undefined {
        // Return the single StaticContainer (reelIndex is ignored since there's only one)
        return this.reelsContainer.getStaticContainer();
    }

    // State queries
    public getIsSpinning(): boolean {
        return this.isSpinning;
    }

    public getNumberOfReels(): number {
        return this.reelControllers.length;
    }

    public getAllSpinning(): boolean {
        return this.reelControllers.every(controller => controller.getIsSpinning());
    }

    public getSpinElapsedTime(): number {
        return this.isSpinning ? Date.now() - this.spinStartTime : 0;
    }

    public getSpinMode(): SpinMode {
        return this._spinMode;
    }

    public setSpinMode(mode: SpinMode): void {
        if (this._spinMode === mode) return;

        this._spinMode = mode;
        this.reelControllers.forEach(controller => {
            controller.setSpinMode(mode);
        });

        debug.log(`ReelsController: Spin mode set to ${mode}`);
    }

    // Cleanup
    public destroy(): void {
        // Stop any ongoing spins
        this.forceStopAllReels();

        // Cleanup controllers
        this.reelControllers.forEach(controller => {
            controller.cleanup();
        });
        this.reelControllers = [];

        // Cleanup containers
        if (this.reelsContainer) {
            this.reelsContainer.destroy();
        }
    }
} 