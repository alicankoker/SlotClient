import { FillGradient, TextStyle } from "pixi.js";
import { SpinContainerConfig } from "../engine/Spin/SpinContainer";
import { LoaderDurations } from "../engine/types/IAssetLoader";
import { AutoPlayConfig } from "../engine/types/IAutoPlay";
import { OrientationConfig } from "../engine/types/IGameStates";
import { ForceStopConfig } from "../engine/types/ISpinConfig";
import { WinEventConfig } from "../engine/types/IWinEvents";
import { WinAnimationConfig } from "../engine/types/IWinPresentation";
import { IFreeSpin } from "../engine/types/IFreeSpin";

export interface ResolutionConfig {
    width: number;
    height: number;
}

export interface SymbolConfig {
    width: number;
    height: number;
    scale: number;
}

export interface UIConfig {
    fontSize: {
        title: number;
        normal: number;
        small: number;
    };
    spacing: {
        padding: number;
        margin: number;
    };
}
export const spinContainerConfig: SpinContainerConfig = {
    reelIndex: 0, // Single container manages all reels, but still needs this for compatibility
    numberOfReels: 5, // Will handle all reels (6 columns)
    symbolHeight: 150,
    symbolsVisible: 3,
    rowsAboveMask: 1,
    rowsBelowMask: 1,
    spinSpeed: 10,
    spinDuration: 2000
};

export class GameConfig {
    // Reference symbol size at base resolution
    public static readonly REFERENCE_SYMBOL: SymbolConfig = {
        width: 150,
        height: 150,
        scale: 0.90
    };

    // Reference spacing at base resolution
    public static readonly REFERENCE_SPACING = {
        horizontal: 90,  // 10 pixels horizontal spacing at reference resolution
        vertical: 90      // 10 pixels vertical spacing at reference resolution
    };

    // Reference UI sizes at base resolution
    public static readonly REFERENCE_UI: UIConfig = {
        fontSize: {
            title: 48,
            normal: 24,
            small: 18
        },
        spacing: {
            padding: 20,
            margin: 10
        }
    };

    // Game mechanics
    public static readonly GAME_RULES = {
        reelCount: 5,
        rowCount: 3,
        minBet: 1,
        maxBet: 100,
        defaultBet: 10,
        initialBalance: 1000
    };

    // Grid layout configuration
    public static readonly GRID_LAYOUT = {
        columns: 5,                    // Number of columns
        visibleRows: 3,                // Number of visible rows (inside mask)
        rowsAboveMask: 1,              // Number of rows above visible area
        rowsBelowMask: 1,              // Number of rows below visible area
        totalRows: function () {
            return this.visibleRows + this.rowsAboveMask + this.rowsBelowMask;
        }
    };

    // Loader configuration
    public static readonly LOADER_DEFAULT_TIMINGS: LoaderDurations = {
        minDisplayTime: 1000, // minimum time to show loader (ms)
        transitionTo100: 600, // time to transition to 100% (ms)
        holdAfter100: 150, // time to hold at 100% before fade out (ms)
        fadeOut: 50 // fade out duration (ms)
    };

    public static readonly FREE_SPIN: IFreeSpin = {
        isActive: true,
        skipAnimations: false,
        remainingSpins: 10
    }

    // Win animation configuration
    public static readonly WIN_ANIMATION: WinAnimationConfig = {
        enabled: true,
        winTextVisibility: true,
        winLoop: true,
        delayBeforeLoop: 2000,
        delayBetweenLoops: 1000,
        winlineVisibility: true
    };

    // Auto play configuration
    public static readonly AUTO_PLAY: AutoPlayConfig = {
        enabled: true,
        count: 5,
        delay: 1000,
        stopOnWin: false,
        stopOnFeature: false,
        skipAnimations: false
    };

    public static readonly FORCE_STOP: ForceStopConfig = {
        enabled: true
    }

    public static readonly WIN_EVENT: WinEventConfig = {
        enabled: false,
        duration: 3,
        canSkip: true
    };

    public static readonly SPIN_MODES = {
        NORMAL: 'normal',
        FAST: 'fast'
    };

    // Reference resolution - all sizes are designed for this resolution
    public static readonly REFERENCE_RESOLUTION: ResolutionConfig = {
        width: 1920,
        height: 1080
    };

    public static readonly ORIENTATION: OrientationConfig = {
        landscape: "landscape",
        portrait: "portrait"
    };

    public static readonly SAFE_AREA = {
        landscape: {
            width: 1920, //this.REFERENCE_SYMBOL.width * (this.GAME_RULES.reelCount + 1), // set based on reel count
            height: 1100 //this.REFERENCE_SYMBOL.height * (this.GAME_RULES.rowCount + 1) // set based on row count
        },
        portrait: {
            width: (this.REFERENCE_SYMBOL.width + this.REFERENCE_SPACING.horizontal) * (this.GAME_RULES.reelCount + 0.65), // set based on reel count
            height: 1920 // based on REFERENCE_RESOLUTION portrait heights
        }
    };

    // Get resolution category for debugging/optimization
    public static getResolutionCategory(width: number, height: number): string {
        const pixels = width * height;

        if (pixels >= 3840 * 2160) return '4K+';
        if (pixels >= 2560 * 1440) return '1440p';
        if (pixels >= 1920 * 1080) return '1080p';
        if (pixels >= 1280 * 720) return '720p';
        return 'Mobile/Small';
    }

    // Validate and clamp values
    public static clampBet(bet: number): number {
        return Math.max(this.GAME_RULES.minBet, Math.min(this.GAME_RULES.maxBet, bet));
    }

    public static clampBalance(balance: number): number {
        return Math.max(0, balance);
    }

    // Fill gradient stops for UI elements
    public static readonly fillGradientStops: FillGradient = new FillGradient({
        colorStops: [
            {
                offset: 0.4,
                color: 0xffeb8b
            },
            {
                offset: 0.8,
                color: 0xc9571b
            }
        ]
    });

    // Text style for UI elements
    public static readonly style: TextStyle = new TextStyle({
        dropShadow: {
            angle: 1.6,
            color: 0x562200,
            distance: 6
        },
        fontFamily: "MikadoBlack",
        fontSize: 60,
        fontWeight: "bolder",
        stroke: {
            color: 0x562200,
            width: 6,
            join: 'round'
        },
        align: 'center',
        trim: true,
        fill: this.fillGradientStops,
    });
}