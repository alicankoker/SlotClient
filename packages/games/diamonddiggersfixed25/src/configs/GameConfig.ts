import { BaseGameConfig, CascadeConfig } from '@slotclient/config/GameConfig';
import {
    ResolutionConfig,
    SymbolConfig,
    SpacingConfig,
    GameRulesConfig,
    GridLayoutConfig,
    SafeAreaConfig,
    BackendConfig,
    GridConfig,
    SpinConfig,
    IPaytableEntry,
    WinningLinesConfig,
    CoordinatesConfig
} from '@slotclient/config/GameConfig';
import { SpinContainerConfig } from '@slotclient/types';

export const spinContainerConfig: SpinContainerConfig = {
    reelIndex: 0, // Single container manages all reels, but still needs this for compatibility
    numberOfReels: 5, // Will handle all reels (6 columns)
    symbolHeight: 150,
    symbolsVisible: 3,
    rowsAboveMask: 1,
    rowsBelowMask: 1,
    spinSpeed: 10,
    spinDuration: 2000
};

export class GameConfig extends BaseGameConfig {
    private static _instance: GameConfig;

    public static getInstance(): GameConfig {
        if (!this._instance) {
            this._instance = new GameConfig();
        }
        return this._instance;
    }

    public readonly REFERENCE_SPRITE_SYMBOL: SymbolConfig = {
        width: 150,
        height: 150,
        scale: 1
    };

    public readonly REFERENCE_SPINE_SYMBOL: SymbolConfig = {
        width: 150,
        height: 150,
        scale: 1
    };

    // Reference spacing at base resolution
    public readonly REFERENCE_SPACING: SpacingConfig = {
        horizontal: 90,  // 10 pixels horizontal spacing at reference resolution
        vertical: 90      // 10 pixels vertical spacing at reference resolution
    };

    // Game mechanics
    public readonly GAME_RULES: GameRulesConfig = {
        reelCount: 5,
        rowCount: 3,
        minBet: 1,
        maxBet: 100,
        defaultBet: 10,
        initialBalance: 1000
    };

    // Grid layout configuration
    public readonly GRID_LAYOUT: GridLayoutConfig = {
        columns: 5,                    // Number of columns
        visibleRows: 3,                // Number of visible rows (inside mask)
        rowsAboveMask: 1,              // Number of rows above visible area
        rowsBelowMask: 1,              // Number of rows below visible area
        totalRows: function () {
            return this.visibleRows + this.rowsAboveMask + this.rowsBelowMask;
        }
    };

    // Reference resolution - all sizes are designed for this resolution
    public readonly REFERENCE_RESOLUTION: ResolutionConfig = {
        width: 1920,
        height: 1080
    };

    public readonly SAFE_AREA: SafeAreaConfig = {
        landscape: {
            width: 1920, //this.REFERENCE_SYMBOL.width * (this.GAME_RULES.reelCount + 1), // set based on reel count
            height: 1100 //this.REFERENCE_SYMBOL.height * (this.GAME_RULES.rowCount + 1) // set based on row count
        },
        portrait: {
            width: (this.REFERENCE_SPRITE_SYMBOL.width + this.REFERENCE_SPACING.horizontal) * (this.GAME_RULES.reelCount + 0.65), // set based on reel count
            height: 1920 // based on REFERENCE_RESOLUTION portrait heights
        }
    };

    public readonly BACKEND: BackendConfig = {
        BACKEND_URL: import.meta.env.VITE_BACKEND_URL || "https://rngengine.com",
        USER_ID: import.meta.env.DEV ? "6932e3804109a393a0fa2f3b" : new URLSearchParams(window.location.search).get("session") || undefined,
    };

    public readonly GRID: GridConfig = {
        reelCount: 5,               // 5x3 grid
        rowCount: 3,                // 3 visible rows per reel
        totalSymbols: 10,           // Symbol IDs 0-9
        bufferRows: {
            above: 2,               // 2 buffer rows above for smooth scrolling
            below: 2                // 2 buffer rows below for smooth scrolling
        }
    };

