import AssetSizeManagerConfig from "./AssetSizeManagerConfig";
import { AssetTierBasedOnResolution } from "./ResolutionBasedOnScreenSize";
import { AssetSize } from "./AssetSize";

export class AssetSizeManager {
  assetTierBasedOnResolution: AssetTierBasedOnResolution;
  private static instance: AssetSizeManager;
  protected _assetSizeRatio: AssetSize;

  constructor() {
    this.assetTierBasedOnResolution = new AssetTierBasedOnResolution();
    this._assetSizeRatio = this.getAssetSize();
  }
  public static getInstance(): AssetSizeManager {
    if (!AssetSizeManager.instance) {
      AssetSizeManager.instance = new AssetSizeManager();
    }
    return AssetSizeManager.instance;
  }

  get assetSize(): AssetSize {
    return this._assetSizeRatio;
  }

  private getAssetSize(): AssetSize {
    if ("gl" in (globalThis as any).__PIXI_APP__.renderer) {
      const webglRenderer: any = (globalThis as any).__PIXI_APP__.renderer;
      const maxTextureSize: number = webglRenderer.gl.getParameter(
        webglRenderer.gl.MAX_TEXTURE_SIZE
      );

      return this.assetTierBasedOnResolution.getOptimalAssetSize(
        maxTextureSize
      );
    }

    return this.assetTierBasedOnResolution.minimumAssetSize;
  }
}
