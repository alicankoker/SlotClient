// AssetsConfig no longer needed after PureGameController merge
import { GameConfig } from '../config/GameConfig';
import { 
    SpinRequestData, 
    SpinResponseData, 
    SpinResultData, 
    InitialGridData, 
    CascadeStepData, 
    SymbolData, 
    MatchData, 
    DropData,
    GridUtils
} from '../engine/types/GameTypes';
import { debug } from '../engine/utils/debug';

export class GameServer {
    private static instance: GameServer;
    private spinCounter: number = 0;
    private readonly totalSymbols: number = 14; // Number of available symbols (0-13)

    private constructor() {
        // No longer need symbolNames array
    }

    public static getInstance(): GameServer {
        if (!GameServer.instance) {
            GameServer.instance = new GameServer();
        }
        return GameServer.instance;
    }

    public generateInitialGridData(): InitialGridData {
        return this.generateInitialGrid();
    }

    public async processSpin(request: SpinRequestData): Promise<SpinResponseData> {
        try {
            debug.log('GameServer: Processing spin request', request);
            
            // Simulate server processing delay
            await new Promise(resolve => setTimeout(resolve, 100));
            
            const spinId = `spin_${++this.spinCounter}_${Date.now()}`;
            const result = this.generateSpinResult(spinId, request);
            
            debug.log('GameServer: Spin result generated', result);
            
            return {
                success: true,
                result
            };
        } catch (error) {
            debug.error('GameServer: Error processing spin', error);
            return {
                success: false,
                error: 'Failed to process spin'
            };
        }
    }

