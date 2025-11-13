import { Application } from "pixi.js";
import { SpinContainer, SpinContainerConfig } from "../SpinContainer";
import { SpinConfig } from "../../../config/SpinConfig";
import { IReelMode } from "../../reels/ReelController";
import { GridSymbol } from "../../symbol/GridSymbol";
import { Sprite } from "pixi.js";
import { debug } from "../../utils/debug";
import { GameConfig, spinContainerConfig } from "../../../config/GameConfig";
import { Utils } from "../../utils/Utils";
import { GridData, IResponseData, SpinResultData, SymbolData } from "../../types/ICommunication";
import { IReelSpinState, IReelSpinStateData } from "../../types/IReelSpinStateData";
import { ReelsContainer } from "../../reels/ReelsContainer";
import { Helpers } from "../../utils/Helpers";
import { SpinMode } from "../../types/ISpinConfig";

export class ClassicSpinContainer extends SpinContainer {
    protected bottomSymbolYPos: number = 60;
    protected topSymbolYPos: number = 1020;
    protected defaultSymbolYPositions: number[] = [];
    protected isStopping: boolean = false;
    private reelsSpinStates: IReelSpinStateData[] = [];

    constructor(app: Application, config: SpinContainerConfig) {
        super(app, config);
        this.position.set(0, 15);
        this.initializeReelSpinStates();
        this.app.ticker.add(this.tickHandler, this);
        const totalSymbolsOnReel = config.symbolsVisible! + config.rowsAboveMask! + config.rowsBelowMask!;
        this.bottomSymbolYPos = this.symbols[0][totalSymbolsOnReel - 1]?.position.y!;
        this.defaultSymbolYPositions = this.symbols[0].map((symbol: GridSymbol | Sprite | null, symbolIndex: number) => {
            return symbol?.position.y!;
        }).filter((symbol: number | undefined) => symbol !== undefined);

        //this.topSymbolYPos = this.symbols[0][0]?.position.y!;
    }

    initializeReelSpinStates(): void {
        this.reelsSpinStates = Array.from({ length: this.columns }, () => ({
            state: IReelSpinState.IDLE,
            speed: SpinConfig.SPIN_SPEED,
            symbols: [],
            readyForStopping: false,
            readyForSlowingDown: false,
            isSpinning: false
        }));
    }

    private tickHandler(): void {
        const deltaMs = this.app.ticker.deltaMS || 16.67;
        for (let i = 0; i < this.reelsSpinStates.length; i++) {
            if (this.reelsSpinStates[i].state !== IReelSpinState.STOPPED) {
                this.updateSpinProgress(i, deltaMs);
            }
        }
    }

    updateLandingProgress(reelId: number, deltaTime: number): void {
        this.stopByReel(reelId);
    }

    stopByReel(reelId: number, onReelStopCallback?: () => void) {
        this.reelsSpinStates[reelId].state = IReelSpinState.STOPPING;
        this.reelsSpinStates[reelId].callbackFunction = onReelStopCallback;
    }

    async updateSpinProgress(reelId: number, deltaTime: number): Promise<void> {
        const reelSymbols = this.symbols[reelId];
        if (this.reelsSpinStates[reelId].state === IReelSpinState.SLOWING && this.reelsSpinStates[reelId].speed > SpinConfig.REEL_SLOW_DOWN_SPEED_LIMIT) {
            this.reelsSpinStates[reelId].speed -= SpinConfig.REEL_SLOW_DOWN_COEFFICIENT;
            if (this.reelsSpinStates[reelId].speed <= SpinConfig.REEL_SLOW_DOWN_SPEED_LIMIT) {
                this.reelsSpinStates[reelId].speed = SpinConfig.REEL_SLOW_DOWN_SPEED_LIMIT;
            }
        }
        if (this.reelsSpinStates[reelId].state === IReelSpinState.SPEEDING) {
            if(this.reelsSpinStates[reelId].speed < SpinConfig.REEL_MAX_SPEED) {
                this.reelsSpinStates[reelId].speed += SpinConfig.REEL_SPEED_UP_COEFFICIENT;
            }
            else {
                this.reelsSpinStates[reelId].state = IReelSpinState.SPINNING;
            }
        }
        if(this.reelsSpinStates[reelId].state === IReelSpinState.STOPPING) {
            this.reelsSpinStates[reelId].speed = SpinConfig.REEL_MAX_SPEED;
        }
        this.progressReelSpin(reelSymbols, reelId, deltaTime);
    }

    // Spinning functionality
    public async startSpin(spinData: IResponseData): Promise<void> {
        for (let i = 0; i < this.reelsSpinStates.length; i++) {
            this.startReelSpin(i, spinData);
            const delay = this._spinMode === GameConfig.SPIN_MODES.NORMAL ? GameConfig.REFERENCE_REEL_DELAY : 0;

            await Utils.delay(delay);
        }
    }

