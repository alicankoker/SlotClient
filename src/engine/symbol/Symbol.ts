import { Sprite, Assets } from "pixi.js";
import { AssetsConfig } from "../../config/AssetsConfig";
import { SymbolConfig as SymbolConfigClass } from "../../config/SymbolConfig";
import { AnimationConfig } from "../../config/AnimationConfig";
import { debug } from "../utils/debug";

export interface SymbolConfig {
  symbolId: number; // Symbol index (0-9) - provided by server/game logic
  position: {
    x: number; // Relative X position (0-1)
    y: number; // Relative Y position (0-1)
  };
  scale?: number; // Optional override scale
}

export class Symbol extends Sprite {
  private _symbolId: number;
  private config: SymbolConfig;

  constructor(config: SymbolConfig) {
    debug.log(`Symbol: Creating symbol with ID ${config.symbolId}, position:`, config.position);

    // Get the texture for this symbol
    const texture = Symbol.getTextureForSymbol(config.symbolId);
    super(texture);

    this.label = `Symbol_${config.symbolId}`;

    this.anchor.set(0.5, 0.5);
    this.scale.set(config.scale || 1);
    this.position.set(config.position.x, config.position.y);

    debug.log(`Symbol: Created sprite with texture:`, !!texture, "size:", texture?.width, "x", texture?.height);

    this._symbolId = config.symbolId;
    this.config = config;

    debug.log(`Symbol: Initialized symbol at:`, this.x, this.y, "scale:", this.scale.x, "visible:", this.visible);
  }

  // Static method to get texture for a symbol ID
  public static getTextureForSymbol(symbolId: number): any {
    debug.log(`Symbol.getTextureForSymbol: Requesting texture for symbolId ${symbolId}`);

    const extension = '.png'

    const spritesheet = Assets.cache.get("symbols");

    if (!spritesheet) {
      debug.error("Symbol.getTextureForSymbol: Spritesheet not found in cache!");
      //debug.log("Cache lookup failed for: /assets/symbols/symbols.json");
      throw new Error("Spritesheet not available");
    }

    debug.log("Symbol.getTextureForSymbol: Spritesheet found, checking textures...");
    //debug.log("Available textures:", Object.keys(spritesheet.textures || {}));

    const symbolAssetName = AssetsConfig.getSymbolAsset(symbolId);
    debug.log(`Symbol.getTextureForSymbol: Looking for asset name "${symbolAssetName + extension}"`);

    const texture = spritesheet.textures[symbolAssetName];

    if (!texture) {
      debug.error("Texture not found for symbol:", symbolAssetName, "with ID:", symbolId);
      debug.log("Available texture names:", Object.keys(spritesheet.textures));
      // Fallback to first available texture
      const firstTextureName = Object.keys(spritesheet.textures)[0];
      if (firstTextureName) {
        //debug.log("Using fallback texture:", firstTextureName);
        return spritesheet.textures[firstTextureName];
      } else {
        throw new Error("No textures available in spritesheet");
      }
    }

    debug.log(`Symbol.getTextureForSymbol: Successfully found texture for ${symbolAssetName}`);
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

  // Method to update symbol ID and texture
  public setSymbolId(newSymbolId: number): void {
    //debug.log(`Symbol: Updating symbol ID from ${this._symbolId} to ${newSymbolId}`);
    this._symbolId = newSymbolId;
    this.config.symbolId = newSymbolId;

    // Update texture
    const newTexture = Symbol.getTextureForSymbol(newSymbolId);
    this.texture = newTexture;
    this.label = `Symbol_${newSymbolId}`;
  }

  // Animation methods
  public async animateToPosition(
    targetPosition: { x: number; y: number },
    duration: number = AnimationConfig.SYMBOL.positionDuration
  ): Promise<void> {
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
          y: startPos.y + (targetPosition.y - startPos.y) * easedProgress,
        };

        //this.updatePosition(currentPos);

        if (progress < 1) {
          requestAnimationFrame(animate);
        } else {
          resolve();
        }
      };

      animate();
    });
  }

  public async animateScale(
    targetScale: number,
    duration: number = AnimationConfig.SYMBOL.scaleDuration
  ): Promise<void> {
    return new Promise((resolve) => {
      const startScale = this.config.scale || 1;
      const startTime = Date.now();

      const animate = () => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);

        // Easing function (ease-out)
        const easedProgress = 1 - Math.pow(1 - progress, 3);

        //const currentScale = startScale + (targetScale - startScale) * easedProgress;
        //this.updateScale(currentScale);

        if (progress < 1) {
          requestAnimationFrame(animate);
        } else {
          resolve();
        }
      };

      animate();
    });
  }

  public static getDefaultScale(): number {
    return SymbolConfigClass.getSpriteToReferenceScale();
  }
}
