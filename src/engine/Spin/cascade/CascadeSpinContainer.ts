import { Application, Graphics } from "pixi.js";
import { SpinContainer, SpinContainerConfig } from "../SpinContainer";
import { CascadeStepData, DropData, GridUtils, InitialGridData, SpinData, SymbolData } from "../../types/GameTypes";
import { debug } from "../../utils/debug";
import { GameRulesConfig } from "../../../config/GameRulesConfig";
import { GameConfig } from "../../../config/GameConfig";
import { gsap } from "gsap";

export class CascadeSpinContainer extends SpinContainer {
    private reelAreaMask: Graphics = new Graphics();

    constructor(app: Application, config: SpinContainerConfig) {
        super(app, config);
        this.createReelAreaMask();
    }

    public clearSymbols(): void {
        // Clear all symbols from the grid 
        for (let col = 0; col < this.columns; col++) {
            for (let row = 0; row < this.totalRows; row++) {
                const symbol = this.symbols[col][row];
                if (symbol) {
                    this.removeChild(symbol);
                    symbol.destroy();
                    this.symbols[col][row] = null;
                }
            }
        }
        // Clear all symbols from the animation symbols
        super.clearSymbols();
    }

    // Cascading functionality
    public displayInitialGrid(gridData: InitialGridData): void {
        debug.log(`SpinContainer ${this.config.reelIndex}: Displaying initial grid`);
        this.clearSymbols();
        this.updateGridFromData(gridData);
        //this.updateScale();
        //this.updateSymbolPositions();
    }

    public async processCascadeStep(stepData: CascadeStepData): Promise<void> {
        debug.log(`CascadeSpinContainer: Processing cascade step ${stepData.step}`);
        
        // Step 1: Remove matched symbols with animation
        await this.removeSymbolsWithAnimation(stepData.indicesToRemove);
        
        // Step 2: Drop existing symbols down
        await this.dropSymbolsWithAnimation(stepData.symbolsToDrop);
        
        // Step 3: Add new symbols from the top
        await this.addNewSymbolsWithAnimation(stepData.newSymbols, stepData.newSymbolIndices);
        
        debug.log(`CascadeSpinContainer: Completed cascade step ${stepData.step}`);
    }

    // Spin animation methods
    public startSpinAnimation(targetSymbols: number[]): void {
        debug.log('CascadeSpinContainer: Starting spin animation with', this.symbols.length, 'columns');
        this.isSpinning = true;
        
        // Animate all symbols moving down continuously
        this.animateSpinningSymbols(targetSymbols);
    }

    public stopSpinAnimation(): void {
        debug.log('CascadeSpinContainer: Stopping spin animation');
        this.isSpinning = false;
        
        // Stop all spinning animations
        gsap.killTweensOf(this.symbols);
    }

    private animateSpinningSymbols(targetSymbols: number[]): void {
        if (!this.isSpinning) return;

        debug.log('CascadeSpinContainer: Animating symbols in', this.columns, 'columns');

        // Animate each column of symbols
        for (let col = 0; col < this.columns; col++) {
            const columnSymbols = this.symbols[col] || [];
            
            columnSymbols.forEach((symbol, row) => {
                if (symbol) {
                    // Create continuous downward movement
                    const currentY = symbol.y;
                    const targetY = currentY + GameConfig.REFERENCE_SYMBOL.height;
                    
                    gsap.to(symbol, {
                        y: targetY,
                        duration: 0.3,
                        ease: "power2.out",
                        onComplete: () => {
                            if (this.isSpinning) {
                                // Reset position and continue
                                symbol.y = currentY - GameConfig.REFERENCE_SYMBOL.height;
                            }
                        }
                    });
                }
            });
        }
        
        // Continue animation after a delay
        if (this.isSpinning) {
            setTimeout(() => {
                this.animateSpinningSymbols(targetSymbols);
            }, 300);
        }
    }

