import { Application, Graphics, Sprite } from "pixi.js";
import { SpinContainer } from "../SpinContainer";
import { SpinContainerConfig } from "@slotclient/types";
import { debug } from "../../utils/debug";
import { gsap } from "gsap";
import { GridSymbol } from "../../symbol/GridSymbol";
import { CascadeStepData, GridUtils, DropData, IResponseData } from "../../types/ICommunication";
import { SpinConfig } from "@slotclient/config/SpinConfig";
import { Utils } from "../../utils/Utils";
import { IReelSpinState, IReelSpinStateData } from "../../types/IReelSpinStateData";

export class CascadeSpinContainer extends SpinContainer {
    private reelAreaMask: Graphics = new Graphics();
    protected bottomSymbolYPos: number = 60;
    protected topSymbolYPos: number = 1020;
    protected defaultSymbolYPositions: number[] = [];
    protected isStopping: boolean = false;
    private reelsSpinStates: IReelSpinStateData[] = [];
    private currentStoppingReelId: number = -1;

    constructor(app: Application, config: SpinContainerConfig) {
        super(app, config);
        this.label = 'SpinContainer';
        this.createReelAreaMask();
        this.totalRows = config.symbolsVisible;
        this.position.set(0, 15);
        this.initializeReelSpinStates();
        this.app.ticker.add(this.tickHandler, this);
        const totalSymbolsOnReel = config.symbolsVisible! + config.rowsAboveMask! + config.rowsBelowMask!;
        this.bottomSymbolYPos = this.symbols[0][totalSymbolsOnReel - 1]?.position.y!;
        this.defaultSymbolYPositions = this.symbols[0].map((symbol: GridSymbol | Sprite | null, symbolIndex: number) => {
            return symbol?.position.y!;
        }).filter((symbol: number | undefined) => symbol !== undefined);

    }

