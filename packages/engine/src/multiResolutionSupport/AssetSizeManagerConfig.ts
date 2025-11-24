import { AssetSize } from "./AssetSize";

export enum AssetScaleTier {
  ONE = "HD",
  TWO = "FullHD",
  THREE = "QuadHD",
  FOUR = "UltraHD",
}
export default class AssetSizeManagerConfig {
  designResolutionToLogicalResolutionRatio = 3 / 2;
  readonly assetSizes: AssetSize[] = [
    new AssetSize(AssetScaleTier.ONE, 1, 2048),
    new AssetSize(AssetScaleTier.TWO, 1.5, 4096),
    new AssetSize(AssetScaleTier.THREE, 2, 4096),
    new AssetSize(AssetScaleTier.FOUR, 3, 8192),
  ];
}
