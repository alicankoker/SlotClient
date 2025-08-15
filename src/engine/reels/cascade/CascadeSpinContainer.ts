import { Application } from "pixi.js";
import { ResponsiveManager } from "../../controllers/ResponsiveSystem";
import { SpinContainer, SpinContainerConfig } from "../SpinContainer";
import { CascadeStepData, DropData, GridUtils, InitialGridData, SymbolData } from "../../types/GameTypes";
import { debug } from "../../utils/debug";

export class CascadeSpinContainer extends SpinContainer {
    constructor(app: Application, responsiveManager: ResponsiveManager, config: SpinContainerConfig) {
        super(app, responsiveManager, config);
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

    public processCascadeStep(stepData: CascadeStepData): void {
        debug.log(`SpinContainer ${this.config.reelIndex}: Processing cascade step`);
        
        this.removeSymbolsFromIndices(stepData.indicesToRemove);
        this.applyDropsFromData(stepData.symbolsToDrop);
        this.addNewSymbolsFromData(stepData.newSymbols, stepData.newSymbolIndices);
    }

    protected updateGridFromData(gridData: InitialGridData): void {
        gridData.symbols.forEach((symbolData: SymbolData, index: number) => {
            const { column, row } = GridUtils.indexToPosition(index);
            
            if (column !== this.config.reelIndex) return;
            
            const gridIndex = row + this.rowsAboveMask;
            const newSymbol = this.createGridSymbol(symbolData, index); // Y position is 0 for initial grid
            if (newSymbol) {
                this.symbols[this.config.reelIndex][gridIndex] = newSymbol;
            }
        });
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
}