import { AtlasAttachmentLoader, SkeletonData, SkeletonJson, Spine } from '@esotericsoftware/spine-pixi-v8';
import { ResponsiveManager, createResponsiveConfig } from '../controllers/ResponsiveSystem';
import { AssetsConfig } from '../../config/AssetsConfig';
import { GameConfig } from '../../config/GameConfig';
import { SymbolConfig as SymbolConfigClass } from '../../config/SymbolConfig';
import { AnimationConfig } from '../../config/AnimationConfig';
import { debug } from '../utils/debug';

export interface SymbolConfig {
    symbolId: number;           // Symbol index (0-9) - provided by server/game logic
    position: {
        x: number;              // Relative X position (0-1)
        y: number;              // Relative Y position (0-1)
    };
    scale?: number;             // Optional override scale
    useContainerPositioning?: boolean; // If true, position relative to container instead of screen
}

export class SpineSymbol extends Spine {
    private responsiveManager: ResponsiveManager;
    private _symbolId: number;
    private config: SymbolConfig;

    constructor(responsiveManager: ResponsiveManager, config: SymbolConfig) {
        debug.log(`Symbol: Creating symbol with ID ${config.symbolId}, position:`, config.position);

        // Get the texture for this symbol
        const { atlasData, skeletonData } = AssetsConfig.getSpineSymbolAssetName();
        const prefix = AssetsConfig.SYMBOL_ASSET_DATA[config.symbolId]?.prefix || 'Symbol1';

        if (!atlasData || !skeletonData) {
            throw new Error(`Texture not found for symbol ID: ${config.symbolId}`);
        }

        const attachmentLoader = new AtlasAttachmentLoader(atlasData as any);
        const json = new SkeletonJson(attachmentLoader);
        const skeleton = json.readSkeletonData(skeletonData);

        super(skeleton);

        this.skeleton.setSlotsToSetupPose();

        this.state.data.defaultMix = 0.5;

        this.state.setAnimation(0, `${prefix}_Landing`, false);

        this.responsiveManager = responsiveManager;
        this._symbolId = config.symbolId;
        this.config = config;

        this.initializeSymbol();

        debug.log(`Symbol: Initialized symbol at:`, this.x, this.y, 'scale:', this.scale.x, 'visible:', this.visible);
    }

    private initializeSymbol(): void {
        // Calculate symbol scaling
        const spriteToReferenceScale = SymbolConfigClass.getSpriteToReferenceScale();
        const finalScale = this.config.scale || spriteToReferenceScale;

        if (this.config.useContainerPositioning) {
            // Position directly in container coordinates - NO responsive system
            this.x = this.config.position.x;
            this.y = this.config.position.y;
            this.scale.set(finalScale * GameConfig.REFERENCE_SYMBOL.scale);
        } else {
            // Use responsive system for positioning and scaling
            this.responsiveManager.addResponsiveObject(this, createResponsiveConfig({
                x: this.config.position.x,
                y: this.config.position.y,
                anchorX: 0.5,
                anchorY: 0.5,
                scaleX: finalScale * GameConfig.REFERENCE_SYMBOL.scale
            }));
        }
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

    public setSymbol(symbolId: number): void {
        this._symbolId = symbolId;
        const prefix = AssetsConfig.SYMBOL_ASSET_DATA[symbolId]?.prefix || 'Symbol1';
        this.state.setAnimation(this.state.tracks.length - 1, `${prefix}_Landing`, false);
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
            scaleX: scale * GameConfig.REFERENCE_SYMBOL.scale
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