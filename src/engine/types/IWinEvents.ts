// Big win configuration interface
export interface WinEventConfig {
  enabled: boolean; // Whether big win is enabled
  canSkip: boolean; // Whether the big win animation can be skipped
  duration: number; // Duration of the big win animation in seconds
}

export enum WinEventType {
  NICE = "Nice",
  SENSATIONAL = "Sensetional", // Note: 'Sensational' is misspelled as 'Sensetional' to match the original animation names
  MASSIVE = "Massive",
  INSANE = "Insane",
}

export const WinEventTypeValue: Record<WinEventType, number> = {
  [WinEventType.NICE]: 0,
  [WinEventType.SENSATIONAL]: 1,
  [WinEventType.MASSIVE]: 2,
  [WinEventType.INSANE]: 3,
};
