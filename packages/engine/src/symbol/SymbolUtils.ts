import { Assets } from "pixi.js";
import { ConfigProvider, IAssetsConfig } from "@slotclient/config";
import { debug } from "../utils/debug";

export class SymbolUtils {
  private static getAssetsConfig(): IAssetsConfig {
    // Access the ConfigProvider singleton to get the assets config
    return ConfigProvider.getInstance().getAssetsConfig();
  }
  // Get texture for a symbol ID (static utility)
  public static getTextureForSymbol(symbolId: number): any {
    const spritesheet = Assets.cache.get("icons");

    if (!spritesheet) {
      debug.error("Spritesheet not found in cache!");
      throw new Error("Spritesheet not available");
    }

    const symbolAssetName = this.getAssetsConfig().getSymbolAsset(symbolId);
    const texture = spritesheet.textures[symbolAssetName];

    if (!texture) {
      debug.error("Texture not found for symbol:", symbolAssetName, "with ID:", symbolId);
      // Fallback to first symbol
      const fallbackName = this.getAssetsConfig().getSymbolAsset(0);
      return spritesheet.textures[fallbackName];
    }

    return texture;
  }

  public static getBlurredTextureForSymbol(symbolId: number): any {
    const spritesheet = Assets.cache.get("icons");

    if (!spritesheet) {
      debug.error("Spritesheet not found in cache!");
      throw new Error("Spritesheet not available");
    }

    const symbolAssetName = this.getAssetsConfig().getBlurredSymbolAsset(symbolId);
    const texture = spritesheet.textures[symbolAssetName];

    if (!texture) {
      debug.error("Texture not found for symbol:", symbolAssetName, "with ID:", symbolId);
      // Fallback to first symbol
      const fallbackName = this.getAssetsConfig().getBlurredSymbolAsset(0);
      return spritesheet.textures[fallbackName];
    }

    return texture;
  }
}
