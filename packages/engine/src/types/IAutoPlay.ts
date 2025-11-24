// Auto play configuration interface
export interface AutoPlayConfig {
  enabled: boolean; // Whether auto play is enabled
  count: number; // Number of auto plays to perform
  delay: number; // Delay between auto play spins
  stopOnWin: boolean; // Whether to stop auto play on win
  stopOnFeature: boolean; // Whether to stop auto play on feature trigger
  skipAnimations: boolean; // Whether to skip animations during auto play
}
