import { Application, Graphics } from "pixi.js";
import { SpinContainer, SpinContainerConfig } from "../SpinContainer";
import { debug } from "../../utils/debug";
import { GameRulesConfig } from "../../../config/GameRulesConfig";
import { GameConfig } from "../../../config/GameConfig";
import { gsap } from "gsap";
import { GridSymbol } from "../../symbol/GridSymbol";
import { GridData, CascadeStepData, SpinResultData, SymbolData, GridUtils, DropData, IResponseData } from "../../types/ICommunication";

export class CascadeSpinContainer extends SpinContainer {
    private reelAreaMask: Graphics = new Graphics();

    constructor(app: Application, config: SpinContainerConfig) {
        super(app, config);
        this.label = 'SpinContainer';
        this.createReelAreaMask();
        this.totalRows = config.symbolsVisible;
    }

    public clearSymbols(): void {
        // Kill any running animations before clearing symbols
        gsap.killTweensOf(this.symbols);
        
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
    public displayInitialGrid(gridData: number[][]): Promise<void> {
        debug.log(`SpinContainer ${this.config.reelIndex}: Displaying initial grid`);
        this.clearSymbols();
        this.updateGridFromData(gridData);
        //this.updateScale();
        //this.updateSymbolPositions();
        return Promise.resolve();
    }

    public async processCascadeStep(stepData: CascadeStepData): Promise<void> {
        debug.log(`CascadeSpinContainer: Processing cascade step ${stepData.step}`);

        // Step 1: Remove matched symbols with animation
        await this.removeSymbolsWithAnimation(stepData.indicesToRemove);

        // Step 2: Drop existing symbols down
        await this.dropSymbolsWithAnimation(stepData.symbolsToDrop);

        // Step 3: Add new symbols from the top
        //await this.addNewSymbolsWithAnimation(stepData.newSymbols, stepData.newSymbolIndices);

        debug.log(`CascadeSpinContainer: Completed cascade step ${stepData.step}`);
    }

    // temporary spinning functionality for abstract SpinContainer
    public startSpin(spinData: IResponseData): Promise<void> {
        return new Promise<void>((resolve) => {
            this.startSpinAnimation(spinData);
        });
    }

    // Spinning functionality
    /*public startSpin(spinData: SpinResultData, onComplete?: () => void): boolean {
        if (this.isSpinning) return false;

        this.isSpinning = true;
        this.spinStartTime = Date.now();
        this.targetSymbols = [...spinData.steps[spinData.steps.length - 1].gridAfter.symbols.flat().map((symbol: SymbolData) => symbol.symbolId)];
        this.onSpinCompleteCallback = onComplete;

        debug.log('CascadeSpinContainer: Starting spin with symbols array:', this.symbols);
        
        // Ensure symbols array is properly initialized
        if (!this.symbols || this.symbols.length === 0) {
            debug.warn('CascadeSpinContainer: Symbols array not initialized, skipping animation');
            return true;
        }
        
        this.symbols.forEach((row, rowIndex) => {
            if (row && Array.isArray(row)) {
                row.forEach((symbol, colIndex) => {
                    try {
                        // More robust null checking
                        if (symbol && 
                            symbol !== null && 
                            symbol !== undefined && 
                            typeof symbol === 'object' && 
                            symbol.y !== undefined && 
                            symbol.y !== null &&
                            !isNaN(symbol.y)) {
                            
                            // Calculate grid height
                            const maskHeight = this.reelAreaMask.height;
                            
                            // Create a safe animation with onUpdate callback to check for null
                            gsap.to(symbol, { 
                                duration: 3, 
                                y: maskHeight +400, 
                                ease: "power2.out",
                                onUpdate: function() {
                                    // Check if symbol is still valid during animation
                                    if (!symbol || symbol === null || symbol === undefined) {
                                        this.kill(); // Stop the animation if symbol becomes null
                                    }
                                }
                            });
                        }
                    } catch (error) {
                        debug.error(`CascadeSpinContainer: Error animating symbol at row ${rowIndex}, col ${colIndex}:`, error);
                    }
                });
            }
        });

        return true;
    }*/

    public stopSpin(): void {
        this.isSpinning = false;

        if (this.onSpinCompleteCallback) {
            this.onSpinCompleteCallback();
        }
    }

    // Spin animation methods
    public startSpinAnimation(spinData: IResponseData): void {
        debug.log('CascadeSpinContainer: Starting spin animation with', this.symbols.length, 'columns');
        this.isSpinning = true;

        // Animate all symbols moving down continuously
        //this.moveSymbolsDown(targetSymbols);
    }

    public stopSpinAnimation(): void {
        debug.log('CascadeSpinContainer: Stopping spin animation');
        this.isSpinning = false;

        // Stop all spinning animations
        gsap.killTweensOf(this.symbols);
    }


    protected updateGridFromData(gridData: number[][]): void {
        debug.log(`CascadeSpinContainer: Updating grid with ${gridData.length} symbols from server`);

        gridData.flat().forEach((symbolId: number, index: number) => {
            const { column, row } = GridUtils.indexToPosition(index);

            try {
                const symbolRef: GridSymbol = this.symbols[column][row] as GridSymbol;
                if (symbolRef) {
                    symbolRef.updateSymbolTexture(symbolId, false);
                } else {
                    // Process all columns since this container manages all reels
                    const gridIndex = row;
                    const newSymbol = this.createGridSymbol(symbolId, column, row);
                    if (newSymbol) {
                        // Ensure the column array exists
                        if (!this.symbols[column]) {
                            this.symbols[column] = [];
                        }
                        this.symbols[column][gridIndex] = newSymbol;
                        debug.log(`CascadeSpinContainer: Created symbol ID ${symbolId} at column ${column}, row ${row}, gridIndex ${gridIndex}`);
                    }
                }
            } catch (error) {
                debug.error(`CascadeSpinContainer: Error updating symbol ${symbolId} at column ${column}, row ${row}`, error);
            }
        });

        debug.log(`CascadeSpinContainer: Grid updated with server data`);
    }

    protected applyDropsFromData(dropsData: DropData[]): void {
        dropsData.forEach(dropData => {
            const { column: fromCol, row: fromRow } = GridUtils.indexToPosition(dropData.fromIndex);
            const { column: toCol, row: toRow } = GridUtils.indexToPosition(dropData.toIndex);

            if (fromCol !== this.config.reelIndex || toCol !== this.config.reelIndex) return;

            const fromGridIndex = fromRow;
            const toGridIndex = toRow;
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

        const fromGridIndex = fromRow;
        const toGridIndex = toRow;
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

            const gridIndex = row;
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

            const fromGridIndex = fromRow;
            const toGridIndex = toRow;
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

    private async addNewSymbolsWithAnimation(newSymbols: number[], newSymbolIndices: number[]): Promise<void> {
        if (newSymbols.length === 0) return;

        debug.log(`CascadeSpinContainer: Adding ${newSymbols.length} new symbols with animation`);

        const animations: Promise<void>[] = [];

        newSymbols.forEach((symbolData, i) => {
            const index = newSymbolIndices[i];
            const { column, row } = GridUtils.indexToPosition(index);

            if (column !== this.config.reelIndex) return;

            const gridIndex = row;
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
                /*const animation = new Promise<void>((resolve) => {
                    gsap.to(newSymbol, {
                        y: targetY,
                        alpha: 1,
                        duration: 0.5,
                        ease: "power2.out",
                        onComplete: () => resolve()
                    });
                });

                animations.push(animation);*/
            }
        });

        await Promise.all(animations);
    }

    private createReelAreaMask(): void {
        // Calculate mask dimensions to cover all reels and visible rows
        // Width: cover all reels with proper spacing
        const totalWidth = ((GameRulesConfig.GRID.reelCount * GameConfig.REFERENCE_SPRITE_SYMBOL.width) + (GameConfig.REFERENCE_SPACING.horizontal * GameRulesConfig.GRID.reelCount)) + 10;
        // Height: cover visible rows with proper spacing
        const totalHeight = ((GameRulesConfig.GRID.rowCount * GameConfig.REFERENCE_SPRITE_SYMBOL.height) + (GameConfig.REFERENCE_SPACING.vertical * GameRulesConfig.GRID.rowCount) - 5);

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