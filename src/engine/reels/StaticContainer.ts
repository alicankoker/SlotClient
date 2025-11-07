import { Container, Application, Text } from 'pixi.js';
import { GameConfig } from '../../config/GameConfig';
import { SpineSymbol } from '../symbol/SpineSymbol';
import { GridSymbol } from '../symbol/GridSymbol';
import { debug } from '../utils/debug';
import { gsap } from 'gsap';
import { WinLines } from '../components/WinLines';
import SoundManager from '../controllers/SoundManager';
import { WinConfig } from '../types/IWinPresentation';
import { GridData } from '../types/ICommunication';
import { SIGNAL_EVENTS, signals } from '../controllers/SignalManager';
import { AnimationContainer } from '../components/AnimationContainer';
import { eventBus } from '../../communication/EventManagers/WindowEventManager';
import { GameDataManager } from '../data/GameDataManager';

export interface StaticContainerConfig {
    reelIndex: number;           // 0-4 for 5 reels
    symbolHeight: number;
    symbolsVisible: number;
    x?: number;                  // Relative X position (0-1)
    y?: number;                  // Relative Y position (0-1)
}

export class StaticContainer extends Container {
    private _app: Application;
    private _soundManager: SoundManager;
    private _winLines: WinLines;
    private _config: StaticContainerConfig;
    private _symbols: Map<number, SpineSymbol[]> = new Map(); // Map of reelIndex -> symbols array
    private _winDatas: WinConfig[] = [];
    private _isPlaying: boolean = false;
    private _isLooping: boolean = false;
    private _isSkipped: boolean = false;
    private _allowLoop: boolean = GameConfig.WIN_ANIMATION.winLoop ?? true;
    private _isFreeSpinMode: boolean = false;
    private _animationToken: number = 0;
    private _initialGrid: number[][];
    private _pendingResolvers: (() => void)[] = [];

    constructor(app: Application, config: StaticContainerConfig, initialGrid: number[][]) {
        super();

        this.position.set(0, 15); // Offset to avoid clipping issues

        this.position.set(0, 15); // Offset to avoid clipping issues

        this.label = 'StaticContainer';
        this._app = app;
        this._soundManager = SoundManager.getInstance();
        this._winLines = WinLines.getInstance();
        this._config = config;
        this._initialGrid = initialGrid;

        initialGrid.forEach((symbolIds: number[], reelIndex: number) => {
            this.createSymbolsFromIds(symbolIds, reelIndex);
        });
    }

    /**
     * @description Sets the symbols for the specified reel.
     * @param symbolIds - The array of symbol IDs to set.
     * @param reelIndex - The index of the reel to set (optional).
     * @return void
     */
    public setSymbols(symbolIds: number[], reelIndex: number): void {
        //this.createSymbolsFromIds(symbolIds, reelIndex);
    }

    /**
     * @description Updates the symbols in the static container for the specified reel.
     * @param symbolIds - The array of symbol IDs to update.
     * @param reelIndex - The index of the reel to update (optional).
     * @returns void
     */
    public updateSymbols(symbolIds: number[]): Promise<void[]> {
        return Promise.all(Array.from(this._symbols.values()).flat().map(async (symbol, index) => {
            if (symbolIds[index] !== undefined) {
                return symbol.setSymbol(symbolIds[index]);
            }
        }));
    }

