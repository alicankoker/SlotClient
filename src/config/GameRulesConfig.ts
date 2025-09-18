import { Point } from "pixi.js";
import { GameConfig } from "./GameConfig";

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

export class GameRulesConfig {
    // Grid layout configuration
    public static readonly GRID: GridConfig = {
        reelCount: 6,               // 5x3 grid
        rowCount: 5,                // 3 visible rows per reel
        totalSymbols: 13,           // Symbol IDs 0-12
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

    // Reference symbol dimensions at base resolution
    private static sh = GameConfig.REFERENCE_SYMBOL.height;
    private static sw = GameConfig.REFERENCE_SYMBOL.width + GameConfig.REFERENCE_SPACING.horizontal;

    // Winning line symbol coordinates
    public static readonly COORDINATES: { [key: number]: { x: number, y: number } } = {
        1: { x: -this.sw * 2, y: -this.sh },        2: { x: -this.sw, y: -this.sh },        3: { x: 0, y: -this.sh },       4: { x: this.sw, y: -this.sh },         5: { x: this.sw * 2, y: -this.sh },

        6: { x: -this.sw * 2, y: 0 },               7: { x: -this.sw, y: 0 },               8: { x: 0, y: 0 },              9: { x: this.sw, y: 0 },                10: { x: this.sw * 2, y: 0 },

        11: { x: -this.sw * 2, y: this.sh },        12: { x: -this.sw, y: this.sh },        13: { x: 0, y: this.sh },       14: { x: this.sw, y: this.sh },         15: { x: this.sw * 2, y: this.sh }
    };

    // Winning lines configuration for producing random win lines. it will be removed
    public static readonly WINNING_LINES: { [key: number]: number[] } = {
        1: [0, 0, 0, 0, 0],
        2: [1, 1, 1, 1, 1],
        3: [2, 2, 2, 2, 2],

        4: [2, 1, 0, 1, 2],
        5: [0, 1, 2, 1, 0],

        6: [1, 0, 0, 0, 1],
        7: [1, 2, 2, 2, 1],

        8: [0, 0, 1, 2, 2],
        9: [2, 2, 1, 0, 0],

        10: [1, 0, 1, 2, 1],
        11: [1, 2, 1, 0, 1],

        12: [0, 1, 1, 1, 0],
        13: [2, 1, 1, 1, 2],

        14: [0, 1, 0, 1, 0],
        15: [2, 1, 2, 1, 2],

        16: [1, 1, 0, 1, 1],
        17: [1, 1, 2, 1, 1],

        18: [0, 0, 2, 0, 0],
        19: [2, 2, 0, 2, 2],

        20: [2, 0, 0, 0, 2],
        21: [0, 2, 2, 2, 0],

        22: [1, 0, 2, 0, 1],
        23: [1, 2, 0, 2, 1],

        24: [0, 2, 0, 2, 0],
        25: [2, 0, 2, 0, 2]
    };

    // winning lines configuration
    public static readonly LINES: { [key: number]: number[] } = {
        1: [1, 5],
        2: [6, 10],
        3: [11, 15],

        4: [11, 3, 15],
        5: [1, 13, 5],

        6: [6, 2, 4, 10],
        7: [6, 12, 14, 10],

        8: [1, 2, 14, 15],
        9: [11, 12, 4, 5],

        10: [6, 2, 14, 10],
        11: [6, 12, 4, 10],

        12: [1, 7, 9, 5],
        13: [11, 7, 9, 15],

        14: [1, 7, 3, 9, 5],
        15: [11, 7, 13, 9, 15],

        16: [6, 7, 3, 9, 10],
        17: [6, 7, 13, 9, 10],

        18: [1, 2, 13, 4, 5],
        19: [11, 12, 3, 14, 15],

        20: [11, 2, 4, 15],
        21: [1, 12, 14, 5],

        22: [6, 2, 13, 4, 10],
        23: [6, 12, 3, 14, 10],

        24: [1, 12, 3, 14, 5],
        25: [11, 2, 13, 4, 15]
    };

    /**
     * Get the coordinates of a winning line.
     * @param line The line number.
     * @returns An array of points representing the line.
     */
    public static getLine(line: number): Point[] {
        const elements = GameRulesConfig.LINES[line];
        const points: Point[] = [];

        if (elements) {
            for (let index = 0; index < elements.length; index++) {
                const element = elements[index];
                const point = GameRulesConfig.COORDINATES[element];

                if (point) {
                    points.push(new Point(point.x, point.y));
                }
            }
        }

        return points;
    }

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