import { Container, Application, Sprite } from 'pixi.js';
import { ResponsiveManager } from '../controllers/ResponsiveSystem';
import { GameConfig } from '../../config/GameConfig';
import { SymbolConfig } from '../../config/SymbolConfig';
import { SymbolUtils } from '../symbol/SymbolUtils';
import { GridSymbol } from '../symbol/GridSymbol';
import { Symbol } from '../symbol/Symbol';
import { GameRulesConfig } from '../../config/GameRulesConfig';
import { signals, SCREEN_SIGNALS, SignalSubscription } from '../controllers/SignalManager';
import {
    SymbolData,
    InitialGridData,
    CascadeStepData,
    DropData,
    GridUtils,
    ISpinState
} from '../types/GameTypes';
import { IReelMode } from './ReelController';
import { Utils } from '../Utils';
import { debug } from '../utils/debug';

export interface SpinContainerConfig {
    reelIndex: number; // TODO: Remove when refactoring to single container
    symbolHeight: number;
    symbolsVisible: number;
    numberOfReels?: number; // TODO: Use this for single container approach
    rowsAboveMask?: number;
    rowsBelowMask?: number;
    spinSpeed?: number;
    spinDuration?: number;
}


export class SpinContainer extends Container {
    protected app: Application;
    protected responsiveManager: ResponsiveManager;
    protected config: SpinContainerConfig;
    protected resizeSubscription?: SignalSubscription;

    // Mode and state
    protected currentMode: IReelMode = IReelMode.STATIC;
    protected isSpinning: boolean = false;

    // Grid layout properties
    protected readonly columns: number; // Number of reels
    protected readonly rowsAboveMask: number;
    protected readonly rowsBelowMask: number;
    protected readonly totalRows: number;

    // Symbol storage - unified approach
    public symbols: (GridSymbol | Sprite | null)[][] = [];
    public animationSymbols: Sprite[] = []; // For spinning animations

    // Animation state
    protected spinStartTime: number = 0;
    protected targetSymbols: number[] = [];
    protected onSpinCompleteCallback?: () => void;

    constructor(app: Application, responsiveManager: ResponsiveManager, config: SpinContainerConfig) {
        super();

        this.app = app;
        this.responsiveManager = responsiveManager;
        this.config = config;

        // Initialize grid layout properties
        this.columns = config.numberOfReels || 1; // Default to 1 if not provided
        this.rowsAboveMask = config.rowsAboveMask || GameConfig.GRID_LAYOUT.rowsAboveMask;
        this.rowsBelowMask = config.rowsBelowMask || GameConfig.GRID_LAYOUT.rowsBelowMask;
        this.totalRows = config.symbolsVisible + this.rowsAboveMask + this.rowsBelowMask;

        this.setupContainer();
        this.initializeGrid();
        this.setupResizeHandler();
    }

    // Container setup
    protected setupContainer(): void {
        // Don't create individual masks - let the parent handle masking for the whole reel area
        debug.log(`SpinContainer ${this.config.reelIndex}: Container setup complete`);
    }

    // createMask method removed - no individual container masks

    protected async initializeGrid(): Promise<void> {
        this.symbols = [];
        for (let col = 0; col < this.columns; col++) {
            this.symbols[col] = [];
            for (let row = 0; row < (this.config.symbolsVisible + this.rowsBelowMask + this.rowsAboveMask); row++) {
                const symbol = this.createGridSymbol({ symbolId: 0 }, col, row);
                this.symbols[col][row] = symbol;
            }
        }
        //await this.delay(1000);;
        this.updateScale();
        this.updateSymbolPositions();
    }

