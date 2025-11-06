// Win configuration interface
export interface WinConfig {
  multiplier: number; // Win multiplier
  amount: number; // Win amount
  line: number; // Line number
  symbolIds: number[] | number[][]; // Array of symbol IDs
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