    public async slowDown() {
        for (let i = 0; i < this.reelsSpinStates.length; i++) {
            this.slowDownReelSpin(i);
            const delay = this._spinMode === GameConfig.SPIN_MODES.NORMAL ? GameConfig.REFERENCE_REEL_DELAY : 0;

            await Utils.delay(delay);
        }
    }

    startReelSpin(reelId: number, spinData: IResponseData): void {
        this.reelsSpinStates[reelId].state = IReelSpinState.SPEEDING;
        this.reelsSpinStates[reelId].isSpinning = true;
        const reelSymbolsData = spinData.reels[reelId];
        const symbols = reelSymbolsData.map((symbol: number) => symbol);
        this.reelsSpinStates[reelId].symbols = symbols;
    }

    slowDownReelSpin(reelId: number): void {
        this.reelsSpinStates[reelId].state = IReelSpinState.SLOWING;
        this.reelsSpinStates[reelId].isSpinning = true;
    }

    stopReelSpin(reelId: number): void {
        this.reelsSpinStates[reelId].state = IReelSpinState.STOPPING;
        this.reelsSpinStates[reelId].isSpinning = false;
    }

    protected progressReelSpin(reelSymbols: (GridSymbol | Sprite | null)[], reelId: number, deltaTime: number): void {
        for (let i = 0; i < reelSymbols.length; i++) {
            const symbol = reelSymbols[i];
            if (!symbol) return;

            let cycleEnded = this.checkCycleEndedForState(reelId);
            if (cycleEnded) {
                this.resetSymbolPositionsInCycle(reelSymbols);
                cycleEnded = false;
                reelSymbols.unshift(reelSymbols.pop()!);
                break;
            } else {
                symbol.position.y += deltaTime * this.reelsSpinStates[reelId].speed;
            }
        }
    }

    checkCycleEndedForState(reelId: number): boolean {
        const lastSymbolYPos = this.symbols[reelId][this.symbols[reelId].length - 2]?.position.y!;
        let cycleEnded = lastSymbolYPos >= this.bottomSymbolYPos;
        if (cycleEnded) {
            this.resetSymbolPositionsInCycle(this.symbols[reelId]);
        }
        return cycleEnded;
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

    public async stopSpin(): Promise<void> {
        super.stopSpin();
        for (const state of this.reelsSpinStates) {
            state.speed = 0;
            state.state = IReelSpinState.STOPPED;
            await Helpers.delay(GameConfig.REFERENCE_REEL_DELAY);
        }
    }

    // Mode management
    public setMode(mode: IReelMode): void {
        super.setMode(mode);

        if (mode === IReelMode.LANDING) {
            this.isSpinning = false;
            this.reelsSpinStates.forEach(state => state.speed = SpinConfig.REEL_SLOW_DOWN_SPEED_LIMIT);
        }
    }
    // Position calculation utilities
    public calculateSymbolX(column: number = 0): number {
        const symbolWidth = GameConfig.REFERENCE_SPRITE_SYMBOL.width;

        const spacingX = GameConfig.REFERENCE_SPACING.horizontal;

        const reelX = (((column - Math.floor(GameConfig.GRID_LAYOUT.columns / 2)) * (symbolWidth + spacingX)) + (GameConfig.REFERENCE_RESOLUTION.width / 2)) + ((GameConfig.GRID_LAYOUT.columns % 2 == 0) ? (symbolWidth + spacingX) / 2 : 0); // Center of symbol

        return reelX; // Center in container
    }

    public calculateSymbolY(row: number): number {
        const symbolHeight = GameConfig.REFERENCE_SPRITE_SYMBOL.height;

        const spacingY = GameConfig.REFERENCE_SPACING.vertical;

        const symbolY = (((row - 1 - Math.floor(GameConfig.GRID_LAYOUT.visibleRows / 2)) * (symbolHeight + spacingY)) + GameConfig.REFERENCE_RESOLUTION.height / 2) + ((GameConfig.GRID_LAYOUT.visibleRows % 2 == 0) ? (symbolHeight + spacingY) / 2 : 0);

        return symbolY;
    }

    public displayInitialGrid(initialGrid: number[][]): Promise<void> {
        //debug.log('ClassicSpinContainer: Displaying initial grid: ', initialGrid.symbols);
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
                this.resetSymbolPositionsInCycle(this.symbols[col]);
            }

            resolve();
        });
    }

    protected createGridSymbol(symbolData: number, column: number, row: number): GridSymbol | null {
        const symbolX = this.calculateSymbolX(column);
        const symbolY = this.calculateSymbolY(row);
        if (GameConfig.REFERENCE_SPRITE_SYMBOL.scale < 0) debugger;

        const gridSymbol = new GridSymbol({
            symbolId: symbolData,
            position: { x: symbolX, y: symbolY },
            scale: GameConfig.REFERENCE_SPRITE_SYMBOL.scale, // Use reference scale
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