    // Utility methods
    protected delay(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    protected setupResizeHandler(): void {
        this.resizeSubscription = signals.on(SCREEN_SIGNALS.SCREEN_RESIZE, () => {
            //this.onResize();
        });
    }

    protected onResize(): void {
        this.updateScale();
        this.updateSymbolPositions();
    }

    protected updateScale(): void {
        const symbolScale = GameConfig.getReferenceSymbolScale(this.app.screen.width, this.app.screen.height);

        // Update scales for all symbols
        for (let col = 0; col < this.columns; col++) {
            for (let row = 0; row < this.symbols[col].length; row++) {
                const symbol = this.symbols[col][row];
                if (symbol) {
                    symbol.scale.set(symbolScale[0] * GameConfig.REFERENCE_SYMBOL.scale, symbolScale[1] * GameConfig.REFERENCE_SYMBOL.scale);
                }
            }
        }

        // Update animation symbols if spinning
        this.animationSymbols.forEach(symbol => {
            symbol.scale.set(symbolScale[0], symbolScale[1]);
        });
    }

    protected updateSymbolPositions(): void {
        // Update positions for grid symbols
        for (let col = 0; col < this.columns; col++) {
            for (let row = 0; row < this.config.symbolsVisible + this.rowsAboveMask + this.rowsBelowMask + 1; row++) {
                const gridIndex = row + this.rowsAboveMask;
                const symbol = this.symbols[col][gridIndex];
                if (symbol) {
                    const x = this.calculateSymbolX(col);
                    const y = this.calculateSymbolY(row);
                    symbol.x = x;
                    symbol.y = y;
                }
            }
        }

        // Update positions for animation symbols (spinning symbols) during resize
        /*if (this.isSpinning && this.animationSymbols.length > 0) {
            
            // Recreate animation symbols with correct positions for new screen size
            // This ensures spinning symbols maintain proper spacing during resize
            this.clearAnimationSymbols();
            this.createSpinningSymbols();
            
            debug.log(`SpinContainer ${this.config.reelIndex}: Recreated animation symbols for resize`);
        }*/
    }

    // Position calculation utilities
    protected calculateSymbolX(_column: number = 0): number {
        const scaledSymbol = GameConfig.getScaledSymbolSize(this.app.screen.width, this.app.screen.height);
        const symbolScale = GameConfig.getReferenceSymbolScale(this.app.screen.width, this.app.screen.height);
        const symbolWidth = scaledSymbol.width;
        const symbolHeight = scaledSymbol.height;
        const spacingX = GameConfig.REFERENCE_SPACING.horizontal * scaledSymbol.scale;
        const middle = this.app.screen.width / 2;
        const adjusted = (_column - 2) * (symbolWidth + spacingX);
        const reelX = adjusted; // Center of symbol 
        return reelX; // Center in container
    }

    protected calculateSymbolY(row: number): number {
        const verticalSpacing = SymbolUtils.calculateVerticalSpacing(this.app.screen.width, this.app.screen.height);
        const symbolY = (row - SymbolConfig.getGridCenterRow(this.config.symbolsVisible) - (this.config.rowsAboveMask || 0)) * verticalSpacing;
        return symbolY * this.app.screen.height;
    }

    protected calculateGridIndex(row: number): number {
        return row + this.rowsAboveMask;
    }

    // Add vertical spacing calculation (like StaticContainer)
    protected getVerticalSpacing(): number {
        // Calculate vertical spacing between symbol centers
        const referenceSymbolHeight = GameConfig.REFERENCE_SYMBOL.height;
        const referenceSpacingY = GameConfig.REFERENCE_SPACING.vertical; // Should be 0 for touching symbols

        const scaledSymbol = GameConfig.getScaledSymbolSize(this.app.screen.width, this.app.screen.height);
        const actualCenterToCenterY = (referenceSymbolHeight + referenceSpacingY) * scaledSymbol.scale;

        return actualCenterToCenterY / this.app.screen.height;
    }

    // Mode management
    public setMode(mode: IReelMode): void {
        if (this.currentMode === mode) return;

        this.currentMode = mode;
        debug.log(`SpinContainer ${this.config.reelIndex}: Switched to ${mode} mode`);
    }

    public getMode(): IReelMode {
        return this.currentMode;
    }

    // Symbol management - unified API
    public setSymbols(symbols: number[], reelIndex?: number): void {
        // If reelIndex not provided, fall back to config.reelIndex for backward compatibility
        const targetReelIndex = reelIndex !== undefined ? reelIndex : this.config.reelIndex;

        //this.clearSymbolsForReel(targetReelIndex);

        if (this.currentMode === 'cascading') {
            this.setGridSymbols(symbols, targetReelIndex);
        } else {
            this.setBasicSymbols(symbols, targetReelIndex);
        }

        this.updateScale();
        this.updateSymbolPositions();
    }

    protected clearSymbolsForReel(reelIndex: number): void {
        // Clear existing symbols for this specific reel
        if (this.symbols[reelIndex]) {
            for (let row = 0; row < this.symbols[reelIndex].length; row++) {
                const symbol = this.symbols[reelIndex][row];
                if (symbol) {
                    this.removeChild(symbol);
                    if ('destroy' in symbol) {
                        symbol.destroy();
                    }
                    this.symbols[reelIndex][row] = null;
                }
            }
        }
    }

    protected setGridSymbols(symbols: number[], reelIndex: number): void {
        // Create symbols with buffer for smooth scrolling (like StaticContainer)
        const totalSymbols = this.config.symbolsVisible + (this.config.rowsAboveMask || 0) + (this.config.rowsBelowMask || 0); // 1 above + visible + 1 below
        const symbolsToCreate = Math.max(totalSymbols, symbols.length);

        // Calculate the middle symbol index
        const middleSymbolIndex = Math.floor(totalSymbols / 2);

        for (let i = 0; i < symbolsToCreate; i++) {
            // Calculate vertical position using proper spacing (like StaticContainer)
            const verticalSpacing = this.getVerticalSpacing();
            const symbolY = (i - middleSymbolIndex) * verticalSpacing;

            // Get symbol ID 
            const symbolId = i < symbols.length ? symbols[i] : 0;
            const symbolData: SymbolData = { symbolId };
            const index = reelIndex * this.config.symbolsVisible + i;

            const gridSymbol = this.createGridSymbol(symbolData, reelIndex, index);

            if (gridSymbol) {
                const gridIndex = this.calculateGridIndex(i);
                this.symbols[reelIndex][gridIndex] = gridSymbol;
            }
        }
    }

    protected setBasicSymbols(symbols: number[], reelIndex: number): void {
        this.clearSymbolsForReel(reelIndex);
        // Create symbols with buffer for smooth scrolling (like StaticContainer)
        const totalSymbols = this.config.symbolsVisible + (this.config.rowsAboveMask || 0) + (this.config.rowsBelowMask || 0); // 1 above + visible + 1 below
        const symbolsToCreate = Math.max(totalSymbols, symbols.length);

        // Calculate the middle symbol index
        const middleSymbolIndex = Math.floor(totalSymbols / 2);

        // Calculate actual pixel positions
        const scaledSymbol = GameConfig.getScaledSymbolSize(this.app.screen.width, this.app.screen.height);
        const symbolWidth = scaledSymbol.width;
        const symbolHeight = scaledSymbol.height;
        const spacingX = GameConfig.REFERENCE_SPACING.horizontal * scaledSymbol.scale;
        const spacingY = GameConfig.REFERENCE_SPACING.vertical * scaledSymbol.scale;

        // Calculate horizontal position for this reel (actual pixels)
        const totalWidth = 5 * symbolWidth + 4 * spacingX; // 5 reels, 4 gaps
        const startX = (this.app.screen.width - totalWidth) / 2;
        const reelX = startX + reelIndex * (symbolWidth + spacingX) + symbolWidth / 2; // Center of symbol

        for (let i = 0; i < symbolsToCreate; i++) {
            // Calculate vertical position (actual pixels)
            const symbolY = this.app.screen.height / 2 + (i - middleSymbolIndex - (this.config.rowsAboveMask || 0)) * (symbolHeight + spacingY);

            // Get symbol ID
            const symbolId = i < symbols.length ? symbols[i] : 0;

            // Create symbol with container positioning to avoid conflicts with ReelsContainer offset
            const symbol = new Symbol(this.responsiveManager, {
                symbolId: symbolId,
                position: {
                    x: reelX - this.app.screen.width / 2, // Offset for container position
                    y: symbolY - this.app.screen.height / 2 // Offset for container position
                },
                useContainerPositioning: true // Use container coordinates
            });

            // Add to container and grid
            this.addChild(symbol);
            const gridIndex = this.calculateGridIndex(i);
            this.symbols[reelIndex][gridIndex] = symbol;
        }

        debug.log(`SpinContainer: Created ${symbolsToCreate} symbols for reel ${reelIndex} using pixel coordinates`);
    }

    // Symbol creation
    protected createGridSymbol(symbolData: SymbolData, column: number, row: number): GridSymbol | null {
        //const { column, row } = GridUtils.indexToPosition(index);

        /*if (column !== this.config.reelIndex) {
            return null;
        }*/

        const symbolX = this.calculateSymbolX();
        const symbolY = this.calculateSymbolY(row);

        const { uniformScale } = GameConfig.getScaleFactors(this.app.screen.width, this.app.screen.height);
        const spriteToReferenceScale = SymbolConfig.getSpriteToReferenceScale();
        const finalScale = spriteToReferenceScale * uniformScale;

        const gridSymbol = new GridSymbol(this.responsiveManager, {
            symbolId: symbolData.symbolId,
            position: { x: symbolX, y: symbolY },
            scale: finalScale * GameConfig.REFERENCE_SYMBOL.scale, // Use reference scale
            useContainerPositioning: true,
            gridX: column,
            gridY: row
        });

        //this.addChild(gridSymbol);
        return gridSymbol;
    }

    protected createBasicSprite(symbolId: number, y: number): Sprite {
        const texture = SymbolUtils.getTextureForSymbol(symbolId);
        const sprite = new Sprite(texture);
        
        // Use proper responsive sizing like StaticContainer (not fixed config.symbolHeight)
        const { uniformScale } = GameConfig.getScaleFactors(this.app.screen.width, this.app.screen.height);
        const spriteToReferenceScale = SymbolConfig.getSpriteToReferenceScale();
        const finalScale = spriteToReferenceScale * uniformScale;

        sprite.scale.set(finalScale * GameConfig.REFERENCE_SYMBOL.scale);
        sprite.anchor.set(0.5);
        sprite.x = 0; // Will be set by caller
        sprite.y = y - this.app.screen.height / 2; // Offset for container position
        
        //this.addChild(sprite);
        return sprite;
    }

    // Spinning functionality
    public startSpin(targetSymbols: number[], onComplete?: () => void): boolean {
        if (this.isSpinning) return false;

        this.isSpinning = true;
        this.spinStartTime = Date.now();
        this.targetSymbols = [...targetSymbols];
        this.onSpinCompleteCallback = onComplete;

        // Clear all existing symbols before starting spin animation
        //this.clearAllSymbols();

        //this.createSpinningSymbols();
        //this.animateSpin();

        return true;
    }

    protected createSpinningSymbols(): void {
        this.clearAnimationSymbols();

        const totalSymbols = this.config.symbolsVisible + 10; // Extra symbols for smooth animation
        const middleSymbolIndex = Math.floor(totalSymbols / 2);

        // Calculate actual pixel positions
        const scaledSymbol = GameConfig.getScaledSymbolSize(this.app.screen.width, this.app.screen.height);
        const symbolWidth = scaledSymbol.width;
        const symbolHeight = scaledSymbol.height;
        const spacingX = GameConfig.REFERENCE_SPACING.horizontal * scaledSymbol.scale;
        const spacingY = GameConfig.REFERENCE_SPACING.vertical * scaledSymbol.scale;

        // Create spinning symbols for ALL reels
        for (let reelIndex = 0; reelIndex < this.columns; reelIndex++) {

            for (let i = 0; i < totalSymbols; i++) {
                const randomSymbolId = this.getRandomSymbolId();

                // Calculate vertical position (actual pixels)
                const symbolY = this.app.screen.height / 2 + (i - middleSymbolIndex) * (symbolHeight + spacingY);

                const symbol = this.createBasicSprite(randomSymbolId, symbolY);
                symbol.x = this.app.screen.width / 2; // Offset for container position
                //this.animationSymbols.push(symbol);
            }
        }

        debug.log(`SpinContainer: Created ${this.animationSymbols.length} spinning symbols for ${this.columns} reels with pixel coordinates`);
    }

    protected animateSpin(): void {
        /*const elapsed = Date.now() - this.spinStartTime;
        const spinDuration = this.config.spinDuration || 2000;
        const spinSpeed = this.config.spinSpeed || 10;
        const progress = Math.min(elapsed / spinDuration, 1);
        
        // Use proper spacing for animation movement
        const verticalSpacing = this.getVerticalSpacing();
        const screenSpacing = verticalSpacing * this.app.screen.height;

        this.animationSymbols.forEach(symbol => {
            symbol.y += spinSpeed;
            
            // Wrap around using proper spacing
            const maxY = screenSpacing * (this.config.symbolsVisible + 5);
            if (symbol.y > maxY) {
                symbol.y -= screenSpacing * this.animationSymbols.length;
            }
        });

        if (progress < 1) {
            requestAnimationFrame(() => this.animateSpin());
        } else {
            this.stopSpin();
        }*/
    }

    protected stopSpin(): void {
        this.isSpinning = false;
        this.clearAnimationSymbols();
        //this.setSymbols(this.targetSymbols);

        if (this.onSpinCompleteCallback) {
            this.onSpinCompleteCallback();
        }
    }

    protected removeSymbolsFromIndices(indicesToRemove: number[]): void {
        indicesToRemove.forEach(index => {
            const { column, row } = GridUtils.indexToPosition(index);
            if (column !== this.config.reelIndex) return;

            const gridIndex = row + this.rowsAboveMask;
            const symbol = this.symbols[this.config.reelIndex][gridIndex];

            if (symbol) {
                this.removeChild(symbol);
                symbol.destroy();
                this.symbols[this.config.reelIndex][gridIndex] = null;
            }
        });
    }

    protected addNewSymbolsFromData(newSymbolsData: SymbolData[], newSymbolIndices: number[]): void {
        newSymbolsData.forEach((symbolData, i) => {
            const index = newSymbolIndices[i];
            const newSymbol = this.createGridSymbol(symbolData, i, index); // Y position is 0 for new symbols

            if (newSymbol) {
                const { column, row } = GridUtils.indexToPosition(index);
                if (column === this.config.reelIndex) {
                    const gridIndex = row + this.rowsAboveMask;
                    this.symbols[this.config.reelIndex][gridIndex] = newSymbol;
                }
            }
        });
    }
    public getBottomSymbolYPos(): number {
        return this.symbols[this.config.reelIndex][this.symbols[this.config.reelIndex].length - 1]?.y || 0;
    }
    public getTopSymbolYPos(): number {
        return this.symbols[this.config.reelIndex][1]?.y || 0;
    }
    // Access methods
    public getSymbolAt(position: number): GridSymbol | Sprite | null {
        const gridIndex = this.calculateGridIndex(position);
        return this.symbols[this.config.reelIndex][gridIndex] || null;
    }

    public getSymbolIdAt(position: number): number | null {
        const symbol = this.getSymbolAt(position);
        if (symbol instanceof GridSymbol) {
            return symbol.symbolId;
        }
        // For basic sprites, we can't retrieve the ID easily
        return null;
    }

    public updateSymbolAt(position: number, symbolId: number): boolean {
        const symbol = this.getSymbolAt(position);
        if (symbol instanceof GridSymbol) {
            symbol.setSymbolId(symbolId);
            return true;
        }
        return false;
    }

    public getSymbolCount(): number {
        let count = 0;
        for (let row = 0; row < this.config.symbolsVisible; row++) {
            const gridIndex = this.calculateGridIndex(row);
            if (this.symbols[this.config.reelIndex][gridIndex]) count++;
        }
        return count;
    }

    // Utility methods
    protected getRandomSymbolId(): number {
        return Math.floor(Math.random() * GameRulesConfig.GRID.totalSymbols);
    }

    public clearSymbols(): void {
        this.symbols.forEach(reel => {
            reel.forEach(symbol => {
                if (symbol === null) return;
                this.removeChild(symbol);
                symbol.destroy();
            });
        });
        this.clearAnimationSymbols();
    }

    protected clearAnimationSymbols(): void {
        this.animationSymbols.forEach(symbol => {
            this.removeChild(symbol);
            symbol.destroy();
        });
        this.animationSymbols = [];
    }

    // Getters
    public get reelIndex(): number {
        return this.config.reelIndex;
    }

    public getIsSpinning(): boolean {
        return this.isSpinning;
    }

    // Cleanup
    public destroy(): void {
        if (this.resizeSubscription) {
            this.resizeSubscription.unsubscribe();
        }

        this.clearSymbols();

        super.destroy();
    }
} 