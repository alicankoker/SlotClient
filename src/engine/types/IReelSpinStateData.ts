export enum IReelSpinState {
    IDLE = 'idle',
    SPINNING = 'spinning',
    STOPPING = 'stopping',
    STOPPED = 'stopped',
    SPEEDING = 'speeding',
    SLOWING = 'slowing',
    ANTICIPATING = 'anticipating',
}

export type IReelSpinStateData = {
    state: IReelSpinState;
    speed: number;
    symbols: number[];
    readyForStopping: boolean;
    readyForSlowingDown: boolean;
    isSpinning: boolean;
    stopProgressStarted: boolean;
    currentStopSymbolId: number;
    stopSymbols: number[];
    anticipated: boolean;
    isAnticipating: boolean;
    callbackFunction?: () => void;
}