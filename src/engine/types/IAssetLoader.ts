import { Texture } from "pixi.js";

export type BundleAssets =
    | Record<string, string | { alias: string; src: string; }>
    | Array<{ alias: string; src: string; }>;

export type Bundle = {
    name: string;
    // optional weight for the bundle, used to calculate loading progress
    weight?: number;
    assets: BundleAssets;
};

export type BundleFile = {
    bundles: Bundle[];
};

export interface IAssetLoader {
    loadBundles(bundles: BundleFile): Promise<void>;
    getAsset(key: string): Texture | undefined;
    removeAsset(key: string): void;
}