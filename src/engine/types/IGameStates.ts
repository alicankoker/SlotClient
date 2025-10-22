// Game state types
export interface GameState {
  currentSpinId?: string;
  currentStep: number; // Current cascade step
  isProcessing: boolean; // Whether a spin/cascade is in progress
  balance: number;
  lastBet: number;
}

// Orientation configuration interface
export interface OrientationConfig {
  landscape: string; // Landscape orientation
  portrait: string; // Portrait orientation
}
