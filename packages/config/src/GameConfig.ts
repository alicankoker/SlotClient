import { Point } from "pixi.js";
import { 
  SpinContainerConfig,
  LoaderDurations,
  AutoPlayConfig,
  OrientationConfig,
  ForceStopConfig,
  WinEventConfig,
  WinAnimationConfig,
  IFreeSpin
} from "@slotclient/types";

// ==================== INTERFACES ====================

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

export interface SpacingConfig {
    horizontal: number;
    vertical: number;
}

export interface GameRulesConfig {
    reelCount: number;
    rowCount: number;
    minBet: number;
    maxBet: number;
    defaultBet: number;
    initialBalance: number;
}

export interface GridLayoutConfig {
    columns: number;
    visibleRows: number;
    rowsAboveMask: number;
    rowsBelowMask: number;
    totalRows(): number;
}

export interface SafeAreaConfig {
    landscape: {
        width: number;
        height: number;
    };
    portrait: {
        width: number;
        height: number;
    };
}

export interface SpinModesConfig {
    NORMAL: string;
    FAST: string;
    TURBO: string;
}

export interface BackendConfig {
    BACKEND_URL: string;
    USER_ID?: string;
}

export interface GridConfig {
    reelCount: number;
    rowCount: number;
    totalSymbols: number;
    bufferRows: {
        above: number;
        below: number;
    };
}

export interface IPaytableEntry {
    symbolId: number;
    winAmounts: number[];
}

export interface SpinConfig {
    maxAutoPlaySpins: number;
    minBetAmount: number;
    maxBetAmount: number;
    defaultBetAmount: number;
}

export interface CascadeConfig {
    maxCascadeSteps: number;
    dropAnimationSteps: number;
    removeAnimationSteps: number;
}

export interface CoordinatesConfig {
    [key: number]: { x: number; y: number };
}

export interface WinningLinesConfig {
    [key: number]: number[];
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

/**
 * Interface for game configuration
 * Tüm game config'ler bu interface'i implement etmeli
 */
export interface IGameConfig {
    // Required properties
    readonly REFERENCE_SPRITE_SYMBOL: SymbolConfig;
    readonly REFERENCE_SPINE_SYMBOL: SymbolConfig;
    readonly REFERENCE_SPACING: SpacingConfig;
    readonly GAME_RULES: GameRulesConfig;
    readonly GRID_LAYOUT: GridLayoutConfig;
    readonly REFERENCE_RESOLUTION: ResolutionConfig;
    readonly SAFE_AREA: SafeAreaConfig;
    readonly BACKEND: BackendConfig;
    readonly GRID: GridConfig;
    readonly SPIN: SpinConfig;
    readonly PAYTABLE: IPaytableEntry[];
    readonly LINES: WinningLinesConfig;
    readonly COORDINATES: CoordinatesConfig;
    readonly WINNING_LINES: WinningLinesConfig;
    readonly LINE_NUMBER_POSITION: CoordinatesConfig;
    readonly REFERENCE_NUMBER_POSITION: { x: number; y: number };

    // Optional properties with defaults
    readonly LOADER_DEFAULT_TIMINGS: LoaderDurations;
    readonly FREE_SPIN: IFreeSpin;
    readonly WIN_ANIMATION: WinAnimationConfig;
    readonly AUTO_PLAY: AutoPlayConfig;
    readonly FORCE_STOP: ForceStopConfig;
    readonly WIN_EVENT: WinEventConfig;
    readonly SPIN_MODES: SpinModesConfig;
    readonly ORIENTATION: OrientationConfig;
    readonly CASCADE: CascadeConfig;
    readonly REFERENCE_UI: UIConfig;

