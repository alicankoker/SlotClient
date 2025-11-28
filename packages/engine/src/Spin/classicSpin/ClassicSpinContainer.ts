import { Application } from "pixi.js";
import { SpinContainer } from "../SpinContainer";
import { SpinContainerConfig } from "@slotclient/types";
import { SpinConfig } from "@slotclient/config/SpinConfig";
import { IReelMode } from "../../reels/ReelController";
import { GridSymbol } from "../../symbol/GridSymbol";
import { Sprite } from "pixi.js";
import { debug } from "../../utils/debug";
import { GameConfig, spinContainerConfig } from "@slotclient/config/GameConfig";
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
            isSpinning: false,
            anticipated: false,
            isAnticipating: false,
        }));
    }

    resetReelSpinState(reelId: number): void {
        this.reelsSpinStates[reelId].state = IReelSpinState.IDLE;
        this.reelsSpinStates[reelId].speed = SpinConfig.SPIN_SPEED;
        this.reelsSpinStates[reelId].symbols = [];
        this.reelsSpinStates[reelId].readyForStopping = false;
        this.reelsSpinStates[reelId].readyForSlowingDown = false;
        this.reelsSpinStates[reelId].stopProgressStarted = false;
        this.reelsSpinStates[reelId].currentStopSymbolId = -1;
        this.reelsSpinStates[reelId].anticipated = false;
        this.reelsSpinStates[reelId].isAnticipating = false;
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
        if (this.reelsSpinStates[reelId].state === IReelSpinState.STOPPED || this.reelsSpinStates[reelId].state === IReelSpinState.IDLE) {
            return;
        }
        if (this.reelsSpinStates[reelId].state === IReelSpinState.SLOWING && this.reelsSpinStates[reelId].speed > SpinConfig.REEL_SLOW_DOWN_SPEED_LIMIT) {
            this.reelsSpinStates[reelId].speed -= SpinConfig.REEL_SLOW_DOWN_COEFFICIENT;
            if (this.reelsSpinStates[reelId].speed <= SpinConfig.REEL_SLOW_DOWN_SPEED_LIMIT) {
                this.reelsSpinStates[reelId].speed = SpinConfig.REEL_SLOW_DOWN_SPEED_LIMIT;
                this.reelsSpinStates[reelId].anticipated && (this.reelsSpinStates[reelId].anticipated = false);
            }
        }
        if (this.reelsSpinStates[reelId].state === IReelSpinState.SPEEDING) {
            if (this.reelsSpinStates[reelId].speed < SpinConfig.REEL_MAX_SPEED) {
                this.reelsSpinStates[reelId].speed += SpinConfig.REEL_SPEED_UP_COEFFICIENT;
            } else {
                this.reelsSpinStates[reelId].state = IReelSpinState.SPINNING;
            }
        }
        if (this.reelsSpinStates[reelId].state === IReelSpinState.STOPPING) {
            this.reelsSpinStates[reelId].speed = SpinConfig.REEL_MAX_SPEED;
        }
        if (this.reelsSpinStates[reelId].state === IReelSpinState.ANTICIPATING) {
            this.reelsSpinStates[reelId].speed = SpinConfig.REEL_ANTICIPATION_SPEED;
        }
        if (this._spinMode === GameConfig.SPIN_MODES.TURBO && FreeSpinController.getInstance().isRunning === false) {
            this.reelsSpinStates[reelId].state = IReelSpinState.STOPPED;
            this.reelStopped(reelId);
            return;
        }
        if (this._spinMode === GameConfig.SPIN_MODES.FAST && this.reelsSpinStates[reelId].isAnticipating === true && FreeSpinController.getInstance().isRunning === false) {
            this.reelsSpinStates[reelId].speed = SpinConfig.FAST_SPIN_SPEED;
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
        this.setFinalSymbols(reelId);
        signals.emit("reelStopped", reelId);

        if ((reelId === 2) && this.checkForAnticipation() && this._spinMode !== GameConfig.SPIN_MODES.TURBO) {
            this.anticipateReelSpin(this.columns - 1);

            return;
        }

        if (reelId === this.columns - 1) {
            if (this.reelsSpinStates[reelId].isAnticipating) {
                this.reelsSpinStates[reelId].isAnticipating = false;
            }

            this.allReelsStopped();
        }
        //dispatch to the whole game;
    }

    protected setFinalSymbols(reelId: number): void {
        this.resetSymbolPositionsInCycle(this.symbols[reelId]);
        this.symbols[reelId].forEach((symbol) => {
            if (symbol) {
                (symbol as GridSymbol).updateSymbolTexture((symbol as GridSymbol).getSymbolId(), false);
            }
        });
    }

    protected progressReelSpin(reelSymbols: (GridSymbol | Sprite | null)[], reelId: number, deltaTime: number): void {
        for (let i = 0; i < reelSymbols.length; i++) {
            const symbol = reelSymbols[i];
            if (!symbol) return;

            let cycleEnded = this.checkCycleEndedForState(reelId);
            if (cycleEnded) {
                if (this.reelsSpinStates[reelId].stopProgressStarted && reelId == this.currentStoppingReelId && this.reelsSpinStates[reelId].anticipated === false) {
                    if (this.reelsSpinStates[reelId].currentStopSymbolId == this.config.symbolsVisible - 1) {
                        this.reelsSpinStates[reelId].state = IReelSpinState.STOPPED;
                        this.reelsSpinStates[reelId].isSpinning = false;
                        this.reelsSpinStates[reelId].speed = 0;

                        if (this.currentStoppingReelId === this.config.numberOfReels! - 1) {
                            this.currentStoppingReelId = -1;
                        } else {
                            this.currentStoppingReelId++;
                        }

                        this.reelStopped(reelId);
                    } else {
                        this.reelsSpinStates[reelId].currentStopSymbolId++;
                        const currentStopSymbolId = this.reelsSpinStates[reelId].currentStopSymbolId
                        const stopSymbolIndex = this.config.symbolsVisible - 1 - currentStopSymbolId;
                        const stopSymbol = this.reelsSpinStates[reelId].stopSymbols[stopSymbolIndex]
                        this.resetSymbolPositionsInCycle(reelSymbols, stopSymbol);
                    }
                } else {
                    this.resetSymbolPositionsInCycle(reelSymbols);
                }
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
        return cycleEnded;
    }

    protected resetSymbolPositionsInCycle(symbols: (GridSymbol | Sprite | null)[], nextSymbolId?: number): void {
        symbols.forEach((symbol: GridSymbol | Sprite | null, symbolIndex: number) => {
            const isLastSymbol = symbolIndex === symbols.length - 1;
            const indToChange: number = isLastSymbol ? 0 : symbolIndex + 1;
            if (isLastSymbol) {
                (symbol as GridSymbol).position.y = this.defaultSymbolYPositions[0];
                (symbol as GridSymbol).updateSymbolTexture(nextSymbolId !== undefined && nextSymbolId > -1 ? nextSymbolId : Utils.getRandomInt(0, 10), true);
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

    // Spinning functionality
    public async startSpin(spinData: IResponseData): Promise<void> {
        this.resetAllReelSpinStates();

        for (let i = 0; i < this.reelsSpinStates.length; i++) {
            this.startReelSpin(i, spinData);
            this.assignStopSymbols(spinData.reels)

            let delay: number = SpinConfig.REEL_SPIN_DURATION;
            this.defaultSpinReel(i);

            if (FreeSpinController.getInstance().isRunning === false) {
                switch (this._spinMode) {
                    case GameConfig.SPIN_MODES.FAST:
                        this.fastSpinReel(i);
                        delay = delay / 2;
                        break;
                    case GameConfig.SPIN_MODES.TURBO:
                        this.turboSpinReel(i);
                        delay = 0;
                        break;
                }
            }

            await Utils.delay(delay);
        }
    }

    protected assignStopSymbols(symbols: number[][]): void {
        symbols.forEach((reelSymbols: number[], reelIndex: number) => {
            for (let i: number = 0; i < this.config.symbolsVisible; i++) {
                const symInd: number = this.config.symbolsVisible - i - 1;
                this.reelsSpinStates[reelIndex].stopSymbols.push(reelSymbols[i]);
            }
        });
    }

    public async slowDown() {
        const count = this.reelsSpinStates.length;

        for (let i = 0; i < count; i++) {
            if (this.reelsSpinStates[i].isAnticipating || this.reelsSpinStates[i].isSpinning === false) {
                continue;
            }

            this.slowDownReelSpin(i);

            this._abortController = new AbortController();
            const signal = this._abortController.signal;

            const delay = ((this._spinMode === GameConfig.SPIN_MODES.NORMAL || FreeSpinController.getInstance().isRunning) && this.isForceStopped() === false) ? SpinConfig.REEL_SPIN_DURATION : 0;

            await Helpers.delay(delay, signal);
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

    async anticipateReelSpin(reelId: number): Promise<void> {
        this.reelsSpinStates[reelId].state = IReelSpinState.ANTICIPATING;
        this.reelsSpinStates[reelId].isAnticipating = true;
        this.reelsSpinStates[reelId].anticipated = true;

        await Utils.delay(SpinConfig.REEL_ANTICIPATION_DURATION);
        this.reelsSpinStates[reelId].isAnticipating = false;
        this.slowDown();
    }

    fastSpinReel(reelId: number): void {
        this.reelsSpinStates[reelId].speed = SpinConfig.FAST_SPIN_SPEED;
    }

    turboSpinReel(reelId: number): void {
        this.reelsSpinStates[reelId].speed = 0;
    }

    defaultSpinReel(reelId: number): void {
        this.reelsSpinStates[reelId].speed = SpinConfig.SPIN_SPEED;
    }

    checkReelForAnticipation(reelId: number): boolean {
        const reel = GameDataManager.getInstance().getResponseData().reels[reelId];

        if (reel === undefined) return false;

        return reel.some((symbol: number) => {
            return symbol === 10;
        });
    }

    checkForAnticipation(): boolean {
        const targetReels = [0, 2];
        let count = 0;

        for (const rIndex of targetReels) {
            const reel = this.symbols[rIndex];
            if (reel === undefined) continue;

            if (this.checkReelForAnticipation(rIndex)) {
                count++;
            }
        }

        return count === 2;
    }

    public async stopSpin(): Promise<void> {
        super.stopSpin();
        for (const state of this.reelsSpinStates) {
            state.speed = 0;
            state.state = IReelSpinState.STOPPED;

            const delay = this._spinMode === GameConfig.SPIN_MODES.NORMAL ? SpinConfig.REEL_SPIN_DURATION : 0;

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