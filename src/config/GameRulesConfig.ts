export interface GridConfig {
    reelCount: number;              // Number of reels (columns)
    rowCount: number;               // Number of visible rows per reel
    totalSymbols: number;           // Total number of symbol types
    bufferRows: {
        above: number;              // Buffer rows above visible area
        below: number;              // Buffer rows below visible area
    };
}

export interface SpinConfig {
    maxAutoPlaySpins: number;       // Maximum auto-play spins allowed
    minBetAmount: number;           // Minimum bet amount
    maxBetAmount: number;           // Maximum bet amount
    defaultBetAmount: number;       // Default bet amount
}

export interface CascadeConfig {
    maxCascadeSteps: number;        // Maximum cascade steps per spin
    dropAnimationSteps: number;     // Number of animation steps for drops
    removeAnimationSteps: number;   // Number of animation steps for removals
}

export interface WinConfig {
    minWinningSymbols: number;      // Minimum symbols needed for a win
    multiplierThreshold: number;    // Threshold for applying multipliers
    jackpotThreshold: number;       // Threshold for jackpot wins
}

export class GameRulesConfig {
    // Grid layout configuration
    public static readonly GRID: GridConfig = {
        reelCount: 5,               // 5x3 grid
        rowCount: 3,                // 3 visible rows per reel
        totalSymbols: 11,           // Symbol IDs 0-10
        bufferRows: {
            above: 2,               // 2 buffer rows above for smooth scrolling
            below: 2                // 2 buffer rows below for smooth scrolling
        }
    };

    // Spin and betting configuration
    public static readonly SPIN: SpinConfig = {
        maxAutoPlaySpins: 100,      // Maximum 100 auto-play spins
        minBetAmount: 0.01,         // Minimum $0.01 bet
        maxBetAmount: 100.00,       // Maximum $100 bet
        defaultBetAmount: 1.00      // Default $1 bet
    };

    // Cascade mechanics configuration
    public static readonly CASCADE: CascadeConfig = {
        maxCascadeSteps: 10,        // Maximum 10 cascade steps per spin
        dropAnimationSteps: 5,      // 5 steps for drop animations
        removeAnimationSteps: 3     // 3 steps for removal animations
    };

    // Win calculation configuration
    public static readonly WIN: WinConfig = {
        minWinningSymbols: 3,       // Need at least 3 matching symbols
        multiplierThreshold: 5,     // 5+ symbols for multiplier bonus
        jackpotThreshold: 1000      // $1000+ for jackpot celebration
    };

    // Calculated values
    public static getTotalGridSize(): number {
        return this.GRID.reelCount * this.GRID.rowCount;
    }

    public static getTotalBufferRows(): number {
        return this.GRID.bufferRows.above + this.GRID.bufferRows.below;
    }

    public static getTotalRowsPerReel(): number {
        return this.GRID.rowCount + this.getTotalBufferRows();
    }

    public static getGridCenterRow(): number {
        return Math.floor(this.GRID.rowCount / 2);
    }

    public static isValidSymbolId(symbolId: number): boolean {
        return symbolId >= 0 && symbolId < this.GRID.totalSymbols;
    }

    public static isValidReelIndex(reelIndex: number): boolean {
        return reelIndex >= 0 && reelIndex < this.GRID.reelCount;
    }

    public static isValidRowIndex(rowIndex: number): boolean {
        return rowIndex >= 0 && rowIndex < this.GRID.rowCount;
    }
} 