    private createSymbolsFromIds(symbolIds: number[], reelIndex: number): void {
        // Initialize symbols array for this reel
        if (!this._symbols.has(reelIndex)) {
            this._symbols.set(reelIndex, []);
        }

        const reelSymbols = this._symbols.get(reelIndex);

        // Create symbols with buffer for smooth scrolling (like original Reel.ts)
        const symbolsToCreate = this._config.symbolsVisible;

        const reelX = this.calculateSymbolX(reelIndex);

        for (let i = 0; i < symbolsToCreate; i++) {
            // Calculate vertical position (actual pixels)
            const symbolY = this.calculateSymbolY(i);

            //debug.log(`StaticContainer: Creating symbol ${i} for reel ${reelIndex} with ID ${symbolId} at pixel position (${Math.round(reelX)}, ${Math.round(symbolY)})`);

            // Create symbol with container positioning to avoid conflicts with ReelsContainer offset
            const symbol = new SpineSymbol({
                symbolId: symbolIds[i],
                position: {
                    x: reelX, // Offset for container position
                    y: symbolY // Offset for container position
                },
                scale: GameConfig.REFERENCE_SYMBOL.scale, // Use responsive scale
            });

            // Add to symbols container and array
            this.addChild(symbol);
            reelSymbols!.push(symbol);

            //debug.log(`StaticContainer: Symbol ${i} for reel ${reelIndex} added at pixel position (${Math.round(reelX)}, ${Math.round(symbolY)})`);
        }

        this._symbols.set(reelIndex, reelSymbols!);

        //debug.log(`StaticContainer: Created ${symbolsToCreate} symbols for reel ${reelIndex}`);
    }

    /**
     * @description Set the win animations.
     * @param winDatas The winning data.
     * @returns A promise that resolves when the animations are complete.
     */
    public async setupAnimation(winDatas: WinConfig[]): Promise<void> {
        this.resetWinAnimations();

        const totalWinAmount = winDatas.reduce((sum, winData) => sum + winData.amount, 0);

        const token = ++this._animationToken;
        this._winDatas = winDatas;

        this._isPlaying = true;
        this._isSkipped = false;
        this._isLooping = false;

        const lines = winDatas.map(winData => winData.line);
        if (GameConfig.WIN_ANIMATION.winlineVisibility) {
            this._winLines.showLines(lines);
        }

        await AnimationContainer.getInstance().playTotalWinAnimation(totalWinAmount);

        this._winLines.hideAllLines();

        await this.playWinAnimations(winDatas, token);

        if (GameDataManager.getInstance().isFreeSpinning !== false && GameDataManager.getInstance().isAutoPlaying !== false) {
            eventBus.emit("setMessageBox", { variant: "default", message: "PLACE YOUR BET" });
        }

        if (this._allowLoop && this._animationToken === token && this._isFreeSpinMode === false) {
            this.playLoopAnimations(winDatas, token);
        }
    }

    /**
     * @description Delay helper function that respects the animation token.
     * @param ms The delay duration in milliseconds.
     * @param token The animation token.
     * @returns A promise that resolves when the delay is complete.
     */
    private delay(ms: number, token: number): Promise<void> {
        return new Promise((resolve) => {
            const id = setTimeout(() => {
                if (this._animationToken === token) {
                    resolve();
                }
            }, ms);
        });
    }

    /**
     * @description Play the win animations.
     * @param winDatas The winning data.
     * @param token The animation token.
     * @returns A promise that resolves when the animations are complete.
     */
    public async playWinAnimations(winDatas: WinConfig[], token: number): Promise<void> {
        if (this._animationToken !== token) return;

        for (const winData of winDatas) {
            if (this._animationToken !== token) return;

            this._isLooping === false && this._soundManager.play("win", false, 0.75);
            signals.emit(SIGNAL_EVENTS.WIN_ANIMATION_PLAY, winData.amount);

            if (GameConfig.WIN_ANIMATION.winlineVisibility && !this._isSkipped) {
                this._winLines.showLine(winData.line);
            }

            this._symbols.forEach((reelSymbols) => reelSymbols.forEach((symbol) => symbol.setBlackout()));

            const symbolGroups: number[][] = Array.isArray(winData.symbolIds[0])
                ? (winData.symbolIds as number[][])
                : (winData.symbolIds as unknown as number[]).map((id) => [id]);

            await Promise.all(
                symbolGroups.map(async (symbolIds, reelIndex) => {
                    return Promise.all(
                        symbolIds.map(async (symbolId) => {
                            if (symbolId === -1) return;

                            this._symbols.get(reelIndex)?.[symbolId]?.clearBlackout();

                            return new Promise<void>((resolve) => {
                                this._pendingResolvers.push(resolve);

                                if (this._isSkipped || this._animationToken !== token) {
                                    resolve();
                                    return;
                                }

                                this._symbols.get(reelIndex)?.[symbolId]?.setWinAnimation(false, () => {
                                    resolve();
                                });
                            });
                        })
                    );
                })
            ).then(() => {
                if (this._animationToken !== token) return;

                if (!this._isSkipped) {
                    this._pendingResolvers = [];

                    symbolGroups.forEach((symbolIds, reelIndex) => {
                        symbolIds.forEach((symbolId) => {
                            if (symbolId === -1) return;

                            this._symbols.get(reelIndex)?.[symbolId]?.setIdle();
                        });
                    });

                    if (GameConfig.WIN_ANIMATION.winlineVisibility) {
                        this._winLines.hideLine(winData.line);
                    }
                }
            });
        }

        this._symbols.forEach((reelSymbols) => reelSymbols.forEach((symbol) => symbol.clearBlackout()));

        if (this._animationToken !== token) return;

        signals.emit(SIGNAL_EVENTS.WIN_ANIMATION_COMPLETE);
        this._isPlaying = false;
    }

