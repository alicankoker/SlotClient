import { SpinContainer } from './SpinContainer';
import { StaticContainer } from './StaticContainer';
import { GameConfig } from '../../config/GameConfig';
import {
    InitialGridData,
    CascadeStepData,
    GridUtils,
    ISpinState,
    SpinMode
} from '../types/GameTypes';
import { GridSymbol } from '../symbol/GridSymbol';
import { Sprite } from 'pixi.js';
import { Helpers } from '../utils/Helpers';
import { SpinConfig } from '../../config/SpinConfig';
import { debug } from '../utils/debug';
import { GameRulesConfig } from '../../config/GameRulesConfig';

export enum IReelMode {
    STATIC = 'static',
    SPINNING = 'spinning',
    CASCADING = 'cascading',
    SPEEDING = 'speeding',
    SLOWING = 'slowing',
    STOPPING = 'stopping',
    STARTING = 'starting',
    IDLE = 'idle',
    PAUSED = 'paused',
    RESUMING = 'resuming',
    STOPPED = 'stopped',
    STARTED = 'started',
}

export class ReelController {
    private reelIndex: number;
    private currentMode: IReelMode = IReelMode.STATIC;
    private currentSymbols: number[] = [];
    private isSpinning: boolean = false;

    // View containers - simplified to use unified SpinContainer
    private staticContainer?: StaticContainer;
    private spinContainer?: SpinContainer;
    protected bottomSymbolYPos: number = 0;
    protected topSymbolYPos: number = 0;
    protected currentSpeed: number = SpinConfig.SPIN_SPEED;
    private _spinMode: SpinMode = GameConfig.SPIN_MODES.NORMAL as SpinMode;

    // Animation state
    private spinDuration: number = 2000;
    private onSpinCompleteCallback?: () => void;

    constructor(reelIndex: number, initData: InitialGridData) {
        this.reelIndex = reelIndex;
        this.initializeSymbols(initData);
    }

    private initializeSymbols(initData: InitialGridData): void {
        // Extract symbols for this reel (column) from flat array
        // Using GridUtils helper for proper index calculation
        const reelSymbols: number[] = [];
        for (let row = 0; row < GameRulesConfig.GRID.rowCount; row++) {
            const flatIndex = GridUtils.positionToIndex(this.reelIndex, row);
            reelSymbols.push(initData.symbols[flatIndex].symbolId);
        }
        this.currentSymbols = reelSymbols;
    }

    // View management - simplified to use unified SpinContainer
    public setViews(staticContainer: StaticContainer, spinContainer: SpinContainer): void {
        this.staticContainer = staticContainer;
        this.spinContainer = spinContainer;

        debug.log(`ReelController ${this.reelIndex}: Views set. Current symbols:`, this.currentSymbols);
        this.updateViewVisibility();
        this.syncSymbolsToViews();

        debug.log(`ReelController ${this.reelIndex}: Views synced. StaticContainer symbol count:`, this.staticContainer.getSymbolCount(this.reelIndex));
    }

    private updateViewVisibility(): void {
        // Don't control StaticContainer visibility per reel - it's shared by all reels
        // StaticContainer visibility should be managed at ReelsController level

        if (this.spinContainer) {
            this.spinContainer.setMode(this.currentMode);
            this.spinContainer.visible = this.currentMode !== IReelMode.STATIC;
        }
    }

    private syncSymbolsToViews(): void {
        if (this.spinContainer && !this.isSpinning) {
            debug.log(`ReelController ${this.reelIndex}: Syncing symbols to SpinContainer:`, this.currentSymbols);
            this.spinContainer.setSymbols(this.currentSymbols, this.reelIndex);
        }

        if (this.staticContainer && this.currentMode === IReelMode.STATIC) {
            debug.log(`ReelController ${this.reelIndex}: Syncing symbols to StaticContainer:`, this.currentSymbols);
            this.staticContainer.setSymbols(this.currentSymbols, this.reelIndex);
            debug.log(`ReelController ${this.reelIndex}: StaticContainer now has symbols for reel ${this.reelIndex}`);
        }
    }

    public async setModeBySpinState(spinState: ISpinState): Promise<void> {
        //translate spin state to reel mode by switch-case
        await this.setMode(Helpers.getReelModeBySpinState(spinState));
    }

    // Mode management
    public async setMode(mode: IReelMode): Promise<void> {
        if (this.currentMode === mode) return;
        debug.log(`ReelController ${this.reelIndex}: Switching from ${this.currentMode} to ${mode}`);
        this.currentMode = mode;
        this.updateViewVisibility();
    }

    public getMode(): IReelMode {
        return this.currentMode;
    }

    // Symbol management
    public setSymbols(symbols: number[]): void {
        this.currentSymbols = [...symbols];
    }

    public getSymbols(): number[] {
        return [...this.currentSymbols];
    }

    public getSymbolAt(position: number): GridSymbol | null {
        if (this.spinContainer && this.currentMode !== 'static') {
            const symbol = this.spinContainer.getSymbolAt(position);
            return symbol instanceof GridSymbol ? symbol : null;
        }

        if (this.staticContainer && this.currentMode === 'static') {
            const symbol = this.staticContainer.getSymbolAt(position);
            return symbol instanceof GridSymbol ? symbol : null;
        }

        return null;
    }

    public getSymbolIdAt(position: number): number | null {
        if (position < 0 || position >= this.currentSymbols.length) {
            return null;
        }
        return this.currentSymbols[position];
    }

    public updateSymbolAt(position: number, symbolId: number): boolean {
        if (position < 0 || position >= this.currentSymbols.length) {
            return false;
        }

        this.currentSymbols[position] = symbolId;
        return true;
    }

