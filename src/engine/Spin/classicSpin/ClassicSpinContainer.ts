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
import { signals } from "../../controllers/SignalManager";
import { GameDataManager } from "../../data/GameDataManager";
import { FreeSpinController } from "../../freeSpin/FreeSpinController";

export class ClassicSpinContainer extends SpinContainer {
    protected bottomSymbolYPos: number = 60;
    protected topSymbolYPos: number = 1020;
    protected defaultSymbolYPositions: number[] = [];
    protected isStopping: boolean = false;
    private reelsSpinStates: IReelSpinStateData[] = [];
    private currentStoppingReelId: number = -1;

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
            state: IReelSpinState.STOPPED,
            speed: SpinConfig.SPIN_SPEED,
            symbols: [],
            readyForStopping: false,
            readyForSlowingDown: false,
            currentStopSymbolId: -1,
            stopSymbols: [],
            stopProgressStarted: false,
            isSpinning: false
        }));
    }

    resetReelSpinState(reelId: number): void {
        this.reelsSpinStates[reelId].state = IReelSpinState.IDLE;
        this.reelsSpinStates[reelId].speed = SpinConfig.SPIN_SPEED;
        this.reelsSpinStates[reelId].symbols = [];
        this.reelsSpinStates[reelId].readyForStopping = false;
        this.reelsSpinStates[reelId].readyForSlowingDown = false;
        this.reelsSpinStates[reelId].currentStopSymbolId = -1;
    }

    resetAllReelSpinStates(): void {
        this.reelsSpinStates.forEach((state: IReelSpinStateData, reelId: number) => {
            this.resetReelSpinState(reelId);
        });
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
        this.startStopProgressByReel(reelId);
    }

    startStopProgressByReel(reelId: number, onReelStopCallback?: () => void) {
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
            if (this.reelsSpinStates[reelId].speed < SpinConfig.REEL_MAX_SPEED) {
                this.reelsSpinStates[reelId].speed += SpinConfig.REEL_SPEED_UP_COEFFICIENT;
            }
            else {
                this.reelsSpinStates[reelId].state = IReelSpinState.SPINNING;
            }
        }
        if (this.reelsSpinStates[reelId].state === IReelSpinState.STOPPING) {
            this.reelsSpinStates[reelId].speed = SpinConfig.REEL_MAX_SPEED;
        }
        this.progressReelSpin(reelSymbols, reelId, deltaTime);
    }

    public startStopSequence(): void {
        this.reelsSpinStates.forEach((reel) => {
            reel.stopProgressStarted = true;
        })
        this.currentStoppingReelId = 0;
    }

    public async allReelsStopped(): Promise<boolean> {
        signals.emit("allReelsStopped", GameDataManager.getInstance().getResponseData());
        return this.reelsSpinStates.every((reel) => reel.state === IReelSpinState.IDLE);
    }

    protected reelStopped(reelId: number) {
        this.symbols[reelId].forEach((symbol) => {
            if (symbol) {
                (symbol as GridSymbol).updateSymbolTexture((symbol as GridSymbol).getSymbolId(), false);
            }
        });
        signals.emit("reelStopped", reelId);
        //dispatch to the whole game;
    }

    protected progressReelSpin(reelSymbols: (GridSymbol | Sprite | null)[], reelId: number, deltaTime: number): void {
        for (let i = 0; i < reelSymbols.length; i++) {
            const symbol = reelSymbols[i];
            if (!symbol) return;

            let cycleEnded = this.checkCycleEndedForState(reelId);
            if (cycleEnded) {
                const isTurbo = this._spinMode === GameConfig.SPIN_MODES.TURBO && FreeSpinController.instance().isRunning === false;

                const reelState = this.reelsSpinStates[reelId];
                const isLastStopCycle = reelState.currentStopSymbolId === this.config.symbolsVisible - 1;

                if (reelState.stopProgressStarted && (isTurbo || reelId === this.currentStoppingReelId)) {
                    if (isLastStopCycle) {
                        const visible = this.getVisibleWindowSymbols(reelSymbols);
                        const stopSymbols = this.reelsSpinStates[reelId].stopSymbols;

                        for (let i = 0; i < visible.length; i++) {
                            visible[i].updateSymbolTexture(stopSymbols[i], true);
                        }

                        this.forceFinalStopLayout(reelSymbols, reelId);

                        reelState.state = IReelSpinState.STOPPED;
                        reelState.isSpinning = false;
                        reelState.speed = 0;

                        this.reelStopped(reelId);

                        if (isTurbo) {
                            let allStopped = true;
                            for (let r = 0; r < this.reelsSpinStates.length; r++) {
                                if (this.reelsSpinStates[r].state !== IReelSpinState.STOPPED) {
                                    allStopped = false;
                                    break;
                                }
                            }
                            if (allStopped) {
                                this.currentStoppingReelId = -1;
                                this.allReelsStopped();
                            }
                        }

                        if (!isTurbo) {
                            if (this.currentStoppingReelId === this.config.numberOfReels! - 1) {
                                this.currentStoppingReelId = -1;
                                this.allReelsStopped();
                            } else {
                                this.currentStoppingReelId++;
                            }
                        }

                        break;
                    }

                    const csId = reelState.currentStopSymbolId;
                    const stopSymbolIndex = this.config.symbolsVisible - 1 - csId;
                    const stopSymbol = reelState.stopSymbols[stopSymbolIndex];

                    this.resetSymbolPositionsInCycle(reelSymbols, stopSymbol);

                    reelState.currentStopSymbolId++;

                } else {
                    this.resetSymbolPositionsInCycle(reelSymbols);
                }

                if (!isLastStopCycle) {
                    reelSymbols.unshift(reelSymbols.pop()!);
                }

                cycleEnded = false;
                break;

            } else {
                symbol.position.y += deltaTime * this.reelsSpinStates[reelId].speed;
            }
        }
    }

    protected getVisibleWindowSymbols(reelSymbols: (GridSymbol | Sprite | null)[]): GridSymbol[] {
        const visibleY1 = this.defaultSymbolYPositions[this.config.rowsAboveMask!];
        const visibleY2 = this.defaultSymbolYPositions[this.config.rowsAboveMask! + 1];
        const visibleY3 = this.defaultSymbolYPositions[this.config.rowsAboveMask! + 2];

        const targets = [visibleY1, visibleY2, visibleY3];

        const result: GridSymbol[] = [];

        for (const s of reelSymbols) {
            if (!s) continue;
            const y = (s as GridSymbol).position.y;
            if (targets.includes(y)) result.push(s as GridSymbol);
        }

        return result;
    }

    protected forceFinalStopLayout(reelSymbols: (GridSymbol | Sprite | null)[], reelId: number): void {
        const visibleCount = this.config.symbolsVisible; // 3
        const stopSymbols = this.reelsSpinStates[reelId].stopSymbols;

        for (let v = 0; v < visibleCount; v++) {
            const s = reelSymbols[v + 1] as GridSymbol;
            s.updateSymbolTexture(stopSymbols[v], true);
            s.position.y = this.defaultSymbolYPositions[v + 1];
            s.gridY = v + 1;
        }

        const topBuf = reelSymbols[0] as GridSymbol;
        const botBuf = reelSymbols[reelSymbols.length - 1] as GridSymbol;

        topBuf.position.y = this.defaultSymbolYPositions[0];
        botBuf.position.y = this.defaultSymbolYPositions[visibleCount + 1];

        topBuf.gridY = 0;
        botBuf.gridY = visibleCount + 1;
    }

    checkCycleEndedForState(reelId: number): boolean {
        const lastSymbolYPos = this.symbols[reelId][this.symbols[reelId].length - 2]?.position.y!;
        return lastSymbolYPos >= this.bottomSymbolYPos;
    }

    protected resetSymbolPositionsInCycle(symbols: (GridSymbol | Sprite | null)[], nextSymbolId?: number): void {
        symbols.forEach((s, idx) => {
            const isLast = idx === symbols.length - 1;
            const newIndex = isLast ? 0 : idx + 1;

            if (isLast) {
                (s as GridSymbol).position.y = this.defaultSymbolYPositions[0];
                (s as GridSymbol).updateSymbolTexture(
                    nextSymbolId ?? Utils.getRandomInt(0, 9),
                    true
                );
            } else {
                (s as GridSymbol).position.y = this.defaultSymbolYPositions[newIndex];
            }

            (s as GridSymbol).gridY = newIndex;
        });
    }

    protected setGridYValuesForStaticSymbols(symbols: (GridSymbol | Sprite | null)[]): void {
        symbols.forEach((symbol: GridSymbol | Sprite | null, symbolIndex: number) => {
            (symbol as GridSymbol).gridY = symbolIndex;
        });
    }

    // Spinning functionality
    public async startSpin(spinData: IResponseData): Promise<void> {
        this.resetAllReelSpinStates();

        this.assignStopSymbols(spinData.reels);

        for (let i = 0; i < this.reelsSpinStates.length; i++) {
            this.startReelSpin(i, spinData);

            const delay = this._spinMode === GameConfig.SPIN_MODES.NORMAL ? GameConfig.REFERENCE_REEL_DELAY : 0;
            await Utils.delay(delay);
        }
    }

    protected assignStopSymbols(symbols: number[][]): void {
        symbols.forEach((reelSymbols: number[], reelIndex: number) => {
            this.reelsSpinStates[reelIndex].stopSymbols = [];

            for (let i = 0; i < this.config.symbolsVisible; i++) {
                this.reelsSpinStates[reelIndex].stopSymbols.push(reelSymbols[i]);
            }
        });
    }

    public async slowDown() {
        for (let i = 0; i < this.reelsSpinStates.length; i++) {
            this.slowDownReelSpin(i);
            const delay = this._spinMode === GameConfig.SPIN_MODES.NORMAL ? GameConfig.REFERENCE_REEL_DELAY : 0;

            await Utils.delay(delay);
        }
    }

    public async stop() {

    }

    calculateSlowDownDelay(): number {
        return 0;
    }

    startReelSpin(reelId: number, spinData: IResponseData): void {
        this.reelsSpinStates[reelId].state = IReelSpinState.SPEEDING;
        this.reelsSpinStates[reelId].isSpinning = true;
        const reelSymbolsData = spinData.reels[reelId];
        const symbols = reelSymbolsData.map((symbol: number) => symbol);
        this.reelsSpinStates[reelId].stopSymbols = symbols;
    }

    slowDownReelSpin(reelId: number): void {
        this.reelsSpinStates[reelId].state = IReelSpinState.SLOWING;
        this.reelsSpinStates[reelId].isSpinning = true;
    }

    stopReelSpin(reelId: number): void {
        this.reelsSpinStates[reelId].state = IReelSpinState.STOPPING;
        this.reelsSpinStates[reelId].isSpinning = false;
    }

    public async stopSpin(): Promise<void> {
        super.stopSpin();
        for (const state of this.reelsSpinStates) {
            state.speed = 0;
            state.state = IReelSpinState.STOPPED;

            const delay = this._spinMode === GameConfig.SPIN_MODES.NORMAL ? GameConfig.REFERENCE_REEL_DELAY : 0;

            await Helpers.delay(delay);
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