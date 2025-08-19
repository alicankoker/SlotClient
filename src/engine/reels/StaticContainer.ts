import { Container, Application } from 'pixi.js';
import { GameConfig } from '../../config/GameConfig';
import { SpineSymbol } from '../symbol/SpineSymbol';
import { GridSymbol } from '../symbol/GridSymbol';
import { debug } from '../utils/debug';

export interface StaticContainerConfig {
    reelIndex: number;           // 0-4 for 5 reels
    symbolHeight: number;
    symbolsVisible: number;
    x?: number;                  // Relative X position (0-1)
    y?: number;                  // Relative Y position (0-1)
}

export class StaticContainer extends Container {
    private app: Application;
    private config: StaticContainerConfig;
    private symbolsContainer: Container;
    private symbols: Map<number, SpineSymbol[]> = new Map(); // Map of reelIndex -> symbols array

    constructor(app: Application, config: StaticContainerConfig) {
        super();

        this.app = app;
        this.config = config;
        this.symbolsContainer = new Container();

        // Add containers to this static container
        this.addChild(this.symbolsContainer);
    }

    public setSymbols(symbolIds: number[], reelIndex?: number): void {
        const targetReelIndex = reelIndex !== undefined ? reelIndex : this.config.reelIndex;
        this.clearSymbolsForReel(targetReelIndex);
        this.createSymbolsFromIds(symbolIds, targetReelIndex);
    }

    private clearSymbolsForReel(reelIndex: number): void {
        const reelSymbols = this.symbols.get(reelIndex);
        if (reelSymbols) {
            reelSymbols.forEach(symbol => {
                this.symbolsContainer.removeChild(symbol);
                symbol.destroy();
            });
            this.symbols.delete(reelIndex);
        }
    }

    private createSymbolsFromIds(symbolIds: number[], reelIndex: number): void {
        debug.log(`StaticContainer: Creating symbols for reel ${reelIndex} from IDs:`, symbolIds);

        // Initialize symbols array for this reel
        if (!this.symbols.has(reelIndex)) {
            this.symbols.set(reelIndex, []);
        }
        const reelSymbols = this.symbols.get(reelIndex)!;

        // Create symbols with buffer for smooth scrolling (like original Reel.ts)
        const totalSymbols = this.config.symbolsVisible + 2; // 1 above + visible + 1 below
        const symbolsToCreate = Math.max(totalSymbols, symbolIds.length);

        // Calculate the middle symbol index (for 3 visible + 2 buffer = 5 total, middle visible is index 2)
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
            this.symbolsContainer.addChild(symbol);
            reelSymbols.push(symbol);

            debug.log(`StaticContainer: Symbol ${i} for reel ${reelIndex} added at pixel position (${Math.round(reelX)}, ${Math.round(symbolY)})`);
        }