    initializeReelSpinStates(): void {
        this.reelsSpinStates = Array.from({ length: this.columns }, () => ({
            state: IReelSpinState.STOPPED,
            speed: SpinConfig.SPIN_SPEED,
            symbols: [],
            readyForStopping: false,
            readyForSlowingDown: false,
            currentStopSymbolId: 0,
            stopSymbols: [],
            stopProgressStarted: false,
            isSpinning: false,
            anticipated: false,
            isAnticipating: false,
        }));
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
    public displayInitialGrid(initialGrid: number[][]): Promise<void> {
        return new Promise<void>((resolve) => {
            if (this.symbols.length === 0) {
                this.initializeGrid();
                resolve();
            }

            for (let col = 0; col < this.columns; col++) {
                const columnData = initialGrid[col];

                for (let row = 0; row < this.totalRows; row++) {
                    const cell = columnData[row];
                    // !cell usage changed to check for undefined or null
                    if (cell === undefined || cell === null) {
                        debug.warn(`Missing cell at [${col}, ${row}]`);
                        continue;
                    }
                    const symbol = this.symbols[col][row] as GridSymbol;
                    symbol.setSymbolId(cell);

                    symbol.position.y = this.defaultSymbolYPositions[row];

                    this.symbols[col][row] = symbol;
                }
            }

            resolve();
        });
    }

    public async moveOutExistingSymbols(){
        return new Promise<void>((resolve) => {
            resolve();
        });
    }

    public async moveInNextSymbols(incomingSymbols: number[][]){
        return new Promise<void>((resolve) => {
            resolve();
        });
    }

    protected resetSymbolPositionsInCycle(symbols: (GridSymbol | Sprite | null)[], nextSymbolId?: number): void {
        symbols.forEach((symbol: GridSymbol | Sprite | null, symbolIndex: number) => {
            const isLastSymbol = symbolIndex === symbols.length - 1;
            const indToChange: number = isLastSymbol ? 0 : symbolIndex + 1;
            if (isLastSymbol) {
                (symbol as GridSymbol).position.y = this.defaultSymbolYPositions[0];
                (symbol as GridSymbol).updateSymbolTexture(nextSymbolId !== undefined && nextSymbolId > -1 ? nextSymbolId : Utils.getRandomInt(0, 10), false);
            } else {
                (symbol as GridSymbol).position.y = this.defaultSymbolYPositions[indToChange];
            }
            (symbol as GridSymbol).gridY = indToChange;
        });
    }
    
    public async processCascadeStep(stepData: CascadeStepData): Promise<void> {
        debug.log(`CascadeSpinContainer: Processing cascade step ${stepData.roundId}`);

        // Step 1: Remove matched symbols with animation
        return await this.removeSymbolsWithAnimation(stepData.explosions);

        // Step 2: Drop existing symbols down
        //await this.dropSymbolsWithAnimation(stepData.cascades);

        // Step 3: Add new symbols from the top
        //await this.addNewSymbolsWithAnimation(stepData.newSymbols, stepData.newSymbolIndices);

        debug.log(`CascadeSpinContainer: Completed cascade step ${stepData.roundId}`);
    }

    // temporary spinning functionality for abstract SpinContainer
    public startSpin(spinData: IResponseData): Promise<void> {
        return new Promise<void>((resolve) => {
            this.startSpinAnimation(spinData);
        });
    }
    
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
    private async removeSymbolsWithAnimation(indicesToRemove: number[][]): Promise<void> {
        if (indicesToRemove.length === 0) return;

        debug.log(`CascadeSpinContainer: Removing ${indicesToRemove.length} symbols with animation`);

        const animations: Promise<void>[] = [];

        /*indicesToRemove.forEach(index => {
            const { column, row } = GridUtils.indexToPosition(index[0]);
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
        });*/

        indicesToRemove.forEach(index => {
            const symbol = this.symbols[index[0]][index[1]];
            if (symbol) {
                symbol.visible = false;
            }
        });
        return await Utils.delay(1000)
    }

    private tickHandler(): void {
        const deltaMs = this.app.ticker.deltaMS || 16.67;
        /*for (let i = 0; i < this.reelsSpinStates.length; i++) {
            if (this.reelsSpinStates[i].state !== IReelSpinState.STOPPED) {
                this.updateSpinProgress(i, deltaMs);
            }
        }*/
    }

    private async dropSymbolsWithAnimation(dropsData: number[][]): Promise<void> {
        if (dropsData.length === 0) return;

        debug.log(`CascadeSpinContainer: Dropping ${dropsData.length} symbols with animation`);

        const animations: Promise<void>[] = [];

        dropsData.forEach(dropData => {
            const { column: fromCol, row: fromRow } = GridUtils.indexToPosition(dropData[0]);
            const { column: toCol, row: toRow } = GridUtils.indexToPosition(dropData[1]);

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
        const totalWidth = ((this.gameConfig.GRID.reelCount * this.gameConfig.REFERENCE_SPRITE_SYMBOL.width) + (this.gameConfig.REFERENCE_SPACING.horizontal * this.gameConfig.GRID.reelCount)) + 10;
        // Height: cover visible rows with proper spacing
        const totalHeight = ((this.gameConfig.GRID.rowCount * this.gameConfig.REFERENCE_SPRITE_SYMBOL.height) + (this.gameConfig.REFERENCE_SPACING.vertical * this.gameConfig.GRID.rowCount) - 5);

        // Center the mask
        const maskX = (this.gameConfig.REFERENCE_RESOLUTION.width / 2) - (totalWidth / 2);
        const maskY = (this.gameConfig.REFERENCE_RESOLUTION.height / 2) - (totalHeight / 2);

        // Redraw the mask
        this.reelAreaMask.beginPath();
        this.reelAreaMask.rect(maskX, maskY, totalWidth, totalHeight);
        this.reelAreaMask.fill(0xffffff); // White fill for the mask
        this.reelAreaMask.closePath();
        this.mask = this.reelAreaMask;
        //this.addChild(this.reelAreaMask);

        debug.log(`ReelsContainer: Created reel area mask at (${maskX}, ${maskY}) with size ${totalWidth}x${totalHeight}`);
    }

    // Position calculation utilities
    public calculateSymbolX(column: number = 0): number {
        const symbolWidth = this.gameConfig.REFERENCE_SPRITE_SYMBOL.width;

        const spacingX = this.gameConfig.REFERENCE_SPACING.horizontal;

        const reelX = (((column - Math.floor(this.gameConfig.GRID_LAYOUT.columns / 2)) * (symbolWidth + spacingX)) + (this.gameConfig.REFERENCE_RESOLUTION.width / 2)) + ((this.gameConfig.GRID_LAYOUT.columns % 2 == 0) ? (symbolWidth + spacingX) / 2 : 0); // Center of symbol
        return reelX; // Center in container
    }

    public calculateSymbolY(row: number): number {
        const symbolHeight = this.gameConfig.REFERENCE_SPRITE_SYMBOL.height;

        const spacingY = this.gameConfig.REFERENCE_SPACING.vertical;

        const symbolY = (((row - Math.floor(this.gameConfig.GRID_LAYOUT.visibleRows / 2)) * (symbolHeight + spacingY)) + this.gameConfig.REFERENCE_RESOLUTION.height / 2) + ((this.gameConfig.GRID_LAYOUT.visibleRows % 2 == 0) ? (symbolHeight + spacingY) / 2 : 0);
        return symbolY;
    }
}