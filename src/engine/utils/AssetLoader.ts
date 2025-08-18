import { Assets, Texture } from "pixi.js";
import { BundleAssets, IAssetLoader, BundleFile } from "../types/IAssetLoader";
import { SCREEN_SIGNALS, signals } from '../controllers/SignalManager';
import { gsap } from "gsap";
import { debug } from "./debug";

export class AssetLoader implements IAssetLoader {
    private static instance: AssetLoader;
    private smooth = { percent: 0 }; // GSAP tween state

    constructor() {
    }

    public static getInstance(): AssetLoader {
        if (!AssetLoader.instance) {
            AssetLoader.instance = new AssetLoader();
        }
        return AssetLoader.instance;
    }

    private assetsCount(assets: BundleAssets): number {
        return Array.isArray(assets) ? assets.length : Object.keys(assets ?? {}).length;
    }

    private emitSmooth(percent: number, label: string) {
        const target = Math.max(this.smooth.percent, Math.min(percent, 100));
        gsap.to(this.smooth, {
            percent: target,
            duration: 0.35,
            ease: "power2.out",
            onUpdate: () => {
                signals.emit(SCREEN_SIGNALS.ASSETS_LOADED, { label, percent: this.smooth.percent });
                debug.log("AssetLoader", `Loading ${label}: ${this.smooth.percent.toFixed(2)}%`);
            },
        });
    }

    public async loadBundles(manifest: BundleFile): Promise<void> {
        await Assets.init({ manifest });

        const bundles = manifest.bundles ?? [];
        if (!bundles.length) {
            debug.warn("AssetLoader", "No bundles in manifest");
            this.emitSmooth(100, "completed");
            return;
        }

        // it can be useful to set weights manually for more realistic loading progress
        const weights = bundles.map(bundle => bundle.weight ?? this.assetsCount(bundle.assets));
        const totalWeight = weights.reduce((a, b) => a + b, 0) || 1;

        let weightBefore = 0;

        for (let bIndex = 0; bIndex < bundles.length; bIndex++) {
            const bundle = bundles[bIndex];
            const weight = weights[bIndex];

            // we can show loading progress for individual assets if needed
            // if (Array.isArray(bundle.assets)) {
            //     for (let aIndex = 0; aIndex < bundle.assets.length; aIndex++) {
            //         const asset = bundle.assets[aIndex];

            //         await Assets.load({ src: asset.src, alias: asset.alias }, (progress: number) => {
            //             const overall01 = (weightBefore + progress * weight) / totalWeight;
            //             const isLast = bIndex === bundles.length - 1;
            //             const capped01 = isLast ? overall01 : Math.min(overall01, 0.995);
            //             this.emitSmooth(capped01 * 100, asset.alias);
            //         });
            //     }
            // } else {
            // or we can load the whole bundle at once
            await Assets.loadBundle(bundle.name, (progress: number) => {
                const overall01 = (weightBefore + progress * weight) / totalWeight;
                const isLast = bIndex === bundles.length - 1;
                const capped01 = isLast ? overall01 : Math.min(overall01, 0.995);
                this.emitSmooth(capped01 * 100, bundle.name);
            });
            // }

            weightBefore += weight;
        }

        this.emitSmooth(100, "completed");

        debug.log("AssetLoader", "bundles loaded");
    }

    public getAsset(key: string): Texture | undefined {
        const asset = Assets.get(key) as Texture | undefined;
        if (!asset) {
            debug.error("AssetLoader", `Asset ${key} not found!`);
        }
        return asset;
    }

    public removeAsset(key: string): void {
        Assets.unload(key);
    }
}