        debug.log(`StaticContainer: Created ${symbolsToCreate} symbols for reel ${reelIndex}`);
    }

    // Public symbol management methods
    public setSymbolsByIndex(symbolIndexes: number[], reelIndex?: number): void {
        const targetReelIndex = reelIndex !== undefined ? reelIndex : this.config.reelIndex;
        if (symbolIndexes.length !== this.config.symbolsVisible) {
            debug.warn(`StaticContainer: Expected ${this.config.symbolsVisible} symbols, got ${symbolIndexes.length} for reel ${targetReelIndex}`);
            return;
        }

        const visibleSymbols = this.getVisibleSymbols(targetReelIndex);

        visibleSymbols.forEach((symbol, index) => {
            const symbolIndex = symbolIndexes[index];
            symbol.setSymbol(symbolIndex);
        });
    }

    public setSymbolsFromServerData(symbolIds: number[], reelIndex?: number): void {
        const targetReelIndex = reelIndex !== undefined ? reelIndex : this.config.reelIndex;
        const reelSymbols = this.symbols.get(targetReelIndex);

        if (symbolIds.length !== reelSymbols?.length) {
            debug.warn(`StaticContainer: Expected ${reelSymbols?.length} symbols, got ${symbolIds.length} for reel ${targetReelIndex}`);
            return;
        }

        reelSymbols?.forEach((symbol, index) => {
            symbol.setSymbol(symbolIds[index]);
        });
    }

    public updateSymbolAt(index: number, symbolId: number, reelIndex?: number): boolean {
        const targetReelIndex = reelIndex !== undefined ? reelIndex : this.config.reelIndex;
        const reelSymbols = this.symbols.get(targetReelIndex);
        if (!reelSymbols || index < 0 || index >= reelSymbols.length) {
            debug.warn(`StaticContainer: Invalid symbol index: ${index} for reel ${targetReelIndex}`);
            return false;
        }

        reelSymbols[index].setSymbol(symbolId);
        return true;
    }

    public getSymbolAt(index: number, reelIndex?: number): SpineSymbol | GridSymbol | null {
        const targetReelIndex = reelIndex !== undefined ? reelIndex : this.config.reelIndex;
        const reelSymbols = this.symbols.get(targetReelIndex);
        if (!reelSymbols || index < 0 || index >= reelSymbols.length) {
            return null;
        }

        return reelSymbols[index];
    }

    public getSymbolIdAt(index: number, reelIndex?: number): number | null {
        const targetReelIndex = reelIndex !== undefined ? reelIndex : this.config.reelIndex;
        const reelSymbols = this.symbols.get(targetReelIndex);
        if (!reelSymbols || index < 0 || index >= reelSymbols.length) {
            return null;
        }

        return reelSymbols[index].symbolId;
    }

    public getSymbolCount(reelIndex?: number): number {
        const targetReelIndex = reelIndex !== undefined ? reelIndex : this.config.reelIndex;
        return this.symbols.get(targetReelIndex)?.length || 0;
    }

    public getVisibleSymbols(reelIndex?: number): SpineSymbol[] {
        const targetReelIndex = reelIndex !== undefined ? reelIndex : this.config.reelIndex;
        const reelSymbols = this.symbols.get(targetReelIndex);
        if (!reelSymbols) return [];
        // Return only the visible symbols (exclude the buffer symbols)
        if (reelSymbols.length === this.config.symbolsVisible + 2) {
            return reelSymbols.slice(1, this.config.symbolsVisible + 1);
        }
        return reelSymbols;
    }

    public addSymbol(symbolId: number, position?: number, reelIndex?: number): void {
        const targetReelIndex = reelIndex !== undefined ? reelIndex : this.config.reelIndex;
        const symbol = new SpineSymbol({
            symbolId: symbolId,
            position: {
                x: 0,
                y: 0 // Will be set by repositionSymbols
            }
        });

        const reelSymbols = this.symbols.get(targetReelIndex);
        if (!reelSymbols) {
            this.symbols.set(targetReelIndex, [symbol]);
            this.symbolsContainer.addChild(symbol);
        } else {
            if (position !== undefined && position >= 0 && position <= reelSymbols.length) {
                // Insert at specific position
                reelSymbols.splice(position, 0, symbol);
                this.symbolsContainer.addChildAt(symbol, position);
            } else {
                // Add at the end
                reelSymbols.push(symbol);
                this.symbolsContainer.addChild(symbol);
            }
        }
    }

    public removeSymbolAt(index: number, reelIndex?: number): boolean {
        const targetReelIndex = reelIndex !== undefined ? reelIndex : this.config.reelIndex;
        const reelSymbols = this.symbols.get(targetReelIndex);
        if (!reelSymbols || index < 0 || index >= reelSymbols.length) {
            debug.warn('StaticContainer: Invalid symbol index for removal:', index);
            return false;
        }

        const symbol = reelSymbols[index];
        this.symbolsContainer.removeChild(symbol);
        symbol.destroy();
        reelSymbols.splice(index, 1);

        return true;
    }

    public clearSymbols(reelIndex?: number): void {
        // Clear symbols for ALL reels
        const targetReelIndex = reelIndex !== undefined ? reelIndex : this.config.reelIndex;
        const reelSymbols = this.symbols.get(targetReelIndex);
        if (reelSymbols) {
            reelSymbols.forEach(symbol => {
                this.symbolsContainer.removeChild(symbol);
                symbol.destroy();
            });
        }
        this.symbols.delete(targetReelIndex); // Clear the specific reel's Map entry
    }

    public getAllSymbols(reelIndex?: number): SpineSymbol[] {
        // Return symbols from ALL reels
        const targetReelIndex = reelIndex !== undefined ? reelIndex : this.config.reelIndex;
        const allSymbols: SpineSymbol[] = [];
        const reelSymbols = this.symbols.get(targetReelIndex);
        if (reelSymbols) {
            allSymbols.push(...reelSymbols);
        }
        return allSymbols;
    }

    public clone(reelIndex?: number): StaticContainer {
        const targetReelIndex = reelIndex !== undefined ? reelIndex : this.config.reelIndex;
        const clonedContainer = new StaticContainer(this.app, this.config);

        // Copy current symbol IDs
        const symbolIds = this.symbols.get(targetReelIndex)?.map(symbol => symbol.symbolId) || [];
        clonedContainer.setSymbolsFromServerData(symbolIds, targetReelIndex);

        return clonedContainer;
    }

    // Getters
    public get reelIndex(): number {
        return this.config.reelIndex;
    }

    public get symbolsVisible(): number {
        return this.config.symbolsVisible;
    }

    public get symbolHeight(): number {
        return this.config.symbolHeight;
    }

    public destroy(): void {
        // Clean up symbols (they handle their own responsive cleanup)
        this.clearSymbols();

        // Destroy the container
        super.destroy({ children: true });
    }
} 