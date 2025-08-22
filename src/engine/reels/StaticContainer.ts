import { Container, Application, Text, FillGradient, TextStyle } from 'pixi.js';
import { GameConfig } from '../../config/GameConfig';
import { SpineSymbol } from '../symbol/SpineSymbol';
import { GridSymbol } from '../symbol/GridSymbol';
import { debug } from '../utils/debug';
import { WinConfig } from '../types/GameTypes';
import { gsap } from 'gsap';

export interface StaticContainerConfig {
    reelIndex: number;           // 0-4 for 5 reels
    symbolHeight: number;
    symbolsVisible: number;
    x?: number;                  // Relative X position (0-1)
    y?: number;                  // Relative Y position (0-1)
}

const fillGradientStops: FillGradient = new FillGradient({
    colorStops: [
        {
            offset: 0,
            color: 0xffffff
        },
        {
            offset: 0.7,
            color: 0xffffff
        },
        {
            offset: 1,
            color: 0xa2bdfb
        }
    ]
});

const style: TextStyle = new TextStyle({
    dropShadow: {
        angle: 1.5,
        color: 0x142c54,
        distance: 4.5
    },
    fill: fillGradientStops,
    fontFamily: "Nunito Black",
    fontSize: 42,
    fontWeight: "bolder",
    stroke: {
        color: 0x142c54,
        width: 6,
        join: 'round'
    },
    align: 'center'
});

export class StaticContainer extends Container {
    private _app: Application;
    private _config: StaticContainerConfig;
    private _symbolsContainer: Container;
    private _symbols: Map<number, SpineSymbol[]> = new Map(); // Map of reelIndex -> symbols array
    private _winDatas: WinConfig[] = [];
    private _winText: Text;
    private _isPlaying: boolean = false;
    private _isLooping: boolean = false;
    private _isSkipped: boolean = false;

    private _pendingResolvers: (() => void)[] = [];

    constructor(app: Application, config: StaticContainerConfig) {
        super();

        this._app = app;
        this._config = config;
        this._symbolsContainer = new Container();

        // Add containers to this static container
        this.addChild(this._symbolsContainer);

        this._winText = new Text({ text: '', style });
        this._winText.anchor.set(0.5);
        this._winText.position.set(GameConfig.REFERENCE_RESOLUTION.width / 2, 240);
        this._winText.visible = false;
        this.addChild(this._winText);
    }

    /**
     * @description Sets the symbols for the specified reel.
     * @param symbolIds - The array of symbol IDs to set.
     * @param reelIndex - The index of the reel to set (optional).
     * @return void
     */
    public setSymbols(symbolIds: number[], reelIndex?: number): void {
        const targetReelIndex = reelIndex !== undefined ? reelIndex : this._config.reelIndex;
        this.createSymbolsFromIds(symbolIds, targetReelIndex);
    }

    /**
     * @description Updates the symbols in the static container for the specified reel.
     * @param symbolIds - The array of symbol IDs to update.
     * @param reelIndex - The index of the reel to update (optional).
     * @returns void
     */
    public updateSymbols(symbolIds: number[], reelIndex?: number): Promise<void[]> {
        const targetReelIndex = reelIndex !== undefined ? reelIndex : this._config.reelIndex;

        return Promise.all((this._symbols.get(targetReelIndex) ?? []).map(async (symbol, index) => {
            if (symbolIds[index] !== undefined) {
                await symbol.setSymbol(symbolIds[index]);
            }
        }));
    }

    private createSymbolsFromIds(symbolIds: number[], reelIndex: number): void {
        debug.log(`StaticContainer: Creating symbols for reel ${reelIndex} from IDs:`, symbolIds);

        // Initialize symbols array for this reel
        if (!this._symbols.has(reelIndex)) {
            this._symbols.set(reelIndex, []);
        }
        const reelSymbols = this._symbols.get(reelIndex)!;

        // Create symbols with buffer for smooth scrolling (like original Reel.ts)
        const totalSymbols = this._config.symbolsVisible;
        const symbolsToCreate = Math.max(totalSymbols, symbolIds.length);

        // Calculate the middle symbol index
        const middleSymbolIndex = Math.floor(totalSymbols / 2);

        const symbolWidth = GameConfig.REFERENCE_SYMBOL.width;
        const symbolHeight = GameConfig.REFERENCE_SYMBOL.height;

        const spacingX = GameConfig.REFERENCE_SPACING.horizontal;
        const spacingY = GameConfig.REFERENCE_SPACING.vertical;

        const reelX = ((reelIndex - 2) * (symbolWidth + spacingX)) + (GameConfig.REFERENCE_RESOLUTION.width / 2); // Center of symbol

        for (let i = 0; i < symbolsToCreate; i++) {
            // Calculate vertical position (actual pixels)
            const symbolY = ((i - middleSymbolIndex) * (symbolHeight + spacingY)) + GameConfig.REFERENCE_RESOLUTION.height / 2;

            // Get symbol ID (use provided IDs or generate random for testing)
            const symbolId = i < symbolIds.length ? symbolIds[i] : Math.floor(Math.random() * 10);

            debug.log(`StaticContainer: Creating symbol ${i} for reel ${reelIndex} with ID ${symbolId} at pixel position (${Math.round(reelX)}, ${Math.round(symbolY)})`);

            // Create symbol with container positioning to avoid conflicts with ReelsContainer offset
            const symbol = new SpineSymbol({
                symbolId: symbolId,
                position: {
                    x: reelX, // Offset for container position
                    y: symbolY // Offset for container position
                },
                scale: GameConfig.REFERENCE_SYMBOL.scale, // Use responsive scale
            });

            // Add to symbols container and array
            this._symbolsContainer.addChild(symbol);
            reelSymbols.push(symbol);

            debug.log(`StaticContainer: Symbol ${i} for reel ${reelIndex} added at pixel position (${Math.round(reelX)}, ${Math.round(symbolY)})`);
        }

        debug.log(`StaticContainer: Created ${symbolsToCreate} symbols for reel ${reelIndex}`);
    }

