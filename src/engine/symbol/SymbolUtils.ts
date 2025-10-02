import { Assets } from "pixi.js";
import { AssetsConfig } from "../../config/AssetsConfig";
import { debug } from "../utils/debug";

export class SymbolUtils {
  // Get texture for a symbol ID (static utility)
  public static getTextureForSymbol(symbolId: number): any {
    const spritesheet = Assets.cache.get("/assets/symbols/symbols.json");

    if (!spritesheet) {
      debug.error("Spritesheet not found in cache!");
      throw new Error("Spritesheet not available");
    }

    const symbolAssetName = AssetsConfig.getSymbolAsset(symbolId);
    const texture = spritesheet.textures[symbolAssetName];

    if (!texture) {
      debug.error(
        "Texture not found for symbol:",
        symbolAssetName,
        "with ID:",
        symbolId
      );
      // Fallback to first symbol
      const fallbackName = AssetsConfig.getSymbolAsset(0);
      return spritesheet.textures[fallbackName];
    }

    return texture;
  }

  public static getBlurredTextureForSymbol(symbolId: number): any {
    const spritesheet = Assets.cache.get("/assets/symbols/symbols.json");

    if (!spritesheet) {
      debug.error("Spritesheet not found in cache!");
      throw new Error("Spritesheet not available");
    }

    const symbolAssetName = AssetsConfig.getBlurredSymbolAsset(symbolId);
    const texture = spritesheet.textures[symbolAssetName];

    if (!texture) {
      debug.error(
        "Texture not found for symbol:",
        symbolAssetName,
        "with ID:",
        symbolId
      );
      // Fallback to first symbol
      const fallbackName = AssetsConfig.getBlurredSymbolAsset(0);
      return spritesheet.textures[fallbackName];
    }

    return texture;
  }
}
