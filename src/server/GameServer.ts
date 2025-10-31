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
import { GameRulesConfig } from "../config/GameRulesConfig";

export class GameServer {
  private static instance: GameServer;
  private spinCounter: number = 0;
  private readonly totalSymbols: number = 10; // Number of available symbols (0-9)
  private readonly gameID: number = 0;
  private lines = Object.values(GameRulesConfig.WINNING_LINES);

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
    fsWon: false,
    bonusWon: false,
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

  private analyzeGridWins(grid: GridData): MatchData[] {
    const matches: MatchData[] = [];
    const fsWon = this.checkFSWon(grid);
    const bonusWon = this.checkBonusWon(grid);

    this.lines.forEach(line => {
      let count = 0;
      let wildId = 9;
      const indices: [number, number][] = [];
      const wilds = this.checkForWilds(line, grid);
      const initialWildCount = wilds.length;
      const initialIndexToStart = initialWildCount > 0 ? initialWildCount + 1 : 1;
      wilds.forEach(wild => {
        indices.push([wild[0], wild[1]]);
      });
      indices.push([initialWildCount, line[initialIndexToStart] + 1]);
      count = initialWildCount > 0 ? initialWildCount + 1 : 1;
      const firstSymbolIndex = initialWildCount > 0 ? initialIndexToStart - 1 : 0;
      const firstSymbol = grid.symbols[firstSymbolIndex][line[firstSymbolIndex] + 1];
      for(let i = initialIndexToStart; i < line.length; i++) {
        const currentSymbol = grid.symbols[i][line[i] + 1];
        if (firstSymbol.symbolId === currentSymbol.symbolId || currentSymbol.symbolId === wildId) {
          indices.push([i, line[i] + 1]);
          count++;
        }else break;
      }
      if(count >= 3) {
        matches.push({ indices, wilds, symbolId: grid.symbols[initialIndexToStart][line[initialIndexToStart] + 1].symbolId, line, winAmount: 0, fsWon, bonusWon });
      }
    });
    console.log("matches", matches);
    return matches;
  }

  private checkForWilds(lineData: number[], gridData: GridData): [number, number][] {
    let wildPositions: [number, number][] =  [];
    for (let i = 0; i < lineData.length; i++) { 
      const lineIndex = lineData[i] + 1;
      const symbol = gridData.symbols[i][lineIndex];
      if (symbol.symbolId === 9) {
        wildPositions.push([i, lineIndex]);
      }else{
        break;
      }
    }
    return wildPositions;
  }

  private generateSpinResult(
    spinId: string,
    request: SpinRequestData
  ): SpinResultData {
    const spinData: SpinResultData = {
      spinId,
      steps: [],
      totalWin: 0,
      fsWon: false,
      bonusWon: false,
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
    this.latestSpinData.gridAfter.symbols[0][0].symbolId = 8;
    this.latestSpinData.gridAfter.symbols[0][1].symbolId = 9;
    this.latestSpinData.gridAfter.symbols[0][2].symbolId = 0;
    this.latestSpinData.gridAfter.symbols[0][3].symbolId = 2;
    this.latestSpinData.gridAfter.symbols[0][4].symbolId = 5;
    this.latestSpinData.gridAfter.symbols[1][0].symbolId = 4;
    this.latestSpinData.gridAfter.symbols[1][1].symbolId = 0;
    this.latestSpinData.gridAfter.symbols[1][2].symbolId = 0;
    this.latestSpinData.gridAfter.symbols[1][3].symbolId = 9;
    this.latestSpinData.gridAfter.symbols[1][4].symbolId = 8;
    this.latestSpinData.gridAfter.symbols[2][0].symbolId = 10;
    this.latestSpinData.gridAfter.symbols[2][1].symbolId = 0;
    this.latestSpinData.gridAfter.symbols[2][2].symbolId = 9;
    this.latestSpinData.gridAfter.symbols[2][3].symbolId = 2;
    this.latestSpinData.gridAfter.symbols[2][4].symbolId = 5;  
    this.latestSpinData.gridAfter.symbols[3][0].symbolId = 6;
    this.latestSpinData.gridAfter.symbols[3][1].symbolId = 8;
    this.latestSpinData.gridAfter.symbols[3][2].symbolId = 7;
    this.latestSpinData.gridAfter.symbols[3][3].symbolId = 9;
    this.latestSpinData.gridAfter.symbols[3][4].symbolId = 2;
    this.latestSpinData.gridAfter.symbols[4][0].symbolId = 6;
    this.latestSpinData.gridAfter.symbols[4][1].symbolId = 5;
    this.latestSpinData.gridAfter.symbols[4][2].symbolId = 1;
    this.latestSpinData.gridAfter.symbols[4][3].symbolId = 2;
    this.latestSpinData.gridAfter.symbols[4][4].symbolId = 8;
    spinData.steps.push(this.latestSpinData);
    const matches = this.analyzeGridWins(this.latestSpinData.gridAfter);
    this.latestSpinData.wins = matches.map(match => ({ match, winAmount: this.calculateWin([match], request.betAmount) }));
    spinData.totalWin = this.latestSpinData.wins.reduce((acc, win) => acc + win.winAmount, 0);
    return spinData;
  }

  private checkFSWon(gridData: GridData): boolean {
    let scatterCount = 0;
    gridData.symbols.forEach(column => {
      for (let row = 1; row < column.length - 1; row++) {
        const symbol = column[row];
        if (symbol.symbolId === 8) {
          scatterCount++;
        } else {
          break;
        }
      }
    });
    return scatterCount >= 3;
  }

  private checkBonusWon(gridData: GridData): boolean {
    let bonusCount = 0;
    for (let col = 1; col < gridData.symbols.length - 1; col += 2) {
      for (let row = 1; row < gridData.symbols[col].length - 1; row++) {
        const symbol = gridData.symbols[col][row];
        if (symbol.symbolId === 10) {
          bonusCount++;
        }
      }
    }
    return bonusCount >= 3;
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
