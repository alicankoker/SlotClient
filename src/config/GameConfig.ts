import { FillGradient, TextStyle } from "pixi.js";
import { AutoPlayConfig, OrientationConfig, WinAnimationConfig } from "../engine/types/GameTypes";

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

export interface LoaderDurations {
    minDisplayTime: number;
    transitionTo100: number;
    holdAfter100: number;
    fadeOut: number;
}

export class GameConfig {
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
            width: 1100,
            height: 650
        },
        portrait: {
            width: 850,
            height: 1920
        }
    }

    // Reference symbol size at base resolution
    public static readonly REFERENCE_SYMBOL: SymbolConfig = {
        width: 150,
        height: 150,
        scale: 0.8
    };

    // Reference spacing at base resolution
    public static readonly REFERENCE_SPACING = {
        horizontal: 2,  // 10 pixels horizontal spacing at reference resolution
        vertical: 0      // 5 pixels vertical spacing at reference resolution
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
        minDisplayTime: 600,
        transitionTo100: 500,
        holdAfter100: 150,
        fadeOut: 50
    };

    // Win animation configuration
    public static readonly WIN_ANIMATION: WinAnimationConfig = {
        winTextVisibility: true,
        winLoop: true,
        delayBeforeLoop: 2000,
        delayBetweenLoops: 1000,
        winlines: true
    };

    // Auto play configuration
    public static readonly AUTO_PLAY: AutoPlayConfig = {
        enabled: true,
        count: 5,
        delay: 1000,
        stopOnWin: false,
        stopOnFeature: false,
        skipAnimations: true
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
                offset: 0,
                color: 0xffffff
            },
            {
                offset: 0.7,
                color: 0xffffff
            },
            {
                offset: 1,
                color: 0xa2bdfb
            }
        ]
    });

    // Text style for UI elements
    public static readonly style: TextStyle = new TextStyle({
        dropShadow: {
            angle: 1.5,
            color: 0x142c54,
            distance: 4.5
        },
        fill: this.fillGradientStops,
        fontFamily: "Nunito Black",
        fontSize: 42,
        fontWeight: "bolder",
        stroke: {
            color: 0x142c54,
            width: 6,
            join: 'round'
        },
        align: 'center'
    });
}