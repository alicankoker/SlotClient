// Force stop configuration interface
export interface ForceStopConfig {
  enabled: boolean; // Whether force stop is enabled
}

export type SpinMode = "normal" | "fast" | "turbo";

export enum ISpinState {
  IDLE = "idle",
  SPINNING = "spinning",
  CASCADING = "cascading",
  COMPLETED = "completed",
  ERROR = "error",
  SPEEDING = "speeding",
  SLOWING = "slowing",
  STOPPING = "stopping",
  STARTING = "starting",
  PAUSED = "paused",
  RESUMING = "resuming",
  STOPPED = "stopped",
  STARTED = "started",
}
