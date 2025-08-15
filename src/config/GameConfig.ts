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

    // Reference symbol size at base resolution
    public static readonly REFERENCE_SYMBOL: SymbolConfig = {
        width: 145,
        height: 145,
        scale: 2.0
    };

    public static readonly REFERENCE_SYMBOL_TEXTURE_SIZE = {
        width: 450,
        height: 450,
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

    public static readonly LOADER_DEFAULT_TIMINGS: LoaderDurations = {
        minDisplayTime: 600,
        transitionTo100: 500,
        holdAfter100: 150,
        fadeOut: 50
    };

    // Calculate scale factors based on current resolution
    public static getScaleFactors(currentWidth: number, currentHeight: number) {
        const scaleX = currentWidth / this.REFERENCE_RESOLUTION.width;
        const scaleY = currentHeight / this.REFERENCE_RESOLUTION.height;

        // Use uniform scaling (smaller of the two scales to maintain aspect ratio and prevent distortion)
        const uniformScale = Math.min(scaleX, scaleY);

        return {
            scaleX,
            scaleY,
            uniformScale
        };
    }

    // Get scaled symbol size for current resolution
    public static getScaledSymbolSize(currentWidth: number, currentHeight: number): SymbolConfig {
        const { uniformScale } = this.getScaleFactors(currentWidth, currentHeight);

        return {
            width: Math.round(this.REFERENCE_SYMBOL.width * uniformScale),
            height: Math.round(this.REFERENCE_SYMBOL.height * uniformScale),
            scale: uniformScale
        };
    }

    public static getReferenceSymbolScale(currentWidth: number, currentHeight: number): number[] {
        const { uniformScale } = this.getScaleFactors(currentWidth, currentHeight);
        const scaleX = this.REFERENCE_SYMBOL.width / this.REFERENCE_SYMBOL_TEXTURE_SIZE.width * uniformScale;
        const scaleY = this.REFERENCE_SYMBOL.height / this.REFERENCE_SYMBOL_TEXTURE_SIZE.height * uniformScale;
        return [scaleX, scaleY];
    }

    // Get scaled UI config for current resolution
    public static getScaledUI(currentWidth: number, currentHeight: number): UIConfig {
        const { uniformScale } = this.getScaleFactors(currentWidth, currentHeight);

        return {
            fontSize: {
                title: Math.round(this.REFERENCE_UI.fontSize.title * uniformScale),
                normal: Math.round(this.REFERENCE_UI.fontSize.normal * uniformScale),
                small: Math.round(this.REFERENCE_UI.fontSize.small * uniformScale)
            },
            spacing: {
                padding: Math.round(this.REFERENCE_UI.spacing.padding * uniformScale),
                margin: Math.round(this.REFERENCE_UI.spacing.margin * uniformScale)
            }
        };
    }

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
} 