    protected updateGridFromData(gridData: InitialGridData): void {
        debug.log(`CascadeSpinContainer: Updating grid with ${gridData.symbols.length} symbols from server`);
        
        gridData.symbols.forEach((symbolData: SymbolData, index: number) => {
            const { column, row } = GridUtils.indexToPosition(index);
            
            // Process all columns since this container manages all reels
            const gridIndex = row + this.rowsAboveMask;
            const newSymbol = this.createGridSymbol(symbolData, column, row);
            if (newSymbol) {
                // Ensure the column array exists
                if (!this.symbols[column]) {
                    this.symbols[column] = [];
                }
                this.symbols[column][gridIndex] = newSymbol;
                debug.log(`CascadeSpinContainer: Created symbol ID ${symbolData.symbolId} at column ${column}, row ${row}, gridIndex ${gridIndex}`);
            }
        });
        
        debug.log(`CascadeSpinContainer: Grid updated with server data`);
    }
    protected applyDropsFromData(dropsData: DropData[]): void {
        dropsData.forEach(dropData => {
            const { column: fromCol, row: fromRow } = GridUtils.indexToPosition(dropData.fromIndex);
            const { column: toCol, row: toRow } = GridUtils.indexToPosition(dropData.toIndex);
            
            if (fromCol !== this.config.reelIndex || toCol !== this.config.reelIndex) return;
            
            const fromGridIndex = fromRow + this.rowsAboveMask;
            const toGridIndex = toRow + this.rowsAboveMask;
            const symbol = this.symbols[this.config.reelIndex][fromGridIndex];
            
            if (symbol) {
                const symbolX = this.calculateSymbolX();
                const pixelY = this.calculateSymbolY(toRow);
                symbol.x = symbolX;
                symbol.y = pixelY;
                
                this.symbols[this.config.reelIndex][fromGridIndex] = null;
                this.symbols[this.config.reelIndex][toGridIndex] = symbol;
            }
        });
    }
    
    private dropSymbol(dropData: DropData): void {
        const { column: fromCol, row: fromRow } = GridUtils.indexToPosition(dropData.fromIndex);
        const { column: toCol, row: toRow } = GridUtils.indexToPosition(dropData.toIndex);
        
        if (fromCol !== this.config.reelIndex || toCol !== this.config.reelIndex) return;

        const fromGridIndex = fromRow + this.rowsAboveMask;
        const toGridIndex = toRow + this.rowsAboveMask;
        const symbol = this.symbols[this.config.reelIndex][fromGridIndex];
        
        if (symbol) {
            const symbolX = this.calculateSymbolX();
            const pixelY = this.calculateSymbolY(toRow);
            symbol.x = symbolX;
            symbol.y = pixelY;
        }
    }

    // Animation methods for cascade processing
    private async removeSymbolsWithAnimation(indicesToRemove: number[]): Promise<void> {
        if (indicesToRemove.length === 0) return;

        debug.log(`CascadeSpinContainer: Removing ${indicesToRemove.length} symbols with animation`);
        
        const animations: Promise<void>[] = [];
        
        indicesToRemove.forEach(index => {
            const { column, row } = GridUtils.indexToPosition(index);
            if (column !== this.config.reelIndex) return;

            const gridIndex = row + this.rowsAboveMask;
            const symbol = this.symbols[this.config.reelIndex][gridIndex];
            
            if (symbol) {
                // Create removal animation
                const animation = new Promise<void>((resolve) => {
                    gsap.to(symbol, {
                        alpha: 0,
                        scale: 0.5,
                        duration: 0.3,
                        ease: "power2.out",
                        onComplete: () => {
                            this.removeChild(symbol);
                            symbol.destroy();
                            this.symbols[this.config.reelIndex][gridIndex] = null;
                            resolve();
                        }
                    });
                });
                
                animations.push(animation);
            }
        });
        
        await Promise.all(animations);
    }