    /**
     * @description Play the loop animations.
     * @param winDatas The winning data.
     * @param token The animation token.
     * @returns A promise that resolves when the animations are complete.
     */
    private async playLoopAnimations(winDatas: WinConfig[], token: number): Promise<void> {
        await this.delay(GameConfig.WIN_ANIMATION.delayBeforeLoop || 2000, token);

        this._isLooping = true;
        this._isSkipped = false;

        while (this._isLooping && this._animationToken === token && this._isFreeSpinMode === false) {
            await this.playWinAnimations(winDatas, token);
            await this.delay(GameConfig.WIN_ANIMATION.delayBetweenLoops || 1000, token);
        }
    }

    /**
     * @description Skip the win animations.
     * @returns void
     */
    public skipWinAnimations(): void {
        if (!this._isPlaying || this._isLooping) return;

        this._isSkipped = true;

        this._soundManager.stop('win');

        this._pendingResolvers.forEach(resolve => resolve());
        this._pendingResolvers = [];

        if (GameConfig.WIN_ANIMATION.winlineVisibility) {
            this._winLines.hideAllLines();
        }

        this._symbols.forEach((reelSymbols) => {
            reelSymbols.forEach((symbol) => {
                symbol.setIdle();
            });
        });
    }

    /**
     * @description Play the skipped win animation.
     * @param amount The win amount.
     * @param lines The winning lines.
     * @returns A promise that resolves when the animation is complete.
     */
    public async playSkippedWinAnimation(amount: number, lines: number[]): Promise<void> {
        return new Promise(async (resolve) => {
            if (GameConfig.WIN_ANIMATION.winlineVisibility) {
                this._winLines.showLines(lines);
            }

            await AnimationContainer.getInstance().playTotalWinAnimation(amount);

            eventBus.emit("setWinBox", { variant: "default", amount: amount.toString() });

            if (GameConfig.WIN_ANIMATION.winlineVisibility) {
                this._winLines.hideAllLines();
            }

            resolve();
        });
    }

    public resetWinAnimations(): void {
        this._animationToken++;

        this._isPlaying = false;
        this._isLooping = false;
        this._isSkipped = false;
        this._winDatas = [];

        if (GameConfig.WIN_ANIMATION.winlineVisibility) {
            this._winLines.hideAllLines();
        }

        this._pendingResolvers.forEach(resolve => resolve());
        this._pendingResolvers = [];

        this._symbols.forEach((reelSymbols) => {
            reelSymbols.forEach((symbol) => {
                symbol.clearBlackout();
            });
        });

        this._symbols.forEach((reelSymbols) => {
            reelSymbols.forEach((symbol) => {
                symbol.setIdle();
            });
        });
    }

