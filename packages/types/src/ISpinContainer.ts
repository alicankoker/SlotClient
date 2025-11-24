// SpinContainer configuration interface
// This is shared between engine and config packages
export interface SpinContainerConfig {
  reelIndex: number; // TODO: Remove when refactoring to single container
  symbolHeight: number;
  symbolsVisible: number;
  numberOfReels?: number; // TODO: Use this for single container approach
  rowsAboveMask?: number;
  rowsBelowMask?: number;
  spinSpeed?: number;
  spinDuration?: number;
}

