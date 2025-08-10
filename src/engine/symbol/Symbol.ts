import { Sprite, Assets } from 'pixi.js';
import { ResponsiveManager, createResponsiveConfig } from '../controllers/ResponsiveSystem';
import { AssetsConfig } from '../../config/AssetsConfig';
import { GameConfig } from '../../config/GameConfig';
import { SymbolConfig as SymbolConfigClass } from '../../config/SymbolConfig';
import { AnimationConfig } from '../../config/AnimationConfig';

export interface SymbolConfig {
    symbolId: number;           // Symbol index (0-9) - provided by server/game logic
    position: {
        x: number;              // Relative X position (0-1)
        y: number;              // Relative Y position (0-1)
    };
    scale?: number;             // Optional override scale
    useContainerPositioning?: boolean; // If true, position relative to container instead of screen
}

export class Symbol extends Sprite {
    private responsiveManager: ResponsiveManager;
    private _symbolId: number;
    private config: SymbolConfig;

    constructor(responsiveManager: ResponsiveManager, config: SymbolConfig) {
        console.log(`Symbol: Creating symbol with ID ${config.symbolId}, position:`, config.position);
        
        // Get the texture for this symbol
        const texture = Symbol.getTextureForSymbol(config.symbolId);
        super(texture);
        
        console.log(`Symbol: Created sprite with texture:`, !!texture, 'size:', texture?.width, 'x', texture?.height);

        this.responsiveManager = responsiveManager;
        this._symbolId = config.symbolId;
        this.config = config;

        this.initializeSymbol();
        
        console.log(`Symbol: Initialized symbol at:`, this.x, this.y, 'scale:', this.scale.x, 'visible:', this.visible);
    }

    private initializeSymbol(): void {
        // Calculate symbol scaling
        const spriteToReferenceScale = SymbolConfigClass.getSpriteToReferenceScale();
        const finalScale = this.config.scale || spriteToReferenceScale;

        if (this.config.useContainerPositioning) {
            // Position directly in container coordinates - NO responsive system
            this.anchor.set(0.5, 0.5);
            this.x = this.config.position.x;
            this.y = this.config.position.y;
            this.scale.set(finalScale);
        } else {
            // Use responsive system for positioning and scaling
            this.responsiveManager.addResponsiveObject(this, createResponsiveConfig({
                x: this.config.position.x,
                y: this.config.position.y,
                anchorX: 0.5,
                anchorY: 0.5,
                scaleX: finalScale
            }));
        }
    }

    // Static method to get texture for a symbol ID
    public static getTextureForSymbol(symbolId: number): any {
        console.log(`Symbol.getTextureForSymbol: Requesting texture for symbolId ${symbolId}`);
        
        const spritesheet = Assets.cache.get('/assets/symbols/symbols.json');
        
        if (!spritesheet) {
            console.error('Symbol.getTextureForSymbol: Spritesheet not found in cache!');
            console.log('Cache lookup failed for: /assets/symbols/symbols.json');
            throw new Error('Spritesheet not available');
        }

        console.log('Symbol.getTextureForSymbol: Spritesheet found, checking textures...');
        console.log('Available textures:', Object.keys(spritesheet.textures || {}));

        const symbolAssetName = AssetsConfig.getSymbolAssetName(symbolId);
        console.log(`Symbol.getTextureForSymbol: Looking for asset name "${symbolAssetName}"`);
        
        const texture = spritesheet.textures[symbolAssetName];
        
        if (!texture) {
            console.error('Texture not found for symbol:', symbolAssetName, 'with ID:', symbolId);
            console.log('Available texture names:', Object.keys(spritesheet.textures));
            // Fallback to first available texture
            const firstTextureName = Object.keys(spritesheet.textures)[0];
            if (firstTextureName) {
                console.log('Using fallback texture:', firstTextureName);
                return spritesheet.textures[firstTextureName];
            } else {
                throw new Error('No textures available in spritesheet');
            }
        }

        console.log(`Symbol.getTextureForSymbol: Successfully found texture for ${symbolAssetName}`);
        return texture;
    }

    // Instance methods
    public getSymbolId(): number {
        return this._symbolId;
    }

