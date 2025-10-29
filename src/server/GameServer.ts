// AssetsConfig no longer needed after PureGameController merge
import { GameConfig } from "../config/GameConfig";
import {
  CascadeStepData,
  DropData,
  GridData,
  GridUtils,
  InitialGridData,
  MatchData,
  SpinRequestData,
  SpinResponseData,
  SpinResultData,
  StepData,
  SymbolData,
} from "../engine/types/ICommunication";
import { debug } from "../engine/utils/debug";
import { Utils } from "../engine/utils/Utils";
import { Reelsets } from "./Games/ClassicSpinGame/Reelsets";

export class GameServer {
  private static instance: GameServer;
  private spinCounter: number = 0;
  private readonly totalSymbols: number = 10; // Number of available symbols (0-9)
  private readonly gameID: number = 0;

  private initData: InitialGridData = { symbols: [] };
  private firstSpin: boolean = true;
  private previousGrid: GridData = { symbols: [] };
  private latestSpinData: StepData = {
    gridBefore: { symbols: [] },
    gridAfter: { symbols: [] },
    wins: [],
  };
  private latestSpinResult: SpinResultData = {
    spinId: "",
    steps: [],
    totalWin: 0,
  };

  private latestSpinRequest: SpinRequestData = {
    betAmount: 0,
    gameMode: "manual",
  };

  private constructor() {
    // No longer need symbolNames array
  }

  public static getInstance(): GameServer {
    if (!GameServer.instance) {
      GameServer.instance = new GameServer();
    }
    return GameServer.instance;
  }

  public generateInitialGridData(): GridData {
    this.initData = this.generateNewGridData();
    return this.initData;
  }

  public async processSpinRequest(
    request: SpinRequestData
  ): Promise<SpinResponseData> {
    try {
      debug.log("GameServer: Processing spin request", request);

      // Simulate server processing delay
      await new Promise((resolve) => setTimeout(resolve, 100));

      const spinId = `spin_${++this.spinCounter}_${Date.now()}`;
      const result = this.generateSpinResult(spinId, request);

      debug.log("GameServer: Spin result generated", result);

      return {
        success: true,
        result,
      };
    } catch (error) {
      debug.error("GameServer: Error processing spin", error);
      return {
        success: false,
        error: "Failed to process spin",
      };
    }
  }

  private generateSpinResult(
    spinId: string,
    request: SpinRequestData
  ): SpinResultData {
    const spinData: SpinResultData = {
      spinId,
      steps: [],
      totalWin: 0,
    };
    this.previousGrid = this.firstSpin
      ? this.initData
      : this.latestSpinData.gridAfter;
    this.firstSpin = false;
    this.latestSpinData = {
      gridBefore: this.firstSpin ? this.initData : this.previousGrid,
      gridAfter: this.generateNewGridData(),
      wins: [],
    };
    spinData.steps.push(this.latestSpinData);
    return spinData;
  }
  /*private generateSpinResult(spinId: string, request: SpinRequestData): SpinResultData {
        // Process cascades
        const cascadeSteps: CascadeStepData[] = [];
        let stepNumber = 0;
        let totalWin = 0;
        // Generate initial grid
        if(this.currentGrid.symbols.length == 0) {
            this.initialGrid = this.generateInitialGrid();
            this.currentGrid = this.initialGrid;
        } else {
            this.previousGrid = this.currentGrid;
        }
        
        
        // Process initial matches and subsequent cascades
        while (true) {
            const matches = this.findMatches(this.currentGrid);
            
            if (matches.length === 0) {
                // No more matches, cascade sequence complete
                break;
            }
            
            // Calculate win for this step
            const stepWin = this.calculateWin(matches, request.betAmount);
            totalWin += stepWin;
            
            // Calculate cascade components
            const indicesToRemove = matches.flatMap(match => match.indices);
            const symbolsToDrop = this.calculateDrops(this.currentGrid, indicesToRemove);
            const { newSymbols, newSymbolIndices } = this.generateNewSymbols(this.currentGrid, indicesToRemove);
            
            debug.log(`Cascade step ${stepNumber}: Removing ${indicesToRemove.length} symbols, dropping ${symbolsToDrop.length} symbols, adding ${newSymbols.length} new symbols`);
            
            // Apply the cascade to current grid first
            const updatedGrid = this.applyCascade(this.currentGrid, {
                step: stepNumber,
                matches: matches.map(match => ({
                    ...match,
                    winAmount: stepWin / matches.length
                })),
                indicesToRemove,
                symbolsToDrop,
                newSymbols,
                newSymbolIndices,
                gridAfter: { symbols: [] } // Temporary, will be updated below
            });
            
            debug.log(`Grid after cascade step ${stepNumber} has ${updatedGrid.symbols.length} symbols`);
            
            // Create cascade step data with the grid state after this step
            const cascadeStep: CascadeStepData = {
                step: stepNumber,
                matches: matches.map(match => ({
                    ...match,
                    winAmount: stepWin / matches.length // Distribute win across matches
                })),
                indicesToRemove,
                symbolsToDrop,
                newSymbols,
                newSymbolIndices,
                gridAfter: updatedGrid
            };
            
            cascadeSteps.push(cascadeStep);
            
            // Update current grid for next iteration
            this.currentGrid = updatedGrid;
            stepNumber++;
            
            // Prevent infinite loops (safety)
            if (stepNumber > 10) {
                debug.warn('GameServer: Maximum cascade steps reached, breaking');
                break;
            }
        }
        
        return {
            spinId,
            initialGrid: this.initialGrid,
            cascadeSteps,
            totalWin,
            finalGrid: this.currentGrid,
            previousGrid: this.previousGrid
        };
    }*/