    private generateSpinResult(spinId: string, request: SpinRequestData): SpinResultData {
        // Generate initial grid
        const initialGrid = this.generateInitialGrid();
        
        // Process cascades
        const cascadeSteps: CascadeStepData[] = [];
        let currentGrid = this.cloneGrid(initialGrid);
        let stepNumber = 0;
        let totalWin = 0;
        
        // Process initial matches and subsequent cascades
        while (true) {
            const matches = this.findMatches(currentGrid);
            
            if (matches.length === 0) {
                // No more matches, cascade sequence complete
                break;
            }
            
            // Calculate win for this step
            const stepWin = this.calculateWin(matches, request.betAmount);
            totalWin += stepWin;
            
            // Calculate cascade components
            const indicesToRemove = matches.flatMap(match => match.indices);
            const symbolsToDrop = this.calculateDrops(currentGrid, indicesToRemove);
            const { newSymbols, newSymbolIndices } = this.generateNewSymbols(currentGrid, indicesToRemove);
            
            debug.log(`Cascade step ${stepNumber}: Removing ${indicesToRemove.length} symbols, dropping ${symbolsToDrop.length} symbols, adding ${newSymbols.length} new symbols`);
            
            // Apply the cascade to current grid first
            const updatedGrid = this.applyCascade(currentGrid, {
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
            currentGrid = updatedGrid;
            stepNumber++;
            
            // Prevent infinite loops (safety)
            if (stepNumber > 10) {
                debug.warn('GameServer: Maximum cascade steps reached, breaking');
                break;
            }
        }
        
        return {
            spinId,
            initialGrid,
            cascadeSteps,
            totalWin,
            finalGrid: currentGrid
        };
    }

    private generateInitialGrid(): InitialGridData {
        const symbols: SymbolData[] = [];
        
        // Generate 15 symbols in a flat array (column-major order: col0row0, col0row1, col0row2, col1row0, ...)
        for (let i = 0; i < GameConfig.GRID_LAYOUT.columns * GameConfig.GRID_LAYOUT.visibleRows; i++) {
            // Generate random symbols for each spin
            const symbolId = this.getRandomSymbol();
            symbols.push({
                symbolId: symbolId
            });
        }
        
        debug.log(`Generated initial grid with ${symbols.length} symbols (expected: ${GameConfig.GRID_LAYOUT.columns * GameConfig.GRID_LAYOUT.visibleRows})`);
        debug.log('Symbol IDs:', symbols.map(s => s.symbolId));
        return { symbols };
    }

    private findMatches(grid: InitialGridData): MatchData[] {
        const matches: MatchData[] = [];
        const symbols = grid.symbols;
        
        // Check horizontal matches
        for (let row = 0; row < GameConfig.GRID_LAYOUT.visibleRows; row++) {
            let currentMatch: number[] = [];
            let currentSymbol = -1;
            
            for (let col = 0; col < GameConfig.GRID_LAYOUT.columns; col++) {
                const index = GridUtils.positionToIndex(col, row);
                const symbol = symbols[index];
                
                if (symbol && symbol.symbolId === currentSymbol && currentSymbol !== -1) {
                    currentMatch.push(index);
                } else {
                    if (currentMatch.length >= 3) {
                        matches.push({
                            indices: [...currentMatch],
                            matchType: 'horizontal'
                        });
                    }
                    currentMatch = symbol ? [index] : [];
                    currentSymbol = symbol ? symbol.symbolId : -1;
                }
            }
            
            // Check final match
            if (currentMatch.length >= 3) {
                matches.push({
                    indices: [...currentMatch],
                    matchType: 'horizontal'
                });
            }
        }
        
        // Check vertical matches
        for (let col = 0; col < GameConfig.GRID_LAYOUT.columns; col++) {
            let currentMatch: number[] = [];
            let currentSymbol = -1;
            
            for (let row = 0; row < GameConfig.GRID_LAYOUT.visibleRows; row++) {
                const index = GridUtils.positionToIndex(col, row);
                const symbol = symbols[index];
                
                if (symbol && symbol.symbolId === currentSymbol && currentSymbol !== -1) {
                    currentMatch.push(index);
                } else {
                    if (currentMatch.length >= 3) {
                        matches.push({
                            indices: [...currentMatch],
                            matchType: 'vertical'
                        });
                    }
                    currentMatch = symbol ? [index] : [];
                    currentSymbol = symbol ? symbol.symbolId : -1;
                }
            }
            
            // Check final match
            if (currentMatch.length >= 3) {
                matches.push({
                    indices: [...currentMatch],
                    matchType: 'vertical'
                });
            }
        }
        
        return matches;
    }

    private calculateDrops(grid: InitialGridData, indicesToRemove: number[]): DropData[] {
        const drops: DropData[] = [];
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
        
        return drops;
    }

    private generateNewSymbols(_grid: InitialGridData, indicesToRemove: number[]): { newSymbols: SymbolData[], newSymbolIndices: number[] } {
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
                    symbolId: this.getRandomSymbol()
                });
                newSymbolIndices.push(newIndex);
            }
        }
        
        debug.log(`Generated ${newSymbols.length} new symbols for ${indicesToRemove.length} removed symbols`);
        return { newSymbols, newSymbolIndices };
    }

    private applyCascade(grid: InitialGridData, cascadeStep: CascadeStepData): InitialGridData {
        // Start with a copy of the current grid
        const symbols = [...grid.symbols];
        
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
        
        return { symbols: finalSymbols };
    }

    private calculateWin(matches: MatchData[], betAmount: number): number {
        // Simple win calculation - in real game this would be more complex
        let totalWin = 0;
        matches.forEach(match => {
            const baseWin = match.indices.length * betAmount * 0.1;
            totalWin += baseWin;
        });
        return Math.round(totalWin * 100) / 100; // Round to 2 decimal places
    }

    private getRandomSymbol(): number {
        // Generate a random symbol ID from 0 to 10
        return Math.floor(Math.random() * this.totalSymbols);
    }

    private cloneGrid(grid: InitialGridData): InitialGridData {
        return {
            symbols: grid.symbols.map(symbol => ({ ...symbol }))
        };
    }
} 