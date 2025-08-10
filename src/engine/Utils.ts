import { IReelMode } from "./reels/ReelController";
import { ISpinState } from "./types/GameTypes";

export class Utils {
    public static getReelModeBySpinState(spinState: ISpinState): IReelMode {
        switch (spinState) {
            case ISpinState.IDLE:
                return IReelMode.STATIC;
            case ISpinState.SPINNING:
                return IReelMode.SPINNING;
            case ISpinState.SPEEDING:
                return IReelMode.SPEEDING;
            case ISpinState.SLOWING:
                return IReelMode.SLOWING;
            case ISpinState.STOPPING:
                return IReelMode.STOPPING;
            case ISpinState.STARTING:
                return IReelMode.STARTING;
            case ISpinState.PAUSED:
                return IReelMode.PAUSED;
            case ISpinState.RESUMING:
                return IReelMode.RESUMING;
            case ISpinState.STOPPED:
                return IReelMode.STOPPED;
            case ISpinState.STARTED:
                return IReelMode.STARTED;
            case ISpinState.CASCADING:
                return IReelMode.CASCADING;
            default:
                return IReelMode.STATIC;
        }
    }
}