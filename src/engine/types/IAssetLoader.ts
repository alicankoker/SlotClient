import { Texture } from "pixi.js";

export type Channel = "sfx" | "music";

export type AudioBundle = Array<{
  alias: string;
  src: string | string[];
  channel: Channel;
}>;

export type AssetBundle = Array<{
  alias: string | string[];
  src: string;
}>;

export type Bundle = {
  name: string;
  // optional weight for the bundle, used to calculate loading progress
  weight?: number;
  assets: AssetBundle | AudioBundle;
};

export type BundleFile = {
  bundles: Bundle[];
};

export interface IAssetLoader {
  loadBundles(bundles: BundleFile): Promise<void>;
  getAsset(key: string): Texture | undefined;
  removeAsset(key: string): void;
}

export interface LoaderDurations {
  minDisplayTime: number; // Minimum display time for loader
  transitionTo100: number; // Time to transition from 0% to 100%
  holdAfter100: number; // Time to hold at 100%
  fadeOut: number; // Time to fade out
}

// Spine data interface
export interface SpineData {
  atlasData: any; // Atlas file data
  skeletonData: any; // Skeleton file data
}

// Spine asset data interface
export interface SpineAssetData {
  atlas: string; // Atlas file path
  skeleton: string; // Skeleton file path
}

export type SpineAsset = "symbol" | "background" | "elements" | "wins" | "chain" | "transition" | "lines";
