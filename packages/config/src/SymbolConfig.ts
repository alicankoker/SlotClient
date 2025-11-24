export interface SymbolSpriteConfig {
    width: number;              // Actual sprite width in pixels
    height: number;             // Actual sprite height in pixels
    sourceSize: {
        width: number;          // Original source image size
        height: number;
    };
}

export interface SymbolAnimationConfig {
    dropDuration: number;       // Duration for symbol drop animation (ms)
    scaleDuration: number;      // Duration for scale animation (ms)
    positionDuration: number;   // Duration for position animation (ms)
    easingType: string;         // Easing function type
}

export interface SymbolLayoutConfig {
    gridCenterOffset: number;   // Offset for grid center calculations (0.5 = center)
    visibleSymbolsOffset: number; // How to calculate center row (0.5 = middle)
}

export class SymbolConfig {
    // Actual sprite dimensions from the spritesheet
    public static readonly SPRITE_DIMENSIONS: SymbolSpriteConfig = {
        width: 487,             // Actual sprite width from symbols.json
        height: 549,            // Actual sprite height from symbols.json
        sourceSize: {
            width: 1000,        // Original source image size
            height: 1000
        }
    };

    // Animation timing configuration
    public static readonly ANIMATION: SymbolAnimationConfig = {
        dropDuration: 300,      // Symbol drop animation duration
        scaleDuration: 300,     // Scale animation duration  
        positionDuration: 300,  // Position animation duration
        easingType: 'ease-out'  // Easing function
    };

    // Layout calculation configuration
    public static readonly LAYOUT: SymbolLayoutConfig = {
        gridCenterOffset: 0.5,      // Grid center Y position (0.5 = screen center)
        visibleSymbolsOffset: 0.5   // How to calculate middle visible symbol (0.5 = center)
    };

    // Calculated values (computed from other configs)
    public static getSpriteToReferenceScale(): number {
        // This replaces the hardcoded 487 calculation
        return GameConfig.REFERENCE_SPRITE_SYMBOL.width / this.SPRITE_DIMENSIONS.width;
    }

    public static getGridCenterRow(symbolsVisible: number): number {
        // This replaces Math.floor(symbolsVisible / 2)
        return Math.floor(symbolsVisible * this.LAYOUT.visibleSymbolsOffset);
    }

    public static getGridCenterY(): number {
        return this.LAYOUT.gridCenterOffset;
    }
}

// Import GameConfig to avoid circular dependency
import { GameConfig } from './GameConfig'; 