    // Public symbol management methods
    public setSymbolsByIndex(symbolIndexes: number[], reelIndex?: number): void {
        const targetReelIndex = reelIndex !== undefined ? reelIndex : this._config.reelIndex;
        if (symbolIndexes.length !== this._config.symbolsVisible) {
            debug.warn(`StaticContainer: Expected ${this._config.symbolsVisible} symbols, got ${symbolIndexes.length} for reel ${targetReelIndex}`);
            return;
        }

        const visibleSymbols = this.getVisibleSymbols(targetReelIndex);

        visibleSymbols.forEach((symbol, index) => {
            const symbolIndex = symbolIndexes[index];
            symbol.setSymbol(symbolIndex);
        });
    }

    public setSymbolsFromServerData(symbolIds: number[], reelIndex?: number): void {
        const targetReelIndex = reelIndex !== undefined ? reelIndex : this._config.reelIndex;
        const reelSymbols = this._symbols.get(targetReelIndex);

        if (symbolIds.length !== reelSymbols?.length) {
            debug.warn(`StaticContainer: Expected ${reelSymbols?.length} symbols, got ${symbolIds.length} for reel ${targetReelIndex}`);
            return;
        }

        reelSymbols?.forEach((symbol, index) => {
            symbol.setSymbol(symbolIds[index]);
        });
    }

    public updateSymbolAt(index: number, symbolId: number, reelIndex?: number): boolean {
        const targetReelIndex = reelIndex !== undefined ? reelIndex : this._config.reelIndex;
        const reelSymbols = this._symbols.get(targetReelIndex);
        if (!reelSymbols || index < 0 || index >= reelSymbols.length) {
            debug.warn(`StaticContainer: Invalid symbol index: ${index} for reel ${targetReelIndex}`);
            return false;
        }

        reelSymbols[index].setSymbol(symbolId);
        return true;
    }

    public getSymbolAt(index: number, reelIndex?: number): SpineSymbol | GridSymbol | null {
        const targetReelIndex = reelIndex !== undefined ? reelIndex : this._config.reelIndex;
        const reelSymbols = this._symbols.get(targetReelIndex);
        if (!reelSymbols || index < 0 || index >= reelSymbols.length) {
            return null;
        }

        return reelSymbols[index];
    }

    public getSymbolIdAt(index: number, reelIndex?: number): number | null {
        const targetReelIndex = reelIndex !== undefined ? reelIndex : this._config.reelIndex;
        const reelSymbols = this._symbols.get(targetReelIndex);
        if (!reelSymbols || index < 0 || index >= reelSymbols.length) {
            return null;
        }

        return reelSymbols[index].symbolId;
    }

    public getSymbolCount(reelIndex?: number): number {
        const targetReelIndex = reelIndex !== undefined ? reelIndex : this._config.reelIndex;
        return this._symbols.get(targetReelIndex)?.length || 0;
    }

    public getVisibleSymbols(reelIndex?: number): SpineSymbol[] {
        const targetReelIndex = reelIndex !== undefined ? reelIndex : this._config.reelIndex;
        const reelSymbols = this._symbols.get(targetReelIndex);
        if (!reelSymbols) return [];
        // Return only the visible symbols (exclude the buffer symbols)
        if (reelSymbols.length === this._config.symbolsVisible + 2) {
            return reelSymbols.slice(0, this._config.symbolsVisible + 1);
        }
        return reelSymbols;
    }

    public addSymbol(symbolId: number, position?: number, reelIndex?: number): void {
        const targetReelIndex = reelIndex !== undefined ? reelIndex : this._config.reelIndex;
        const symbol = new SpineSymbol({
            symbolId: symbolId,
            position: {
                x: 0,
                y: 0 // Will be set by repositionSymbols
            }
        });

        const reelSymbols = this._symbols.get(targetReelIndex);
        if (!reelSymbols) {
            this._symbols.set(targetReelIndex, [symbol]);
            this.addChild(symbol);
        } else {
            if (position !== undefined && position >= 0 && position <= reelSymbols.length) {
                // Insert at specific position
                reelSymbols.splice(position, 0, symbol);
                this.addChildAt(symbol, position);
            } else {
                // Add at the end
                reelSymbols.push(symbol);
                this.addChild(symbol);
            }
        }
    }

