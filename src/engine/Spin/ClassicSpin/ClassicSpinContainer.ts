import { Application } from "pixi.js";
import { SpinContainer, SpinContainerConfig } from "../SpinContainer";
import { SpinConfig } from "../../../config/SpinConfig";
import { IReelMode } from "../../reels/ReelController";
import { GridSymbol } from "../../symbol/GridSymbol";
import { Sprite } from "pixi.js";
import { debug } from "../../utils/debug";
import { GridData, SymbolData } from "../../types/GameTypes";
import { GameConfig } from "../../../config/GameConfig";

export class ClassicSpinContainer extends SpinContainer {
    protected currentSpeed: number = SpinConfig.SPIN_SPEED;
    protected bottomSymbolYPos: number = 0;
    protected topSymbolYPos: number = 0;
    constructor(app: Application, config: SpinContainerConfig) {
        super(app, config);
    }

    updateSpinProgress(deltaTime: number): void {            
        if (this.currentMode === IReelMode.SLOWING && this.currentSpeed > SpinConfig.REEL_SLOW_DOWN_SPEED_LIMIT) {
            this.currentSpeed -= SpinConfig.REEL_SLOW_DOWN_COEFFICIENT;
        }

        if (this.currentMode === IReelMode.SPEEDING) {
            this.currentSpeed -= SpinConfig.REEL_SPEED_UP_COEFFICIENT;
        }
        this.symbols.forEach((reelSymbols: (GridSymbol | Sprite | null)[], reelIndex: number) => {
            console.log(`${this.currentSpeed}`);
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

    public displayInitialGrid(initialGrid: GridData): void {
        console.log('ClassicSpinContainer: Displaying initial grid');
        if(this.symbols.length === 0) {
            this.initializeGrid();
        }

        for(let col = 0; col < this.columns; col++) {
            for(let row = 0; row < this.totalRows; row++) {
                this.symbols[col][row] = this.createGridSymbol({ symbolId: initialGrid.symbols[col][row].symbolId }, col, row);
            }
        }
    }
    
    protected createGridSymbol(symbolData: SymbolData, column: number, row: number): GridSymbol | null {
        const symbolX = this.calculateSymbolX(column);
        const symbolY = this.calculateSymbolY(row);

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
}