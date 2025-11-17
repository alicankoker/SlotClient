// Big win configuration interface
export interface WinEventConfig {
  enabled: boolean; // Whether big win is enabled
  canSkip: boolean; // Whether the big win animation can be skipped
  duration: number; // Duration of the big win animation in seconds
}

export type BackendWinEventType = 'normal' | 'big' | 'super' | 'mega' | 'epic';

export enum WinEventType {
  BIG = "Big",
  SUPER = "Super",
  MEGA = "Mega",
  EPIC = "Epic",
}

export const BackendToWinEventType: Record<BackendWinEventType, WinEventType | null> = {
  normal: null,
  big: WinEventType.BIG,
  super: WinEventType.SUPER,
  mega: WinEventType.MEGA,
  epic: WinEventType.EPIC,
};