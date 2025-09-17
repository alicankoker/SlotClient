import { Texture } from "pixi.js";

export type Channel = 'sfx' | 'music';

export type AudioBundle = Array<{ alias: string; src: string | string[]; channel: Channel }>;

export type AssetBundle = Array<{ alias: string | string[]; src: string; }>;

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