    // Getter for symbolId (for backward compatibility)
    public get symbolId(): number {
        return this._symbolId;
    }

    // Getter for useContainerPositioning
    public get useContainerPositioning(): boolean {
        return this.config.useContainerPositioning || false;
    }

    public setSymbolId(symbolId: number): void {
        this._symbolId = symbolId;
        this.texture = Symbol.getTextureForSymbol(symbolId);
    }

    public setTexture(symbolAssetName: string): void {
        const spritesheet = Assets.cache.get('/assets/symbols/symbols.json');
        if (spritesheet && spritesheet.textures[symbolAssetName]) {
            this.texture = spritesheet.textures[symbolAssetName];
            // Update symbolId based on asset name if possible
            const symbolId = AssetsConfig.getSymbolIndexFromAssetName(symbolAssetName);
            if (symbolId !== -1) {
                this._symbolId = symbolId;
            }
        }
    }

    public updatePosition(position: { x: number, y: number }): void {
        this.config.position = position;
        
        if (this.config.useContainerPositioning) {
            // Update position directly - simple pixel coordinates
            this.x = position.x;
            this.y = position.y;
        } else {
            // Use responsive system
            this.responsiveManager.updateResponsiveConfig(this, {
                x: position.x,
                y: position.y
            });
        }
    }

    public updateScale(scale: number): void {
        this.config.scale = scale;
        this.responsiveManager.updateResponsiveConfig(this, {
            scaleX: scale
        });
    }



    // Animation methods
    public async animateToPosition(targetPosition: { x: number, y: number }, duration: number = AnimationConfig.SYMBOL.positionDuration): Promise<void> {
        return new Promise((resolve) => {
            const startPos = { ...this.config.position };
            const startTime = Date.now();

            const animate = () => {
                const elapsed = Date.now() - startTime;
                const progress = Math.min(elapsed / duration, 1);
                
                // Easing function (ease-out)
                const easedProgress = 1 - Math.pow(1 - progress, 3);
                
                const currentPos = {
                    x: startPos.x + (targetPosition.x - startPos.x) * easedProgress,
                    y: startPos.y + (targetPosition.y - startPos.y) * easedProgress
                };

                this.updatePosition(currentPos);

                if (progress < 1) {
                    requestAnimationFrame(animate);
                } else {
                    resolve();
                }
            };

            animate();
        });
    }

    public async animateScale(targetScale: number, duration: number = AnimationConfig.SYMBOL.scaleDuration): Promise<void> {
        return new Promise((resolve) => {
            const startScale = this.config.scale || 1;
            const startTime = Date.now();

            const animate = () => {
                const elapsed = Date.now() - startTime;
                const progress = Math.min(elapsed / duration, 1);
                
                // Easing function (ease-out)
                const easedProgress = 1 - Math.pow(1 - progress, 3);
                
                const currentScale = startScale + (targetScale - startScale) * easedProgress;
                this.updateScale(currentScale);

                if (progress < 1) {
                    requestAnimationFrame(animate);
                } else {
                    resolve();
                }
            };

            animate();
        });
    }

    // Cleanup
    public destroy(): void {
        // Only remove from responsive system if not using container positioning
        if (!this.config.useContainerPositioning) {
            this.responsiveManager.removeResponsiveObject(this);
        }
        
        // Call parent destroy
        super.destroy();
    }

    // Utility methods for game logic
    public static calculateVerticalSpacing(screenWidth: number, screenHeight: number): number {
        // Calculate vertical spacing between symbol centers
        const referenceSymbolHeight = GameConfig.REFERENCE_SYMBOL.height;
        const referenceSpacingY = GameConfig.REFERENCE_SPACING.vertical; // Should be 0 for touching symbols
        
        const scaledSymbol = GameConfig.getScaledSymbolSize(screenWidth, screenHeight);
        const actualCenterToCenter = (referenceSymbolHeight + referenceSpacingY) * scaledSymbol.scale;
        
        return actualCenterToCenter / screenHeight;
    }

    public static getDefaultScale(): number {
        return SymbolConfigClass.getSpriteToReferenceScale();
    }
} 