    public async setAnimation(winDatas: WinConfig[]): Promise<void> {
        this.resetWinAnimations();

        this._winDatas = winDatas;

        this._isPlaying = true;
        this._isSkipped = false;
        this._isLooping = false;

        await this.playWinAnimations(winDatas);

        if (GameConfig.WIN_ANIMATION.winLoop) {
            await this.delay(GameConfig.WIN_ANIMATION.delayBeforeLoop || 2000);

            this._isLooping = true;
            this._isSkipped = false;

            while (this._isLooping) {
                await this.playWinAnimations(winDatas);

                await this.delay(GameConfig.WIN_ANIMATION.delayBetweenLoops || 1000);
            }
        }
    }

    private delay(ms: number): Promise<void> {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }

    public async playWinAnimations(winDatas: WinConfig[]): Promise<void> {
        // Play win animations based on the provided data
        for (const winData of winDatas) {
            debug.log(`StaticContainer: Playing win animation for win data:`, winData);
            console.log(winData);

            if (GameConfig.WIN_ANIMATION.winTextVisibility) {
                // Play win text animation
                gsap.fromTo(this._winText.scale, { x: 0, y: 0 }, {
                    x: 1, y: 1, duration: 0.25, ease: 'back.out(1.7)', onStart: () => {
                        this._winText.text = `You won ${winData.amount}€${winData.multiplier > 1 ? ` with X${winData.multiplier} multipliers` : ''}!`;
                        this._winText.visible = true;
                    }
                });
            }

            // play all symbol animations on this win
            await Promise.all(
                winData.symbolIds.map(async (symbolId, index) => {
                    return new Promise<void>((resolve) => {
                        this._pendingResolvers.push(resolve);

                        if (this._isSkipped) {
                            resolve();
                            return;
                        }

                        this._symbols.get(index)?.[symbolId]?.setWinAnimation(false, () => {
                            // set idle right after completion of each symbol animation
                            // this._symbols.get(index)?.[symbolId]?.setIdle();
                            resolve();
                        });
                    });
                })
            ).then(() => {
                // after all symbols have played their win animations, set them to idle
                if (!this._isSkipped) {
                    this._pendingResolvers = [];

                    winData.symbolIds.forEach((symbolId, index) => {
                        this._symbols.get(index)?.[symbolId]?.setIdle();
                    });
                }
            });
        }

        if (GameConfig.WIN_ANIMATION.winTextVisibility) {
            gsap.to(this._winText.scale, {
                x: 0, y: 0, duration: 0.25, ease: 'back.in(1.7)', onComplete: () => {
                    this._winText.text = ``;
                    this._winText.visible = false;
                }
            });
        }

        this._isPlaying = false;
    }

    public skipWinAnimations(): void {
        if (!this._isPlaying || this._isLooping) return;

        this._isSkipped = true;

        this._pendingResolvers.forEach(resolve => resolve());
        this._pendingResolvers = [];

        this._symbols.forEach((reelSymbols) => {
            reelSymbols.forEach((symbol) => {
                symbol.setIdle();
            });
        });
    }

    public resetWinAnimations(): void {
        this._isPlaying = false;
        this._isLooping = false;
        this._isSkipped = false;
        this._winDatas = [];

        this._winText.text = ``;
        this._winText.scale.set(0);
        this._winText.visible = false;

        this._pendingResolvers.forEach(resolve => resolve());
        this._pendingResolvers = [];

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
            return reelSymbols.slice(1, this._config.symbolsVisible + 1);
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
            this._symbolsContainer.addChild(symbol);
        } else {
            if (position !== undefined && position >= 0 && position <= reelSymbols.length) {
                // Insert at specific position
                reelSymbols.splice(position, 0, symbol);
                this._symbolsContainer.addChildAt(symbol, position);
            } else {
                // Add at the end
                reelSymbols.push(symbol);
                this._symbolsContainer.addChild(symbol);
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
        this._symbolsContainer.removeChild(symbol);
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
                this._symbolsContainer.removeChild(symbol);
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
        const clonedContainer = new StaticContainer(this._app, this._config);

        // Copy current symbol IDs
        const symbolIds = this._symbols.get(targetReelIndex)?.map(symbol => symbol.symbolId) || [];
        clonedContainer.setSymbolsFromServerData(symbolIds, targetReelIndex);

        return clonedContainer;
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

    public destroy(): void {
        // Clean up symbols (they handle their own responsive cleanup)
        this.clearSymbols();

        // Destroy the container
        super.destroy({ children: true });
    }
} 