// Big win configuration interface
export interface BigWinConfig {
  enabled: boolean; // Whether big win is enabled
  canSkip: boolean; // Whether the big win animation can be skipped
  duration: number; // Duration of the big win animation in seconds
}

export enum BigWinType {
  NICE = "Nice",
  SENSATIONAL = "Sensetional", // Note: 'Sensational' is misspelled as 'Sensetional' to match the original animation names
  MASSIVE = "Massive",
  INSANE = "Insane",
}

export const BigWinTypeValue: Record<BigWinType, number> = {
  [BigWinType.NICE]: 0,
  [BigWinType.SENSATIONAL]: 1,
  [BigWinType.MASSIVE]: 2,
  [BigWinType.INSANE]: 3,
};
