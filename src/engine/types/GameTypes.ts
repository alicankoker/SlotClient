// Game data types for server-client communication

export interface SymbolData {
    symbolId: number;           // Symbol index (0-9)
}

export interface InitialGridData {
    symbols: SymbolData[];      // Flat array of 15 symbols [0-14], where index = column * 3 + row
}

// Helper functions for grid index calculations
export const GridUtils = {
    // Convert array index to column/row (assumes 5 columns, 3 rows)
    indexToPosition: (index: number): { column: number, row: number } => ({
        column: Math.floor(index / 3),
        row: index % 3
    }),

    // Convert column/row to array index
    positionToIndex: (column: number, row: number): number => column * 3 + row,

    // Validate index is within grid bounds
    isValidIndex: (index: number): boolean => index >= 0 && index < 15
};

export interface MatchData {
    indices: number[];          // Array indices of symbols that matched
    matchType: 'horizontal' | 'vertical' | 'cluster';
    winAmount?: number;         // Optional win amount
}

export enum ISpinState {
    IDLE = 'idle',
    SPINNING = 'spinning',
    CASCADING = 'cascading',
    COMPLETED = 'completed',
    ERROR = 'error',
    SPEEDING = 'speeding',
    SLOWING = 'slowing',
    STOPPING = 'stopping',
    STARTING = 'starting',
    PAUSED = 'paused',
    RESUMING = 'resuming',
    STOPPED = 'stopped',
    STARTED = 'started',
}

export interface CascadeStepData {
    step: number;               // Cascade step number (0 = initial, 1+ = subsequent cascades)
    matches: MatchData[];       // Matches found in this step
    indicesToRemove: number[];  // Array indices of symbols to remove
    symbolsToDrop: DropData[];  // How existing symbols should drop
    newSymbols: SymbolData[];   // New symbols to add at specific indices
    newSymbolIndices: number[]; // Indices where new symbols should be placed
    gridAfter: InitialGridData; // Grid state after this cascade step is applied
}

export interface DropData {
    symbolId: number;
    fromIndex: number;          // Source array index (0-14)
    toIndex: number;            // Target array index (0-14)
}

export interface SpinResultData {
    spinId: string;             // Unique spin identifier
    initialGrid: InitialGridData;
    cascadeSteps: CascadeStepData[];
    totalWin: number;
    finalGrid: InitialGridData; // Final state after all cascades
}

// Server request/response types
export interface SpinRequestData {
    betAmount: number;
    gameMode?: string;
}

export interface SpinResponseData {
    success: boolean;
    error?: string;
    result?: SpinResultData;
}

// Game state types
export interface GameState {
    currentSpinId?: string;
    currentStep: number;        // Current cascade step
    isProcessing: boolean;      // Whether a spin/cascade is in progress
    balance: number;
    lastBet: number;
}

export interface LoaderDurations {
    minDisplayTime: number; // Minimum display time for loader
    transitionTo100: number; // Time to transition from 0% to 100%
    holdAfter100: number; // Time to hold at 100%
    fadeOut: number; // Time to fade out
}

// Spine data interface
export interface SpineData {
    atlasData: any; // Atlas file data
    skeletonData: any; // Skeleton file data
}

// Spine asset data interface
export interface SpineAssetData {
    atlas: string; // Atlas file path
    skeleton: string; // Skeleton file path
}

export type SpineAsset = "symbol" | "background" | "elements" | "wins";

// Orientation configuration interface
export interface OrientationConfig {
    landscape: string; // Landscape orientation
    portrait: string; // Portrait orientation
}

// Win configuration interface
export interface WinConfig {
    multiplier: number; // Win multiplier
    amount: number; // Win amount
    line: number; // Line number
    symbolIds: number[]; // Array of symbol IDs
}

// Win animation configuration interface
export interface WinAnimationConfig {
    enabled: boolean; // Whether win animation is enabled
    winTextVisibility?: boolean; // Whether to show win text
    winLoop?: boolean; // Whether to loop win animation
    delayBeforeLoop?: number; // Delay before starting loop
    delayBetweenLoops?: number; // Delay between loops
    winlineVisibility?: boolean; // Whether to show win lines
}

// Auto play configuration interface
export interface AutoPlayConfig {
    enabled: boolean; // Whether auto play is enabled
    count: number; // Number of auto plays to perform
    delay: number; // Delay between auto play spins
    stopOnWin: boolean; // Whether to stop auto play on win
    stopOnFeature: boolean; // Whether to stop auto play on feature trigger
    skipAnimations: boolean; // Whether to skip animations during auto play
}

// Force stop configuration interface
export interface ForceStopConfig {
    enabled: boolean; // Whether force stop is enabled
}

// Big win configuration interface
export interface BigWinConfig {
    enabled: boolean; // Whether big win is enabled
    canSkip: boolean; // Whether the big win animation can be skipped
    duration: number; // Duration of the big win animation in seconds
}

export enum BigWinType {
    NICE = 'Nice',
    SENSATIONAL = 'Sensetional', // Note: 'Sensational' is misspelled as 'Sensetional' to match the original animation names
    MASSIVE = 'Massive',
    INSANE = 'Insane'
}

export const BigWinTypeValue: Record<BigWinType, number> = {
    [BigWinType.NICE]: 0,
    [BigWinType.SENSATIONAL]: 1,
    [BigWinType.MASSIVE]: 2,
    [BigWinType.INSANE]: 3,
};

export type SpinMode = "normal" | "fast";