    private async dropSymbolsWithAnimation(dropsData: DropData[]): Promise<void> {
        if (dropsData.length === 0) return;

        debug.log(`CascadeSpinContainer: Dropping ${dropsData.length} symbols with animation`);
        
        const animations: Promise<void>[] = [];
        
        dropsData.forEach(dropData => {
            const { column: fromCol, row: fromRow } = GridUtils.indexToPosition(dropData.fromIndex);
            const { column: toCol, row: toRow } = GridUtils.indexToPosition(dropData.toIndex);
            
            if (fromCol !== this.config.reelIndex || toCol !== this.config.reelIndex) return;

            const fromGridIndex = fromRow + this.rowsAboveMask;
            const toGridIndex = toRow + this.rowsAboveMask;
            const symbol = this.symbols[this.config.reelIndex][fromGridIndex];
            
            if (symbol) {
                // Calculate target position
                const targetX = this.calculateSymbolX(toCol);
                const targetY = this.calculateSymbolY(toRow);
                
                // Create drop animation
                const animation = new Promise<void>((resolve) => {
                    gsap.to(symbol, {
                        x: targetX,
                        y: targetY,
                        duration: 0.4,
                        ease: "power2.out",
                        onComplete: () => {
                            // Update grid references
                            this.symbols[this.config.reelIndex][fromGridIndex] = null;
                            this.symbols[this.config.reelIndex][toGridIndex] = symbol;
                            resolve();
                        }
                    });
                });
                
                animations.push(animation);
            }
        });
        
        await Promise.all(animations);
    }

    private async addNewSymbolsWithAnimation(newSymbols: SymbolData[], newSymbolIndices: number[]): Promise<void> {
        if (newSymbols.length === 0) return;

        debug.log(`CascadeSpinContainer: Adding ${newSymbols.length} new symbols with animation`);
        
        const animations: Promise<void>[] = [];
        
        newSymbols.forEach((symbolData, i) => {
            const index = newSymbolIndices[i];
            const { column, row } = GridUtils.indexToPosition(index);
            
            if (column !== this.config.reelIndex) return;

            const gridIndex = row + this.rowsAboveMask;
            const newSymbol = this.createGridSymbol(symbolData, column, row);
            
            if (newSymbol) {
                // Start from above the visible area
                const startY = this.calculateSymbolY(-1); // Above the grid
                const targetY = this.calculateSymbolY(row);
                
                newSymbol.y = startY;
                newSymbol.alpha = 0;
                this.addChild(newSymbol);
                this.symbols[this.config.reelIndex][gridIndex] = newSymbol;
                
                // Create drop-in animation
                const animation = new Promise<void>((resolve) => {
                    gsap.to(newSymbol, {
                        y: targetY,
                        alpha: 1,
                        duration: 0.5,
                        ease: "power2.out",
                        onComplete: () => resolve()
                    });
                });
                
                animations.push(animation);
            }
        });
        
        await Promise.all(animations);
    }

    private createReelAreaMask(): void {
        // Calculate mask dimensions to cover all reels and visible rows
        // Width: cover all reels with proper spacing
        const totalWidth = ((GameRulesConfig.GRID.reelCount * GameConfig.REFERENCE_SYMBOL.width) + (GameConfig.REFERENCE_SPACING.horizontal * GameRulesConfig.GRID.reelCount)) + 10;
        // Height: cover visible rows with proper spacing
        const totalHeight = ((GameRulesConfig.GRID.rowCount * GameConfig.REFERENCE_SYMBOL.height) + (GameConfig.REFERENCE_SPACING.vertical * GameRulesConfig.GRID.rowCount) - 5);

        // Center the mask
        const maskX = (GameConfig.REFERENCE_RESOLUTION.width / 2) - (totalWidth / 2);
        const maskY = (GameConfig.REFERENCE_RESOLUTION.height / 2) - (totalHeight / 2);

        // Redraw the mask
        this.reelAreaMask.beginPath();
        this.reelAreaMask.rect(maskX, maskY, totalWidth, totalHeight);
        this.reelAreaMask.fill(0xffffff); // White fill for the mask
        this.reelAreaMask.closePath();
        this.mask = this.reelAreaMask;
        this.addChild(this.reelAreaMask);

        debug.log(`ReelsContainer: Created reel area mask at (${maskX}, ${maskY}) with size ${totalWidth}x${totalHeight}`);
    }
}