import { Assets } from 'pixi.js';
import { GameConfig } from '../../config/GameConfig';
import { AssetsConfig } from '../../config/AssetsConfig';
import { SymbolConfig } from '../../config/SymbolConfig';
import { debug } from '../utils/debug';

export class SymbolUtils {

    // Calculate vertical spacing between symbol centers for current screen size
    public static calculateVerticalSpacing(screenWidth: number, screenHeight: number): number {
        const referenceSymbolHeight = GameConfig.REFERENCE_SYMBOL.height;
        const referenceSpacingY = GameConfig.REFERENCE_SPACING.vertical; // Should be 0 for touching symbols

        const scaledSymbol = GameConfig.getScaledSymbolSize(screenWidth, screenHeight);
        const actualCenterToCenter = (referenceSymbolHeight + referenceSpacingY) * scaledSymbol.scale;

        return actualCenterToCenter / screenHeight;
    }

    // Get texture for a symbol ID (static utility)
    public static getTextureForSymbol(symbolId: number): any {
        const spritesheet = Assets.cache.get('/assets/symbols/symbols.json');

        if (!spritesheet) {
            debug.error('Spritesheet not found in cache!');
            throw new Error('Spritesheet not available');
        }

        const symbolAssetName = AssetsConfig.getSymbolAssetName(symbolId);
        const texture = spritesheet.textures[symbolAssetName];

        if (!texture) {
            debug.error('Texture not found for symbol:', symbolAssetName, 'with ID:', symbolId);
            // Fallback to first symbol
            const fallbackName = AssetsConfig.getSymbolAssetName(0);
            return spritesheet.textures[fallbackName];
        }

        return texture;
    }

    public static getBlurredTextureForSymbol(symbolId: number): any {
        const spritesheet = Assets.cache.get('/assets/symbols/symbols.json');

        if (!spritesheet) {
            debug.error('Spritesheet not found in cache!');
            throw new Error('Spritesheet not available');
        }

        const symbolAssetName = AssetsConfig.getBlurredSymbolAssetName(symbolId);
        const texture = spritesheet.textures[symbolAssetName];

        if (!texture) {
            debug.error('Texture not found for symbol:', symbolAssetName, 'with ID:', symbolId);
            // Fallback to first symbol
            const fallbackName = AssetsConfig.getBlurredSymbolAssetName(0);
            return spritesheet.textures[fallbackName];
        }

        return texture;
    }

    // Get default scale for symbols
    public static getDefaultScale(screenWidth?: number, screenHeight?: number): number {
        const spriteToReferenceScale = SymbolConfig.getSpriteToReferenceScale();

        if (screenWidth && screenHeight) {
            // Apply responsive scaling
            const { uniformScale } = GameConfig.getScaleFactors(screenWidth, screenHeight);
            return spriteToReferenceScale * uniformScale;
        }

        return spriteToReferenceScale;
    }

    // Calculate horizontal spacing between symbol centers
    public static calculateHorizontalSpacing(screenWidth: number, screenHeight: number): number {
        const referenceSymbolWidth = GameConfig.REFERENCE_SYMBOL.width;
        const referenceSpacingX = GameConfig.REFERENCE_SPACING.horizontal;

        const scaledSymbol = GameConfig.getScaledSymbolSize(screenWidth, screenHeight);
        const actualCenterToCenter = (referenceSymbolWidth + referenceSpacingX) * scaledSymbol.scale;

        return actualCenterToCenter / screenWidth;
    }
} 