  private generateNewGridData(): GridData {
    const symbols: SymbolData[][] = [];
    const totalRows =
      GameConfig.GRID_LAYOUT.visibleRows +
      GameConfig.GRID_LAYOUT.rowsAboveMask +
      GameConfig.GRID_LAYOUT.rowsBelowMask;
    for (let col = 0; col < GameConfig.GRID_LAYOUT.columns; col++) {
      symbols.push([]);
      const reelset = Reelsets.Reelsets[col];
      const randomIndex = Utils.getRandomInt(0, reelset.length - 1);
      console.log(
        "randomIndex", randomIndex
      )
      if (randomIndex + totalRows <= reelset.length) {
        for (let row = randomIndex; row < randomIndex + totalRows; row++) {
          const sym = { symbolId: reelset[row] };
          if (sym.symbolId === undefined || sym.symbolId > 9) debugger;
          symbols[col].push(sym as SymbolData);
        }
      } else {
        const remaining = totalRows - (reelset.length - randomIndex);
        for (let row = randomIndex; row < reelset.length; row++) {
          const sym = { symbolId: reelset[randomIndex] };
          if (sym.symbolId === undefined || sym.symbolId > 9) debugger;
          symbols[col].push(sym as SymbolData);
        }
        for (let row = 0; row < remaining; row++) {
          const sym = { symbolId: reelset[row] };
          if (sym.symbolId === undefined || sym.symbolId > 9) debugger;
          symbols[col].push(sym as SymbolData);
        }
      }
    }
    console.log(
      "symbols", symbols
    )
    return { symbols: symbols as SymbolData[][] };
  }

  private calculateDrops(
    grid: GridData,
    indicesToRemove: number[]
  ): DropData[] {
    /*const drops: DropData[] = [];
        const symbols = [...grid.symbols]; // Copy array
        const removeSet = new Set(indicesToRemove);

        // For each column, calculate how symbols drop
        for (let col = 0; col < GameConfig.GRID_LAYOUT.columns; col++) {
            const columnIndices: number[] = [];
            const columnSymbols: (SymbolData | null)[] = [];

            // Collect symbols in this column
            for (let row = 0; row < GameConfig.GRID_LAYOUT.visibleRows; row++) {
                const index = GridUtils.positionToIndex(col, row);
                columnIndices.push(index);
                columnSymbols.push(removeSet.has(index) ? null : symbols[index]);
            }

            // Calculate drops - symbols fall to fill gaps
            const nonNullSymbols = columnSymbols.map((symbol, i) => ({ symbol, originalIndex: columnIndices[i] }))
                .filter(item => item.symbol !== null);

            for (let i = 0; i < nonNullSymbols.length; i++) {
                const item = nonNullSymbols[i];
                const newRow = GameConfig.GRID_LAYOUT.visibleRows - 1 - i;
                const newIndex = GridUtils.positionToIndex(col, newRow);

                if (item.originalIndex !== newIndex) {
                    drops.push({
                        symbolId: item.symbol!.symbolId,
                        fromIndex: item.originalIndex,
                        toIndex: newIndex
                    });
                }
            }
        }

        return drops;*/
    return [];
  }