    // Spin and betting configuration
    public readonly SPIN: SpinConfig = {
        maxAutoPlaySpins: 100,      // Maximum 100 auto-play spins
        minBetAmount: 0.01,         // Minimum $0.01 bet
        maxBetAmount: 100.00,       // Maximum $100 bet
        defaultBetAmount: 1.00      // Default $1 bet
    };

    // Cascade mechanics configuration
    public readonly CASCADE: CascadeConfig = {
        maxCascadeSteps: 10,        // Maximum 10 cascade steps per spin
        dropAnimationSteps: 5,      // 5 steps for drop animations
        removeAnimationSteps: 3     // 3 steps for removal animations
    };

    // Reference symbol dimensions at base resolution
    private sh = this.REFERENCE_SPRITE_SYMBOL.height + this.REFERENCE_SPACING.vertical;
    private sw = this.REFERENCE_SPRITE_SYMBOL.width + this.REFERENCE_SPACING.horizontal;

    // Winning line symbol coordinates
    public readonly COORDINATES: CoordinatesConfig = {
        1: { x: -this.sw * 2, y: -this.sh }, 2: { x: -this.sw, y: -this.sh }, 3: { x: 0, y: -this.sh }, 4: { x: this.sw, y: -this.sh }, 5: { x: this.sw * 2, y: -this.sh },

        6: { x: -this.sw * 2, y: 0 }, 7: { x: -this.sw, y: 0 }, 8: { x: 0, y: 0 }, 9: { x: this.sw, y: 0 }, 10: { x: this.sw * 2, y: 0 },

        11: { x: -this.sw * 2, y: this.sh }, 12: { x: -this.sw, y: this.sh }, 13: { x: 0, y: this.sh }, 14: { x: this.sw, y: this.sh }, 15: { x: this.sw * 2, y: this.sh }
    };

    // Winning lines configuration for producing random win lines. it will be removed
    public readonly WINNING_LINES: WinningLinesConfig = {
        1: [1, 1, 1, 1, 1],
        2: [0, 0, 0, 0, 0],
        3: [2, 2, 2, 2, 2],

        4: [0, 1, 2, 1, 0],
        5: [2, 1, 0, 1, 2],

        6: [1, 0, 0, 0, 1],
        7: [1, 2, 2, 2, 1],

        8: [0, 0, 1, 2, 2],
        9: [2, 2, 1, 0, 0],

        10: [1, 2, 1, 0, 1],
        11: [1, 0, 1, 2, 1],

        12: [0, 1, 1, 1, 0],
        13: [2, 1, 1, 1, 2],

        14: [0, 1, 0, 1, 0],
        15: [2, 1, 2, 1, 2],

        16: [1, 1, 0, 1, 1],
        17: [1, 1, 2, 1, 1],

        18: [0, 0, 2, 0, 0],
        19: [2, 2, 0, 2, 2],

        20: [0, 2, 2, 2, 0],
        21: [2, 0, 0, 0, 2],

        22: [1, 2, 0, 2, 1],
        23: [1, 0, 2, 0, 1],

        24: [0, 2, 0, 2, 0],
        25: [2, 0, 2, 0, 2]
    };

    public readonly PAYTABLE: IPaytableEntry[] =
        [
            { symbolId: 0, winAmounts: [15, 75, 300,] },
            { symbolId: 1, winAmounts: [15, 100, 300] },
            { symbolId: 2, winAmounts: [20, 150, 400] },
            { symbolId: 3, winAmounts: [40, 200, 1000] },
            { symbolId: 4, winAmounts: [5, 20, 100] },
            { symbolId: 5, winAmounts: [5, 20, 150] },
            { symbolId: 6, winAmounts: [10, 25, 200] },
            { symbolId: 7, winAmounts: [10, 50, 250] },
            { symbolId: 8, winAmounts: [100, 1000, 10000] },
            { symbolId: 9, winAmounts: [0, 0, 0] },
            { symbolId: 10, winAmounts: [0, 0, 0] },
        ];