    // Methods
    getLine(line: number): Point[];
    getTotalGridSize(): number;
    getTotalBufferRows(): number;
    getTotalRowsPerReel(): number;
    getGridCenterRow(): number;
    isValidSymbolId(symbolId: number): boolean;
    isValidReelIndex(reelIndex: number): boolean;
    isValidRowIndex(rowIndex: number): boolean;
    getResolutionCategory(width: number, height: number): string;
    clampBet(bet: number): number;
    clampBalance(balance: number): number;
    getBackendUrl(): string;
    getUserId(): string | undefined;
    isDevMode(): boolean;
    isProdMode(): boolean;
    getSessionFromUrl(): string | null;
    getEnvironmentMode(): string;
    createSpinContainerConfig(): SpinContainerConfig;
    getPaytableEntry(symbolId: number): IPaytableEntry | undefined;
    getWinAmount(symbolId: number, count: number): number;
}

// ==================== ABSTRACT BASE CLASS ====================

/**
 * Abstract base game configuration
 * Her oyun kendi GameConfig'ini bu class'tan extend eder
 */
export abstract class BaseGameConfig implements IGameConfig {
    // ==================== ABSTRACT PROPERTIES ====================
    // Oyunlar bu property'leri define etmek ZORUNDA

    public abstract readonly REFERENCE_SPRITE_SYMBOL: SymbolConfig;
    public abstract readonly REFERENCE_SPINE_SYMBOL: SymbolConfig;
    public abstract readonly REFERENCE_SPACING: SpacingConfig;
    public abstract readonly GAME_RULES: GameRulesConfig;
    public abstract readonly GRID_LAYOUT: GridLayoutConfig;
    public abstract readonly REFERENCE_RESOLUTION: ResolutionConfig;
    public abstract readonly SAFE_AREA: SafeAreaConfig;
    public abstract readonly BACKEND: BackendConfig;
    
    // Game Rules - Oyunlar define etmek zorunda
    public abstract readonly GRID: GridConfig;
    public abstract readonly SPIN: SpinConfig;
    public abstract readonly PAYTABLE: IPaytableEntry[];
    public abstract readonly LINES: WinningLinesConfig;
    public abstract readonly COORDINATES: CoordinatesConfig;
    public abstract readonly WINNING_LINES: WinningLinesConfig;
    public abstract readonly LINE_NUMBER_POSITION: CoordinatesConfig;
    public abstract readonly REFERENCE_NUMBER_POSITION: { x: number; y: number };

    // ==================== OPTIONAL PROPERTIES ====================
    // Oyunlar override edebilir

    public readonly LOADER_DEFAULT_TIMINGS: LoaderDurations = {
        minDisplayTime: 1000,
        transitionTo100: 600,
        holdAfter100: 150,
        fadeOut: 50
    };

    public readonly FREE_SPIN: IFreeSpin = {
        isActive: false,
        skipAnimations: false,
        remainingSpins: 0
    };

    public readonly WIN_ANIMATION: WinAnimationConfig = {
        enabled: true,
        winTextVisibility: true,
        winLoop: true,
        delayBeforeLoop: 2000,
        delayBetweenLoops: 1000,
        winlineVisibility: true
    };

    public readonly AUTO_PLAY: AutoPlayConfig = {
        enabled: true,
        count: 5,
        delay: 1000,
        stopOnWin: false,
        stopOnFeature: false,
        skipAnimations: false
    };

    public readonly FORCE_STOP: ForceStopConfig = {
        enabled: true
    };

    public readonly WIN_EVENT: WinEventConfig = {
        enabled: true,
        duration: 3,
        canSkip: true
    };

    public readonly SPIN_MODES: SpinModesConfig = {
        NORMAL: 'normal',
        FAST: 'fast',
        TURBO: 'turbo'
    };

    public readonly ORIENTATION: OrientationConfig = {
        landscape: "landscape",
        portrait: "portrait"
    };

    // Cascade configuration - optional, oyunlar override edebilir
    public readonly CASCADE: CascadeConfig = {
        maxCascadeSteps: 10,
        dropAnimationSteps: 5,
        removeAnimationSteps: 3
    };