  private generateNewSymbols(
    _grid: GridData,
    indicesToRemove: number[]
  ): { newSymbols: SymbolData[]; newSymbolIndices: number[] } {
    const newSymbols: SymbolData[] = [];
    const newSymbolIndices: number[] = [];
    const removeSet = new Set(indicesToRemove);

    // For each column, count how many symbols were removed
    for (let col = 0; col < GameConfig.GRID_LAYOUT.columns; col++) {
      let removedCount = 0;
      for (let row = 0; row < GameConfig.GRID_LAYOUT.visibleRows; row++) {
        const index = GridUtils.positionToIndex(col, row);
        if (removeSet.has(index)) {
          removedCount++;
        }
      }

      // Generate new symbols for this column - they fill from the top
      for (let i = 0; i < removedCount; i++) {
        const newIndex = GridUtils.positionToIndex(col, i);
        newSymbols.push({
          symbolId: this.getRandomSymbol(),
        });
        newSymbolIndices.push(newIndex);
      }
    }

    debug.log(`Generated ${newSymbols.length} new symbols for ${indicesToRemove.length} removed symbols`);
    return { newSymbols, newSymbolIndices };
  }

  private applyCascade(grid: GridData, cascadeStep: CascadeStepData): GridData {
    // Start with a copy of the current grid
    /*const symbols = [...grid.symbols];

        // Remove matched symbols
        cascadeStep.indicesToRemove.forEach(index => {
            symbols[index] = null as any; // Temporarily null
        });

        // Apply drops
        cascadeStep.symbolsToDrop.forEach(drop => {
            const symbol = symbols[drop.fromIndex];
            if (symbol) {
                symbols[drop.fromIndex] = null as any;
                symbols[drop.toIndex] = symbol;
            }
        });

        // Add new symbols
        cascadeStep.newSymbols.forEach((symbol, i) => {
            const targetIndex = cascadeStep.newSymbolIndices[i];
            symbols[targetIndex] = symbol;
        });

        // Filter out any null values and ensure we have exactly 15 symbols
        const finalSymbols: SymbolData[] = [];
        for (let i = 0; i < 15; i++) {
            if (symbols[i] && symbols[i] !== null) {
                finalSymbols.push(symbols[i]);
            } else {
                // This should not happen if cascade logic is correct, but add safety
                debug.error(`Missing symbol at index ${i} after cascade - adding random symbol`);
                finalSymbols.push({
                    symbolId: this.getRandomSymbol()
                });
            }
        }

        // Verify we have exactly 15 symbols
        if (finalSymbols.length !== 15) {
            debug.error(`Grid after cascade has ${finalSymbols.length} symbols, expected 15`);
        }

        return { symbols: finalSymbols };*/
    return { symbols: [] };
  }

  private calculateWin(matches: MatchData[], betAmount: number): number {
    // Simple win calculation - in real game this would be more complex
    let totalWin = 0;
    matches.forEach((match) => {
      const baseWin = match.indices.length * betAmount * 0.1;
      totalWin += baseWin;
    });
    return Math.round(totalWin * 100) / 100; // Round to 2 decimal places
  }

  private getRandomSymbol(): number {
    // Generate a random symbol ID from 0 to 10
    return Math.floor(Math.random() * this.totalSymbols);
  }

  private cloneGrid(grid: GridData): GridData {
    return {
      symbols: grid.symbols.map((symbol) => ({ ...symbol })),
    };
  }
}