    // Spinning functionality
    public startSpin(targetSymbols: number[], duration?: number, onComplete?: () => void): boolean {
        if (this.isSpinning || !this.spinContainer) return false;

        this.bottomSymbolYPos = 840;
        this.topSymbolYPos = 240;

        this.isSpinning = true;
        this.spinDuration = duration || this.spinDuration;
        this.onSpinCompleteCallback = onComplete;

        this.setMode(IReelMode.SPINNING);
        this.currentSpeed = SpinConfig.SPIN_SPEED;

        return this.spinContainer.startSpin(targetSymbols, () => {
            this.onSpinComplete(targetSymbols);
        });
    }

    public slowDown(): void {
        this.setMode(IReelMode.SLOWING);
    }

    public stopSpin(): void {
        this.isSpinning = false;

        this.spinContainer?.symbols.forEach((reelSymbols: (GridSymbol | Sprite | null)[], reelIndex: number) => {
            reelSymbols.forEach((symbol: GridSymbol | Sprite | null, symbolIndex: number) => {
                if (symbol) {
                    const symbolHeight = GameConfig.REFERENCE_SYMBOL.height;

                    const spacingY = GameConfig.REFERENCE_SPACING.vertical;

                    const symbolY = ((symbolIndex - 2) * (symbolHeight + spacingY)) + GameConfig.REFERENCE_RESOLUTION.height / 2;

                    symbol.position.y = symbolY;
                }
            });
        });

        //this.setMode(IReelMode.STATIC);
    }

    private onSpinComplete(finalSymbols: number[]): void {
        this.isSpinning = false;

        // Switch to static mode BEFORE setting symbols so StaticContainer gets updated
        this.setSymbols(finalSymbols);
        this.setMode(IReelMode.STATIC);

        if (this.onSpinCompleteCallback) {
            this.onSpinCompleteCallback();
        }
    }

    public forceStop(): void {
        if (!this.isSpinning) return;

        this.isSpinning = false;
    }

    // Update method for game loop
    public update(deltaTime: number = 0): void {
        // Update spin progress and state
        if (this.spinContainer && this.isSpinning) {
            // Monitor spin container state for any needed updates
            this.updateSpinProgress(deltaTime);
        }

        // Update container states if needed
        this.updateContainerStates(deltaTime);

        // Handle any time-based state transitions
        this.updateStateMachine(deltaTime);
    }

    private updateSpinProgress(deltaTime: number): void {
        // This method can be used to:
        // - Monitor spin animation progress
        // - Handle spin timing adjustments
        // - Coordinate with other systems during spin
        // - Update spin-related UI elements

        if (this.spinContainer && this.isSpinning) {
            // Future: Add any spin progress tracking here
            // e.g., spin speed adjustments, progress callbacks, etc.

            if (this.currentMode === IReelMode.SLOWING && this.currentSpeed > SpinConfig.REEL_SLOW_DOWN_SPEED_LIMIT) {
                this.currentSpeed -= SpinConfig.REEL_SLOW_DOWN_COEFFICIENT;
            }

            if (this.currentMode === IReelMode.SPEEDING) {
                this.currentSpeed -= SpinConfig.REEL_SPEED_UP_COEFFICIENT;
            }

            this.spinContainer?.symbols.forEach((reelSymbols: (GridSymbol | Sprite | null)[], reelIndex: number) => {
                debug.log(`${this.currentSpeed}`);
                reelSymbols.forEach((symbol: GridSymbol | Sprite | null, symbolIndex: number) => {
                    if (symbol) {
                        if (symbol.position.y > this.bottomSymbolYPos) {
                            symbol.position.y = this.topSymbolYPos;
                        } else {
                            symbol.position.y += this.currentSpeed;
                        }
                    }
                });
            });
        }
    }

    private updateContainerStates(deltaTime: number): void {
        // Update container states that might need frame-by-frame updates
        // This can be extended for:
        // - Fade transitions between modes
        // - Position adjustments
        // - Scale animations
        // - Other visual effects

        // Currently containers handle their own animations,
        // but this provides a hook for coordinated updates
    }

    private updateStateMachine(deltaTime: number): void {
        // Handle any state machine logic that needs regular updates
        // This can be used for:
        // - Mode transition timing
        // - Delayed state changes
        // - Conditional state updates based on external factors

        switch (this.currentMode) {
            case 'spinning':
                // Handle spinning state updates
                break;
            case 'cascading':
                // Handle cascading state updates
                break;
            case 'static':
                // Handle static state updates
                break;
        }
    }

    // Cascading functionality
    /*public displayInitialGrid(gridData: InitialGridData): void {
        this.setMode('cascading');
        
        if (this.spinContainer) {
            this.spinContainer.displayInitialGrid(gridData);
        }
    }

    /*public processCascadeStep(stepData: CascadeStepData): void {
        if (this.spinContainer && this.currentMode === 'cascading') {
            this.spinContainer.processCascadeStep(stepData);
        }
    }*/

    // State queries
    public getIsSpinning(): boolean {
        return this.isSpinning;
    }

    public getReelIndex(): number {
        return this.reelIndex;
    }

    public getSymbolCount(): number {
        return this.currentSymbols.length;
    }

    public getSpinMode(): SpinMode {
        return this._spinMode;
    }

    public setSpinMode(mode: SpinMode): void {
        if (this._spinMode === mode) return;

        this._spinMode = mode;

        debug.log(`ReelController ${this.reelIndex}: Spin mode set to ${mode}`);
    }

    // Cleanup
    public cleanup(): void {
        this.staticContainer = undefined;
        this.spinContainer = undefined;
        this.onSpinCompleteCallback = undefined;
    }
} 