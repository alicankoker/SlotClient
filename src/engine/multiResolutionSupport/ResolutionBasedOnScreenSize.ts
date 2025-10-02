import AssetSizeManagerConfig from "./AssetSizeManagerConfig";
import { AssetSize } from "./AssetSize";

export class AssetTierBasedOnResolution {
  private assetSizeManagerConfig: AssetSizeManagerConfig;

  get minimumAssetSize(): AssetSize {
    return this.assetSizeManagerConfig.assetSizes[0];
  }
  constructor() {
    this.assetSizeManagerConfig = new AssetSizeManagerConfig();
  }

  getOptimalAssetSize(maxTextureSizeSupported: number): AssetSize {
    let result = new AssetSize("DEFAULT_ASSET_SIZE", 1, 2048);

    const screenWidth =
      Math.max(screen.width, document.documentElement.clientWidth) *
      devicePixelRatio;
    const screenHeight =
      Math.max(screen.height, document.documentElement.clientHeight) *
      devicePixelRatio;

    const smallerScreenDimension = Math.min(screenWidth, screenHeight);
    let smallestSizeDifferenceSoFar = Number.MAX_VALUE;

    for (const assetSize of this.assetSizeManagerConfig.assetSizes) {
      const assetSizeInPixels = assetSize.sizeRatio * 720;
      const sizeDifferenceFromScreen = Math.abs(
        smallerScreenDimension - assetSizeInPixels
      );
      if (
        sizeDifferenceFromScreen < smallestSizeDifferenceSoFar &&
        assetSize.maxTextureSize <= maxTextureSizeSupported
      ) {
        smallestSizeDifferenceSoFar = sizeDifferenceFromScreen;
        result = assetSize;
      }
    }

    return result;
  }
}
