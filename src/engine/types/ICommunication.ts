export interface SpinData {
  symbolsToDrop: DropData[];
  incomingSymbols: DropData[];
}

// Helper functions for grid index calculations
export const GridUtils = {
  // Convert array index to column/row (assumes 5 columns, 3 rows)
  indexToPosition: (index: number): { column: number; row: number } => ({
    column: Math.floor(index / 5),
    row: index % 5,
  }),

  // Convert column/row to array index
  positionToIndex: (column: number, row: number): number => column * 5 + row,

  // Validate index is within grid bounds
  isValidIndex: (index: number): boolean => index >= 0 && index < 30,
};

export interface MatchData {
  indices: [number, number][];
  wilds: [number, number][];
  symbolId: number;
  line: number[];
  winAmount: number;
  fsWon: boolean;
  bonusWon: boolean;
}

// export enum ISpinState {
//   IDLE = "idle",
//   SPINNING = "spinning",
//   CASCADING = "cascading",
//   COMPLETED = "completed",
//   ERROR = "error",
//   SPEEDING = "speeding",
//   SLOWING = "slowing",
//   STOPPING = "stopping",
//   STARTING = "starting",
//   PAUSED = "paused",
//   RESUMING = "resuming",
//   STOPPED = "stopped",
//   STARTED = "started",
// }

export interface CascadeStepData {
  step: number; // Cascade step number (0 = initial, 1+ = subsequent cascades)
  matches: MatchData[]; // Matches found in this step
  indicesToRemove: number[]; // Array indices of symbols to remove
  symbolsToDrop: DropData[]; // How existing symbols should drop
  newSymbols: SymbolData[]; // New symbols to add at specific indices
  newSymbolIndices: number[]; // Indices where new symbols should be placed
  gridAfter: GridData; // Grid state after this cascade step is applied
}

export interface DropData {
  symbolId: number;
  fromIndex: number; // Source array index (0-14)
  toIndex: number; // Target array index (0-14)
}

export interface SpinResultData {
  spinId: string;
  totalWin: number;
  fsWon: boolean;
  bonusWon: boolean;
  extraFreeSpins?: number;
  steps: StepData[];
}

export interface StepData {
  gridBefore: GridData;
  gridAfter: GridData;
  wins: WinData[];
}

export interface WinData {
  match: MatchData;
  winAmount: number;
}

export interface InitialGridData {
  symbols: SymbolData[][];
}

export interface GridData {
  symbols: SymbolData[][];
}

export interface SymbolData {
  symbolId: number;
}

// Server request/response types
export interface SpinRequestData {
  betAmount: number;
  gameMode?: string;
  forcedFS?: boolean;
  forcedBonus?: boolean;
}

export interface SpinResponseData {
  success: boolean;
  error?: string;
  result?: SpinResultData;
}

// Game state types
// export interface GameState {
//   currentSpinId?: string;
//   currentStep: number; // Current cascade step
//   isProcessing: boolean; // Whether a spin/cascade is in progress
//   balance: number;
//   lastBet: number;
// }

// export interface LoaderDurations {
//   minDisplayTime: number; // Minimum display time for loader
//   transitionTo100: number; // Time to transition from 0% to 100%
//   holdAfter100: number; // Time to hold at 100%
//   fadeOut: number; // Time to fade out
// }

// // Orientation configuration interface
// export interface OrientationConfig {
//   landscape: string; // Landscape orientation
//   portrait: string; // Portrait orientation
// }

// // Win configuration interface
// export interface WinConfig {
//   multiplier: number; // Win multiplier
//   amount: number; // Win amount
//   line: number; // Line number
//   symbolIds: number[]; // Array of symbol IDs
// }

// // Win animation configuration interface
// export interface WinAnimationConfig {
//   enabled: boolean; // Whether win animation is enabled
//   winTextVisibility?: boolean; // Whether to show win text
//   winLoop?: boolean; // Whether to loop win animation
//   delayBeforeLoop?: number; // Delay before starting loop
//   delayBetweenLoops?: number; // Delay between loops
//   winlineVisibility?: boolean; // Whether to show win lines
// }

// // Auto play configuration interface
// export interface AutoPlayConfig {
//   enabled: boolean; // Whether auto play is enabled
//   count: number; // Number of auto plays to perform
//   delay: number; // Delay between auto play spins
//   stopOnWin: boolean; // Whether to stop auto play on win
//   stopOnFeature: boolean; // Whether to stop auto play on feature trigger
//   skipAnimations: boolean; // Whether to skip animations during auto play
// }

// // Force stop configuration interface
// export interface ForceStopConfig {
//   enabled: boolean; // Whether force stop is enabled
// }

// // Big win configuration interface
// export interface WinEventConfig {
//   enabled: boolean; // Whether big win is enabled
//   canSkip: boolean; // Whether the big win animation can be skipped
//   duration: number; // Duration of the big win animation in seconds
// }

// export enum WinEventType {
//   NICE = "Nice",
//   SENSATIONAL = "Sensetional", // Note: 'Sensational' is misspelled as 'Sensetional' to match the original animation names
//   MASSIVE = "Massive",
//   INSANE = "Insane",
// }

// export const WinEventTypeValue: Record<WinEventType, number> = {
//   [WinEventType.NICE]: 0,
//   [WinEventType.SENSATIONAL]: 1,
//   [WinEventType.MASSIVE]: 2,
//   [WinEventType.INSANE]: 3,
// };