    // winning lines configuration
    public readonly LINES: WinningLinesConfig = {
        1: [6, 10],
        2: [1, 5],
        3: [11, 15],

        4: [1, 13, 5],
        5: [11, 3, 15],

        6: [6, 2, 4, 10],
        7: [6, 12, 14, 10],

        8: [1, 2, 14, 15],
        9: [11, 12, 4, 5],

        10: [6, 12, 4, 10],
        11: [6, 2, 14, 10],

        12: [1, 7, 9, 5],
        13: [11, 7, 9, 15],

        14: [1, 7, 3, 9, 5],
        15: [11, 7, 13, 9, 15],

        16: [6, 7, 3, 9, 10],
        17: [6, 7, 13, 9, 10],

        18: [1, 2, 13, 4, 5],
        19: [11, 12, 3, 14, 15],

        20: [1, 12, 14, 5],
        21: [11, 2, 4, 15],

        22: [6, 2, 13, 4, 10],
        23: [6, 12, 3, 14, 10],

        24: [1, 12, 3, 14, 5],
        25: [11, 2, 13, 4, 15]
    };

    public readonly REFERENCE_NUMBER_POSITION = { x: -this.sw * 2.675, y: -(this.sh + this.sh / 2.5) };

    public readonly LINE_NUMBER_POSITION: CoordinatesConfig = {
        //left side
        4: { x: -this.sw * 2.675, y: this.REFERENCE_NUMBER_POSITION.y },
        2: { x: -this.sw * 2.675, y: this.REFERENCE_NUMBER_POSITION.y + 59 },
        24: { x: -this.sw * 2.675, y: this.REFERENCE_NUMBER_POSITION.y + 118 },
        20: { x: -this.sw * 2.675, y: this.REFERENCE_NUMBER_POSITION.y + 177 },
        16: { x: -this.sw * 2.675, y: this.REFERENCE_NUMBER_POSITION.y + 236 },
        10: { x: -this.sw * 2.675, y: this.REFERENCE_NUMBER_POSITION.y + 295 },
        1: { x: -this.sw * 2.675, y: this.REFERENCE_NUMBER_POSITION.y + 354 },
        11: { x: -this.sw * 2.675, y: this.REFERENCE_NUMBER_POSITION.y + 413 },
        17: { x: -this.sw * 2.675, y: this.REFERENCE_NUMBER_POSITION.y + 472 },
        13: { x: -this.sw * 2.675, y: this.REFERENCE_NUMBER_POSITION.y + 531 },
        21: { x: -this.sw * 2.675, y: this.REFERENCE_NUMBER_POSITION.y + 590 },
        3: { x: -this.sw * 2.675, y: this.REFERENCE_NUMBER_POSITION.y + 649 },
        5: { x: -this.sw * 2.675, y: this.REFERENCE_NUMBER_POSITION.y + 708 },
        //right side
        14: { x: this.sw * 2.675, y: this.REFERENCE_NUMBER_POSITION.y },
        18: { x: this.sw * 2.675, y: this.REFERENCE_NUMBER_POSITION.y + 59 },
        12: { x: this.sw * 2.675, y: this.REFERENCE_NUMBER_POSITION.y + 118 },
        9: { x: this.sw * 2.675, y: this.REFERENCE_NUMBER_POSITION.y + 177 },
        22: { x: this.sw * 2.675, y: this.REFERENCE_NUMBER_POSITION.y + 236 },
        6: { x: this.sw * 2.675, y: this.REFERENCE_NUMBER_POSITION.y + 295 },
        7: { x: this.sw * 2.675, y: this.REFERENCE_NUMBER_POSITION.y + 354 },
        23: { x: this.sw * 2.675, y: this.REFERENCE_NUMBER_POSITION.y + 413 },
        8: { x: this.sw * 2.675, y: this.REFERENCE_NUMBER_POSITION.y + 472 },
        19: { x: this.sw * 2.675, y: this.REFERENCE_NUMBER_POSITION.y + 531 },
        15: { x: this.sw * 2.675, y: this.REFERENCE_NUMBER_POSITION.y + 590 },
        25: { x: this.sw * 2.675, y: this.REFERENCE_NUMBER_POSITION.y + 649 }
    };
}