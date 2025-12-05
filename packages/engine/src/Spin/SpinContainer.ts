import { Container, Application, Sprite } from "pixi.js";
import { GridSymbol } from "../symbol/GridSymbol";
import { Symbol } from "../symbol/Symbol";
import {
  signals,
  SIGNAL_EVENTS,
  SignalSubscription,
} from "../controllers/SignalManager";
import { IReelMode } from "../reels/ReelController";
import {
  GridUtils,
  IResponseData,
} from "../types/ICommunication";
import { debug } from "../utils/debug";
import { GameDataManager } from "../data/GameDataManager";
import { SpinMode } from "../types/ISpinConfig";
import { ConfigProvider, IGameConfig } from "@slotclient/config";

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

export abstract class SpinContainer extends Container {
  protected app: Application;
  protected gameConfig: IGameConfig;
  protected config: SpinContainerConfig;
  protected resizeSubscription?: SignalSubscription;

  // Mode and state
  protected currentMode: IReelMode = IReelMode.STATIC;
  protected isSpinning: boolean = false;

  // Grid layout properties
  protected columns: number; // Number of reels
  protected rowsAboveMask: number;
  protected rowsBelowMask: number;
  protected totalRows: number;
  protected _abortController: AbortController | null = null;
  protected _spinMode: SpinMode;
  protected _forceStop: boolean = false;

  // Symbol storage - unified approach
  public symbols: (GridSymbol | Sprite | null)[][] = [];

  // Animation state
  protected spinStartTime: number = 0;
  protected targetSymbols: number[] = [];
  public onSpinCompleteCallback?: () => Promise<void>;

  constructor(app: Application, config: SpinContainerConfig) {
    super();

    this.gameConfig = ConfigProvider.getInstance().getGameConfig();
    this._spinMode = this.gameConfig.SPIN_MODES.NORMAL as SpinMode;

    this.label = "SpinContainer";
    this.app = app;
    this.config = config; // Initialize grid layout properties

    this.columns = config.numberOfReels || 1; // Default to 1 if not provided
    this.rowsAboveMask =
      config.rowsAboveMask || this.gameConfig.GRID_LAYOUT.rowsAboveMask;
    this.rowsBelowMask =
      config.rowsBelowMask || this.gameConfig.GRID_LAYOUT.rowsBelowMask;
    this.totalRows = this.gameConfig.GRID_LAYOUT.totalRows();

    this.initializeGrid();
  }

  public abstract displayInitialGrid(initialGrid: number[][]): Promise<void>;

  protected async initializeGrid(): Promise<void> {
    const symbolIds = GameDataManager.getInstance().getInitialSymbols();

    if (!symbolIds) {
      debug.warn("SpinContainer: No initial symbols found in GameDataManager.");
      return;
    }

    const min = 0;
    const max = 10;

    const symbolsBefore: number[][] = symbolIds.map((column: number[]) => {
      if (column.length === 0) return column;

      const newColumn = [...column];
      const randomFirst = Math.floor(Math.random() * (max - min + 1)) + min;
      const randomLast = Math.floor(Math.random() * (max - min + 1)) + min;

      newColumn.unshift(randomFirst);
      newColumn.push(randomLast);

      return newColumn;
    });

    this.symbols = [];
    for (let col = 0; col < this.columns; col++) {
      this.symbols[col] = [];
      for (let row = 0; row < this.config.symbolsVisible + this.rowsBelowMask + this.rowsAboveMask; row++) {
        const symbol = this.createGridSymbol(symbolsBefore[col][row], col, row);
        this.symbols[col][row] = symbol;
        this.symbols[col][row]!.visible = false;
      }
    }
  }

  // Utility methods
  protected delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  protected setupResizeHandler(): void {
    this.resizeSubscription = signals.on(SIGNAL_EVENTS.SCREEN_RESIZE, () => {
      //this.onResize();
    });
  }

  protected onResize(): void { }

  // Position calculation utilities
  public calculateSymbolX(column: number = 0): number {
    const symbolWidth = this.gameConfig.REFERENCE_SPRITE_SYMBOL.width;

    const spacingX = this.gameConfig.REFERENCE_SPACING.horizontal;

    const reelX =
      (column - Math.floor(this.gameConfig.GRID_LAYOUT.columns / 2)) *
      (symbolWidth + spacingX) +
      this.gameConfig.REFERENCE_RESOLUTION.width / 2 +
      (this.gameConfig.GRID_LAYOUT.columns % 2 == 0
        ? (symbolWidth + spacingX) / 2
        : 0); // Center of symbol

    return reelX; // Center in container
  }

  public calculateSymbolY(row: number): number {
    const symbolHeight = this.gameConfig.REFERENCE_SPRITE_SYMBOL.height;

    const spacingY = this.gameConfig.REFERENCE_SPACING.vertical;

    const symbolY =
      (row - 1 - Math.floor(this.gameConfig.GRID_LAYOUT.visibleRows / 2)) *
      (symbolHeight + spacingY) +
      this.gameConfig.REFERENCE_RESOLUTION.height / 2 +
      (this.gameConfig.GRID_LAYOUT.visibleRows % 2 == 0
        ? (symbolHeight + spacingY) / 2
        : 0);

    return symbolY;
  }

  protected calculateGridIndex(row: number): number {
    return row + this.rowsAboveMask;
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
    const targetReelIndex =
      reelIndex !== undefined ? reelIndex : this.config.reelIndex;

    //this.clearSymbolsForReel(targetReelIndex);

    this.setGridSymbols(symbols, targetReelIndex);
    /*if (this.currentMode === 'cascading') {
            this.setGridSymbols(symbols, targetReelIndex);
        } else {
            this.setBasicSymbols(symbols, targetReelIndex);
        }*/
  }