    // Reference UI sizes at base resolution
    public readonly REFERENCE_UI: UIConfig = {
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

    // ==================== COMMON METHODS ====================

    /**
     * Get symbol width + spacing
     */
    protected getSymbolWidth(): number {
        return this.REFERENCE_SPRITE_SYMBOL.width + this.REFERENCE_SPACING.horizontal;
    }

    /**
     * Get symbol height + spacing
     */
    protected getSymbolHeight(): number {
        return this.REFERENCE_SPRITE_SYMBOL.height + this.REFERENCE_SPACING.vertical;
    }

    /**
     * Get the coordinates of a winning line
     */
    public getLine(line: number): Point[] {
        const elements = this.LINES[line];
        const points: Point[] = [];

        if (elements) {
            for (let index = 0; index < elements.length; index++) {
                const element = elements[index];
                const point = this.COORDINATES[element];

                if (point) {
                    points.push(new Point(point.x, point.y));
                }
            }
        }

        return points;
    }

    /**
     * Get total grid size
     */
    public getTotalGridSize(): number {
        return this.GRID.reelCount * this.GRID.rowCount;
    }

    /**
     * Get total buffer rows
     */
    public getTotalBufferRows(): number {
        return this.GRID.bufferRows.above + this.GRID.bufferRows.below;
    }

    /**
     * Get total rows per reel (visible + buffer)
     */
    public getTotalRowsPerReel(): number {
        return this.GRID.rowCount + this.getTotalBufferRows();
    }

    /**
     * Get grid center row
     */
    public getGridCenterRow(): number {
        return Math.floor(this.GRID.rowCount / 2);
    }

    /**
     * Validate symbol ID
     */
    public isValidSymbolId(symbolId: number): boolean {
        return symbolId >= 0 && symbolId < this.GRID.totalSymbols;
    }

    /**
     * Validate reel index
     */
    public isValidReelIndex(reelIndex: number): boolean {
        return reelIndex >= 0 && reelIndex < this.GRID.reelCount;
    }

    /**
     * Validate row index
     */
    public isValidRowIndex(rowIndex: number): boolean {
        return rowIndex >= 0 && rowIndex < this.GRID.rowCount;
    }

    /**
     * Get resolution category
     */
    public getResolutionCategory(width: number, height: number): string {
        const pixels = width * height;

        if (pixels >= 3840 * 2160) return '4K+';
        if (pixels >= 2560 * 1440) return '1440p';
        if (pixels >= 1920 * 1080) return '1080p';
        if (pixels >= 1280 * 720) return '720p';
        return 'Mobile/Small';
    }

    /**
     * Clamp bet amount
     */
    public clampBet(bet: number): number {
        return Math.max(this.GAME_RULES.minBet, Math.min(this.GAME_RULES.maxBet, bet));
    }

    /**
     * Clamp balance
     */
    public clampBalance(balance: number): number {
        return Math.max(0, balance);
    }

    /**
     * Get backend URL
     */
    public getBackendUrl(): string {
        return this.BACKEND.BACKEND_URL;
    }

    /**
     * Get user ID
     */
    public getUserId(): string | undefined {
        return this.BACKEND.USER_ID;
    }

    /**
     * Check if dev mode
     */
    public isDevMode(): boolean {
        return import.meta.env.DEV;
    }

    /**
     * Check if prod mode
     */
    public isProdMode(): boolean {
        return import.meta.env.PROD;
    }

    /**
     * Get session from URL
     */
    public getSessionFromUrl(): string | null {
        if (typeof window === 'undefined') return null;
        return new URLSearchParams(window.location.search).get('session');
    }

    /**
     * Get environment mode
     */
    public getEnvironmentMode(): string {
        return import.meta.env.MODE;
    }

    /**
     * Create spin container config
     * Oyunlar override edebilir
     */
    public createSpinContainerConfig(): SpinContainerConfig {
        return {
            reelIndex: 0,
            numberOfReels: this.GRID_LAYOUT.columns,
            symbolHeight: this.REFERENCE_SPRITE_SYMBOL.height,
            symbolsVisible: this.GRID_LAYOUT.visibleRows,
            rowsAboveMask: this.GRID_LAYOUT.rowsAboveMask,
            rowsBelowMask: this.GRID_LAYOUT.rowsBelowMask,
            spinSpeed: 10,
            spinDuration: 2000
        };
    }

    /**
     * Get paytable entry for symbol
     */
    public getPaytableEntry(symbolId: number): IPaytableEntry | undefined {
        return this.PAYTABLE.find(entry => entry.symbolId === symbolId);
    }

    /**
     * Get win amount for symbol and count
     */
    public getWinAmount(symbolId: number, count: number): number {
        const entry = this.getPaytableEntry(symbolId);
        if (!entry || count < 3) return 0;
        return entry.winAmounts[count - 3] || 0;
    }
}