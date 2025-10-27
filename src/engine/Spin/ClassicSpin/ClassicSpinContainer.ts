import { Application } from "pixi.js";
import { SpinContainer, SpinContainerConfig } from "../SpinContainer";
import { SpinConfig } from "../../../config/SpinConfig";
import { IReelMode } from "../../reels/ReelController";
import { GridSymbol } from "../../symbol/GridSymbol";
import { Sprite } from "pixi.js";
import { debug } from "../../utils/debug";
import { GridData, SymbolData } from "../../types/GameTypes";
import { GameConfig } from "../../../config/GameConfig";
import { Utils } from "../../utils/Utils";

export class ClassicSpinContainer extends SpinContainer {
    protected currentSpeed: number = SpinConfig.SPIN_SPEED;
    protected bottomSymbolYPos: number = 960;
    protected topSymbolYPos: number = 0;
    protected defaultSymbolYPositions: number[] = [];

    constructor(app: Application, config: SpinContainerConfig) {
        super(app, config);
        this.app.ticker.add(this.tickHandler, this);
        const totalSymbolsOnReel = config.symbolsVisible! + config.rowsAboveMask! + config.rowsBelowMask!;
        this.bottomSymbolYPos = this.symbols[0][totalSymbolsOnReel - 1]?.position.y!;
        this.defaultSymbolYPositions = this.symbols[0].map((symbol: GridSymbol | Sprite | null, symbolIndex: number) => {
            return symbol?.position.y!;
        }).filter((symbol: number | undefined) => symbol !== undefined);

        //this.topSymbolYPos = this.symbols[0][0]?.position.y!;
    }

    private tickHandler(): void {
        const deltaMs = this.app.ticker.deltaMS || 16.67;
        if (this.isSpinning) {
            this.updateSpinProgress(deltaMs);
        }
        else if (this.currentMode === IReelMode.LANDING) {
            this.updateLandingProgress(deltaMs);
        }
    }

    updateLandingProgress(deltaTime: number): void {

    }

    updateSpinProgress(deltaTime: number): void {
        const coeff = .1;
        // Only update while actively spinning/speeding/slowing
        if (this.currentMode === IReelMode.SLOWING && this.currentSpeed > SpinConfig.REEL_SLOW_DOWN_SPEED_LIMIT) {
            this.currentSpeed -= SpinConfig.REEL_SLOW_DOWN_COEFFICIENT;
        }

        if (this.currentMode === IReelMode.SPEEDING && this.currentSpeed < SpinConfig.REEL_MAX_SPEED) {
            this.currentSpeed += SpinConfig.REEL_SPEED_UP_COEFFICIENT;
        }

        if (this.currentMode === IReelMode.LANDING) {
            this.currentSpeed = 0;
        }

        this.symbols.forEach((reelSymbols: (GridSymbol | Sprite | null)[], reelIndex: number) => {
            //console.log(`${this.currentSpeed}`);
            //this.sortSymbolsAtIterationEnd(symbol as GridSymbol, reelSymbols);
            //const reelSymbols = this.symbols[0];
            for(let i = 0; i < reelSymbols.length; i++) {
                const symbol = reelSymbols[i];
                if (!symbol) return;
                //console.log('symbolIndex: ', i, 'gridY: ', (symbol as GridSymbol).gridY);
                let cycleEnded = reelSymbols[5]?.position.y! >= this.bottomSymbolYPos;
                if (cycleEnded) {
                    this.resetSymbolPositionsInCycle(reelSymbols);
                    cycleEnded = false;
                    reelSymbols.unshift(reelSymbols.pop()!);
                    break;
                } else {
                    symbol.position.y += this.currentSpeed;
                }

                console.log('symbol.position.y: ', reelSymbols[6]?.position.y);
            }
        });
    }

    protected resetSymbolPositionsInCycle(symbols: (GridSymbol | Sprite | null)[]): void {
        symbols.forEach((symbol: GridSymbol | Sprite | null, symbolIndex: number) => {
            const isLastSymbol = symbolIndex === symbols.length - 1;
            const indToChange: number = isLastSymbol ? 0 : symbolIndex + 1;
            if (isLastSymbol) {
                (symbol as GridSymbol).position.y = this.defaultSymbolYPositions[0];
                (symbol as GridSymbol).updateSymbolTexture(Utils.getRandomInt(0, 10))
            } else {
                (symbol as GridSymbol).position.y = this.defaultSymbolYPositions[indToChange];
            }
            (symbol as GridSymbol).gridY = indToChange;
        });
    }
    protected setGridYValuesForStaticSymbols(symbols: (GridSymbol | Sprite | null)[]): void {
        symbols.forEach((symbol: GridSymbol | Sprite | null, symbolIndex: number) => {
            (symbol as GridSymbol).gridY = symbolIndex;
        });
    }

    // Mode management
    public setMode(mode: IReelMode): void {
        super.setMode(mode);

        if (mode === IReelMode.LANDING) {
            this.isSpinning = false;
            this.currentSpeed = SpinConfig.REEL_SLOW_DOWN_SPEED_LIMIT;
        }
    }
    // Position calculation utilities
    public calculateSymbolX(column: number = 0): number {
        const symbolWidth = GameConfig.REFERENCE_SYMBOL.width;

        const spacingX = GameConfig.REFERENCE_SPACING.horizontal;

        const reelX = (((column - Math.floor(GameConfig.GRID_LAYOUT.columns / 2)) * (symbolWidth + spacingX)) + (GameConfig.REFERENCE_RESOLUTION.width / 2)) + ((GameConfig.GRID_LAYOUT.columns % 2 == 0) ? (symbolWidth + spacingX) / 2 : 0); // Center of symbol

        return reelX; // Center in container
    }

    public calculateSymbolY(row: number): number {
        const symbolHeight = GameConfig.REFERENCE_SYMBOL.height;

        const spacingY = GameConfig.REFERENCE_SPACING.vertical;

        const symbolY = (((row - 1 - Math.floor(GameConfig.GRID_LAYOUT.visibleRows / 2)) * (symbolHeight + spacingY)) + GameConfig.REFERENCE_RESOLUTION.height / 2) + ((GameConfig.GRID_LAYOUT.visibleRows % 2 == 0) ? (symbolHeight + spacingY) / 2 : 0);

        return symbolY;
    }

    public displayInitialGrid(initialGrid: GridData): void {
        //console.log('ClassicSpinContainer: Displaying initial grid: ', initialGrid.symbols);
        if (this.symbols.length === 0) {
            this.initializeGrid();
        }

        for (let col = 0; col < this.columns; col++) {
            for (let row = 0; row < this.totalRows; row++) {
                (this.symbols[col][row] as GridSymbol).setSymbolId(initialGrid.symbols[col][row].symbolId);
            }
        }
    }

    protected createGridSymbol(symbolData: SymbolData, column: number, row: number): GridSymbol | null {
        const symbolX = this.calculateSymbolX(column);
        const symbolY = this.calculateSymbolY(row);
        if (GameConfig.REFERENCE_SYMBOL.scale < 0) debugger;

        const gridSymbol = new GridSymbol({
            symbolId: symbolData.symbolId,
            position: { x: symbolX, y: symbolY },
            scale: GameConfig.REFERENCE_SYMBOL.scale, // Use reference scale
            gridX: column,
            gridY: row
        });

        // Add to display
        this.addChild(gridSymbol);

        return gridSymbol;
    }

    public destroy(): void {
        this.app.ticker.remove(this.tickHandler, this);
        super.destroy();
    }
}