  protected clearSymbolsForReel(reelIndex: number): void {
    // Clear existing symbols for this specific reel
    if (this.symbols[reelIndex]) {
      for (let row = 0; row < this.symbols[reelIndex].length; row++) {
        const symbol = this.symbols[reelIndex][row];
        if (symbol) {
          this.removeChild(symbol);
          if ("destroy" in symbol) {
            symbol.destroy();
          }
          this.symbols[reelIndex][row] = null;
        }
      }
    }
  }

  protected setGridSymbols(symbols: number[], reelIndex: number): void {
    // Create symbols with buffer for smooth scrolling (like StaticContainer)
    const totalSymbols =
      this.config.symbolsVisible +
      (this.config.rowsAboveMask || 0) +
      (this.config.rowsBelowMask || 0); // 1 above + visible + 1 below
    const symbolsToCreate = Math.max(totalSymbols, symbols.length);

    const symbolX = this.calculateSymbolX(reelIndex);

    for (let i = 0; i < symbolsToCreate; i++) {
      // Get symbol ID
      const symbolId = i < symbols.length ? symbols[i] : 0;
      const index = reelIndex * this.config.symbolsVisible + i;

      const gridSymbol = this.createGridSymbol(symbolId, reelIndex, index);

      if (gridSymbol) {
        const gridIndex = this.calculateGridIndex(i);
        try {
          this.symbols[reelIndex][gridIndex] = gridSymbol;
        } catch (error) {
          debugger;
        }
      }
    }
  }

  protected setBasicSymbols(symbols: number[], reelIndex: number): void {
    this.clearSymbolsForReel(reelIndex);
    // Create symbols with buffer for smooth scrolling (like StaticContainer)
    const totalSymbols =
      this.config.symbolsVisible +
      (this.config.rowsAboveMask || 0) +
      (this.config.rowsBelowMask || 0); // 1 above + visible + 1 below
    const symbolsToCreate = Math.max(totalSymbols, symbols.length);

    const symbolX = this.calculateSymbolX(reelIndex);

    for (let i = 0; i < symbolsToCreate; i++) {
      // Calculate vertical position (actual pixels)
      const symbolY = this.calculateSymbolY(i);

      // Get symbol ID
      const symbolId = i < symbols.length ? symbols[i] : 0;

      // Create symbol with container positioning to avoid conflicts with ReelsContainer offset
      const symbol = new Symbol({
        symbolId: symbolId,
        position: {
          x: symbolX, // Offset for container position
          y: symbolY, // Offset for container position
        },
        scale: this.gameConfig.REFERENCE_SPRITE_SYMBOL.scale,
      });

      if (symbol === null) debugger;
      // Add to container and grid
      this.addChild(symbol);
      const gridIndex = this.calculateGridIndex(i);
      this.symbols[reelIndex][i] = symbol;
    }

    debug.log(`SpinContainer: Created ${symbolsToCreate} symbols for reel ${reelIndex} using pixel coordinates`);
  }

  // Symbol creation
  protected createGridSymbol(symbolData: number, column: number, row: number): GridSymbol | null {
    const symbolX = this.calculateSymbolX(column);
    const symbolY = this.calculateSymbolY(row);

    const gridSymbol = new GridSymbol({
      symbolId: symbolData,
      position: { x: symbolX, y: symbolY },
      scale: this.gameConfig.REFERENCE_SPRITE_SYMBOL.scale, // Use reference scale
      gridX: column,
      gridY: row,
    });

    // Add to display
    this.addChild(gridSymbol);

    return gridSymbol;
  }

  // Spinning functionality
  public abstract startSpin(spinData: IResponseData): Promise<void>;

  public stopSpin(): void {
    this.isSpinning = false;

    if (this.onSpinCompleteCallback) {
      this.onSpinCompleteCallback();
    }
  }

  public allReelsStopped(): Promise<boolean> {
    return Promise.resolve(true);
  }

  protected removeSymbolsFromIndices(indicesToRemove: number[]): void {
    indicesToRemove.forEach((index) => {
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

  protected addNewSymbolsFromData(newSymbolsData: number[], newSymbolIndices: number[]): void {
    newSymbolsData.forEach((symbolId, i) => {
      const index = newSymbolIndices[i];
      const newSymbol = this.createGridSymbol(symbolId, i, index); // Y position is 0 for new symbols

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
    return (
      this.symbols[this.config.reelIndex][
        this.symbols[this.config.reelIndex].length - 1
      ]?.y || 0
    );
  }
  public getTopSymbolYPos(): number {
    return this.symbols[this.config.reelIndex][0]?.y || 0;
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
    return Math.floor(Math.random() * this.gameConfig.GRID.totalSymbols);
  }

  public clearSymbols(): void {
    this.symbols.forEach((reel) => {
      reel.forEach((symbol) => {
        if (symbol === null) return;
        this.removeChild(symbol);
        symbol.destroy();
      });
    });
  }

  // Getters
  public get reelIndex(): number {
    return this.config.reelIndex;
  }

  public getIsSpinning(): boolean {
    return this.isSpinning;
  }

  public getSpinMode(): SpinMode {
    return this._spinMode;
  }

  public setSpinMode(mode: SpinMode) {
    this._spinMode = mode;
  }

  public getSymbols(): (GridSymbol | Sprite | null)[][] {
    return this.symbols;
  }

  public getSymbolIds(): number[][] {
    return this.symbols.map((reel) =>
      reel.map((symbol) => (symbol instanceof GridSymbol ? symbol.symbolId : -1))
    );
  }

  public isForceStopped(): boolean {
    return this._forceStop;
  }

  public setForceStop(forceStop: boolean): void {
    this._abortController?.abort();
    this._abortController = null;
    this._forceStop = forceStop;
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