    public removeSymbolAt(index: number, reelIndex?: number): boolean {
        const targetReelIndex = reelIndex !== undefined ? reelIndex : this._config.reelIndex;
        const reelSymbols = this._symbols.get(targetReelIndex);
        if (!reelSymbols || index < 0 || index >= reelSymbols.length) {
            debug.warn('StaticContainer: Invalid symbol index for removal:', index);
            return false;
        }

        const symbol = reelSymbols[index];
        this.removeChild(symbol);
        symbol.destroy();
        reelSymbols.splice(index, 1);

        return true;
    }

    public clearSymbols(reelIndex?: number): void {
        // Clear symbols for ALL reels
        const targetReelIndex = reelIndex !== undefined ? reelIndex : this._config.reelIndex;
        const reelSymbols = this._symbols.get(targetReelIndex);
        if (reelSymbols) {
            reelSymbols.forEach(symbol => {
                this.removeChild(symbol);
                symbol.destroy();
            });
        }
        this._symbols.delete(targetReelIndex); // Clear the specific reel's Map entry
    }

    public getAllSymbols(reelIndex?: number): SpineSymbol[] {
        // Return symbols from ALL reels
        const targetReelIndex = reelIndex !== undefined ? reelIndex : this._config.reelIndex;
        const allSymbols: SpineSymbol[] = [];
        const reelSymbols = this._symbols.get(targetReelIndex);
        if (reelSymbols) {
            allSymbols.push(...reelSymbols);
        }
        return allSymbols;
    }

    public clone(reelIndex?: number): StaticContainer {
        const targetReelIndex = reelIndex !== undefined ? reelIndex : this._config.reelIndex;
        const clonedContainer = new StaticContainer(this._app, this._config, this._initialGrid);

        // Copy current symbol IDs
        const symbolIds = this._symbols.get(targetReelIndex)?.map(symbol => symbol.symbolId) || [];
        clonedContainer.setSymbolsFromServerData(symbolIds, targetReelIndex);

        return clonedContainer;
    }

    // Position calculation utilities
    protected calculateSymbolX(column: number = 0): number {
        const symbolWidth = GameConfig.REFERENCE_SYMBOL.width;

        const spacingX = GameConfig.REFERENCE_SPACING.horizontal;

        const reelX = (((column - Math.floor(GameConfig.GRID_LAYOUT.columns / 2)) * (symbolWidth + spacingX)) + (GameConfig.REFERENCE_RESOLUTION.width / 2)) + ((GameConfig.GRID_LAYOUT.columns % 2 == 0) ? (symbolWidth + spacingX) / 2 : 0); // Center of symbol

        return reelX; // Center in container
    }

    protected calculateSymbolY(row: number): number {
        const symbolHeight = GameConfig.REFERENCE_SYMBOL.height;

        const spacingY = GameConfig.REFERENCE_SPACING.vertical;

        const symbolY = (((row - Math.floor(GameConfig.GRID_LAYOUT.visibleRows / 2)) * (symbolHeight + spacingY)) + GameConfig.REFERENCE_RESOLUTION.height / 2) + ((GameConfig.GRID_LAYOUT.visibleRows % 2 == 0) ? (symbolHeight + spacingY) / 2 : 0);

        return symbolY;
    }

    // Getters
    public get reelIndex(): number {
        return this._config.reelIndex;
    }

    public get symbolsVisible(): number {
        return this._config.symbolsVisible;
    }

    public get symbolHeight(): number {
        return this._config.symbolHeight;
    }

    public get isPlaying(): boolean {
        return this._isPlaying;
    }

    public get isLooping(): boolean {
        return this._isLooping;
    }

    public get allowLoop(): boolean {
        return this._allowLoop;
    }

    public set allowLoop(value: boolean) {
        this._allowLoop = value;
    }

    public get isFreeSpinMode(): boolean {
        return this._isFreeSpinMode;
    }

    public set isFreeSpinMode(value: boolean) {
        this._isFreeSpinMode = value;
    }

    public destroy(): void {
        // Clean up symbols (they handle their own responsive cleanup)
        // this.clearSymbols();

        // Destroy the container
        super.destroy({ children: true });
    }
} 